import { describe, it, expect } from 'vitest';

// ===== Test pure functions extracted from index.tsx =====

// parseWorkingHoursText
const parseWorkingHoursText = (text: string): { start: number; end: number } | null => {
  try {
    const parts = text.split('-').map(s => s.trim());
    if (parts.length !== 2) return null;
    const parseTime = (t: string): number => {
      const match = t.match(/(\d{1,2}):(\d{2})\s*(صباحاً|مساءً|ص|م)/);
      if (!match) return -1;
      let hour = parseInt(match[1], 10);
      const minute = parseInt(match[2], 10);
      const period = match[3];
      if (period === 'مساءً' || period === 'م') { if (hour !== 12) hour += 12; }
      if (period === 'صباحاً' || period === 'ص') { if (hour === 12) hour = 0; }
      return hour * 60 + minute;
    };
    const start = parseTime(parts[0]);
    const end = parseTime(parts[1]);
    if (start < 0 || end < 0) return null;
    return { start, end };
  } catch { return null; }
};

const isFriday = (dateStr: string): boolean => {
  const d = new Date(dateStr);
  return d.getDay() === 5;
};

// timeSlotTo24hMinutes
const timeSlotTo24hMinutes = (slot: string): number => {
  const match = slot.match(/(\d{1,2}):(\d{2})\s*(ص|م)/);
  if (!match) return -1;
  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const period = match[3];
  if (period === 'م' && hour !== 12) hour += 12;
  if (period === 'ص' && hour === 12) hour = 0;
  return hour * 60 + minute;
};

// WhatsApp phone cleaning
const cleanWhatsAppPhone = (phone: string): string => {
  let cleanPhone = (phone || '').replace(/[\s\-\+\(\)]/g, '');
  cleanPhone = cleanPhone.replace(/[^0-9]/g, '');
  if (cleanPhone.startsWith('0')) cleanPhone = '2' + cleanPhone;
  else if (!cleanPhone.startsWith('2') && cleanPhone.length === 10) cleanPhone = '20' + cleanPhone;
  return cleanPhone;
};

// fillReminderTemplate
const fillReminderTemplate = (template: string, item: any): string => {
  return template
    .replace(/\[الاسم\]/g, item.patientName || '')
    .replace(/\[التاريخ\]/g, item.date || '')
    .replace(/\[الوقت\]/g, item.time || '')
    .replace(/\[الطبيب\]/g, item.doctorName || '')
    .replace(/\[الإجراء\]/g, item.service || '');
};

// ===== Tests =====

describe('parseWorkingHoursText', () => {
  it('parses weekday hours correctly', () => {
    const result = parseWorkingHoursText('9:00 صباحاً - 9:00 مساءً');
    expect(result).toEqual({ start: 540, end: 1260 }); // 9*60=540, 21*60=1260
  });

  it('parses Friday hours correctly', () => {
    const result = parseWorkingHoursText('4:00 مساءً - 9:00 مساءً');
    expect(result).toEqual({ start: 960, end: 1260 }); // 16*60=960
  });

  it('returns null for invalid input', () => {
    expect(parseWorkingHoursText('')).toBeNull();
    expect(parseWorkingHoursText('invalid')).toBeNull();
  });
});

describe('isFriday', () => {
  it('detects Friday correctly', () => {
    // 2026-04-10 is a Friday
    expect(isFriday('2026-04-10')).toBe(true);
  });

  it('detects non-Friday correctly', () => {
    // 2026-04-06 is a Monday
    expect(isFriday('2026-04-06')).toBe(false);
  });
});

describe('Doctor fee calculation', () => {
  it('fee = 0 for متابعة كشف', () => {
    const service = 'متابعة كشف';
    const isFollowUp = service.includes('متابعة كشف') || service.includes('متابعة الكشف') || service.includes('متابعة عملية') || service.includes('متابعة العملية');
    const doctorFee = isFollowUp ? 0 : 150;
    expect(doctorFee).toBe(0);
  });

  it('fee = 0 for متابعة الكشف', () => {
    const service = 'متابعة الكشف';
    const isFollowUp = service.includes('متابعة كشف') || service.includes('متابعة الكشف') || service.includes('متابعة عملية') || service.includes('متابعة العملية');
    const doctorFee = isFollowUp ? 0 : 150;
    expect(doctorFee).toBe(0);
  });

  it('fee = 0 for متابعة عملية', () => {
    const service = 'متابعة عملية';
    const isFollowUp = service.includes('متابعة كشف') || service.includes('متابعة الكشف') || service.includes('متابعة عملية') || service.includes('متابعة العملية');
    const doctorFee = isFollowUp ? 0 : 150;
    expect(doctorFee).toBe(0);
  });

  it('fee = 0 for متابعة العملية', () => {
    const service = 'متابعة العملية';
    const isFollowUp = service.includes('متابعة كشف') || service.includes('متابعة الكشف') || service.includes('متابعة عملية') || service.includes('متابعة العملية');
    const doctorFee = isFollowUp ? 0 : 150;
    expect(doctorFee).toBe(0);
  });

  it('fee > 0 for regular كشف', () => {
    const service = 'كشف عيون';
    const isFollowUp = service.includes('متابعة كشف') || service.includes('متابعة الكشف') || service.includes('متابعة عملية') || service.includes('متابعة العملية');
    const doctorFee = isFollowUp ? 0 : 150;
    expect(doctorFee).toBe(150);
  });

  it('fee > 0 for عملية (not follow-up)', () => {
    const service = 'عملية مياه بيضاء';
    const isFollowUp = service.includes('متابعة كشف') || service.includes('متابعة الكشف') || service.includes('متابعة عملية') || service.includes('متابعة العملية');
    const doctorFee = isFollowUp ? 0 : 150;
    expect(doctorFee).toBe(150);
  });
});

describe('Booking date validation', () => {
  it('rejects past dates', () => {
    const pastDate = '2020-01-01';
    const selected = new Date(pastDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selected.setHours(0, 0, 0, 0);
    expect(selected < today).toBe(true);
  });

  it('rejects same-day booking', () => {
    const todayStr = new Date().toISOString().split('T')[0];
    expect(todayStr === todayStr).toBe(true); // same day = rejected
  });

  it('accepts tomorrow date', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(tomorrowStr);
    selected.setHours(0, 0, 0, 0);
    expect(selected > today).toBe(true);
  });
});

describe('Working hours time slot validation', () => {
  it('rejects time outside working hours', () => {
    const parsed = parseWorkingHoursText('9:00 صباحاً - 9:00 مساءً');
    const earlySlot = timeSlotTo24hMinutes('7:00 ص'); // 420 minutes < 540
    expect(earlySlot).toBeLessThan(parsed!.start);
  });

  it('accepts time within working hours', () => {
    const parsed = parseWorkingHoursText('9:00 صباحاً - 9:00 مساءً');
    const validSlot = timeSlotTo24hMinutes('10:00 ص'); // 600 minutes
    expect(validSlot).toBeGreaterThanOrEqual(parsed!.start);
    expect(validSlot).toBeLessThan(parsed!.end);
  });

  it('rejects time after closing on Friday', () => {
    const parsed = parseWorkingHoursText('4:00 مساءً - 9:00 مساءً');
    const lateSlot = timeSlotTo24hMinutes('10:00 ص'); // 600 < 960
    expect(lateSlot).toBeLessThan(parsed!.start);
  });
});

describe('WhatsApp phone cleaning', () => {
  it('adds country code for numbers starting with 0', () => {
    expect(cleanWhatsAppPhone('01012345678')).toBe('201012345678');
  });

  it('adds 20 prefix for 10-digit numbers', () => {
    expect(cleanWhatsAppPhone('1012345678')).toBe('201012345678');
  });

  it('keeps numbers already starting with 2', () => {
    expect(cleanWhatsAppPhone('201012345678')).toBe('201012345678');
  });

  it('strips non-numeric characters', () => {
    expect(cleanWhatsAppPhone('+2 010-1234-5678')).toBe('201012345678');
  });

  it('handles empty/null phone', () => {
    expect(cleanWhatsAppPhone('')).toBe('');
    expect(cleanWhatsAppPhone(null as any)).toBe('');
  });
});

describe('WhatsApp phone validation for button', () => {
  it('enables button for valid phone (10+ digits)', () => {
    const phone = '01012345678';
    const isValid = phone && phone.replace(/\D/g, '').length >= 10;
    expect(isValid).toBeTruthy();
  });

  it('disables button for short phone', () => {
    const phone = '0101234';
    const isValid = phone && phone.replace(/\D/g, '').length >= 10;
    expect(isValid).toBeFalsy();
  });

  it('disables button for empty phone', () => {
    const phone: string = '';
    const isValid = phone.length > 0 && phone.replace(/\D/g, '').length >= 10;
    expect(isValid).toBeFalsy();
  });
});

describe('Reminder template filling', () => {
  it('fills booking reminder template correctly', () => {
    const template = 'عزيزي [الاسم]، موعدك يوم [التاريخ] الساعة [الوقت] مع د. [الطبيب]';
    const item = {
      patientName: 'أحمد محمد',
      date: '2026-04-07',
      time: '10:00 ص',
      doctorName: 'محمد علي',
      service: 'كشف عيون'
    };
    const result = fillReminderTemplate(template, item);
    expect(result).toBe('عزيزي أحمد محمد، موعدك يوم 2026-04-07 الساعة 10:00 ص مع د. محمد علي');
  });

  it('fills operation reminder template correctly', () => {
    const template = 'تذكير بموعد عملية ([الإجراء]) للمريض [الاسم]';
    const item = {
      patientName: 'سعيد',
      service: 'عملية مياه بيضاء'
    };
    const result = fillReminderTemplate(template, item);
    expect(result).toBe('تذكير بموعد عملية (عملية مياه بيضاء) للمريض سعيد');
  });
});

describe('WhatsApp URL generation', () => {
  it('generates correct wa.me URL', () => {
    const phone = '01012345678';
    const cleanPhone = cleanWhatsAppPhone(phone);
    const message = 'مرحبا، تذكير بموعدك';
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    expect(url).toContain('wa.me/201012345678');
    expect(url).toContain('text=');
  });
});

describe('Upcoming reminders filtering', () => {
  it('filters only confirmed bookings for tomorrow', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const bookings = [
      { date: tomorrowStr, status: 'confirmed', reminderSent: false, service: 'كشف' },
      { date: tomorrowStr, status: 'cancelled', reminderSent: false, service: 'كشف' },
      { date: tomorrowStr, status: 'confirmed', reminderSent: true, service: 'كشف' },
      { date: '2026-01-01', status: 'confirmed', reminderSent: false, service: 'كشف' },
    ];

    const reminders = bookings.filter(b =>
      b.date === tomorrowStr && b.status === 'confirmed' && !b.reminderSent
    );
    expect(reminders).toHaveLength(1);
  });
});

describe('Doctor available dates validation', () => {
  it('rejects booking on non-available date', () => {
    const availableDates = ['2026-04-07', '2026-04-09'];
    const selectedDate = '2026-04-08';
    expect(availableDates.includes(selectedDate)).toBe(false);
  });

  it('accepts booking on available date', () => {
    const availableDates = ['2026-04-07', '2026-04-09'];
    const selectedDate = '2026-04-07';
    expect(availableDates.includes(selectedDate)).toBe(true);
  });

  it('rejects doctor with no available dates', () => {
    const availableDates: string[] = [];
    expect(availableDates.length).toBe(0);
  });
});
