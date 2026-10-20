import { describe, it, expect } from 'vitest';
import { buildPaymobHmacString, hmacSha512Hex, verifyPaymobHmac, safeEqualHex, validatePaymobKeys } from '@/lib/paymob/paymobHmac';

// Sample "Transaction processed" callback from Paymob's HMAC documentation.
const sampleObj = {
  id: 192036465,
  pending: false,
  amount_cents: 100000,
  success: true,
  is_auth: false,
  is_capture: false,
  is_standalone_payment: true,
  is_voided: false,
  is_refunded: false,
  is_3d_secure: true,
  integration_id: 4097558,
  has_parent_transaction: false,
  order: { id: 217503754, merchant_order_id: 'PM-ABC123' },
  created_at: '2024-06-13T11:33:44.592345',
  currency: 'EGP',
  error_occured: false,
  owner: 302852,
  source_data: { pan: '2346', type: 'card', sub_type: 'MasterCard' },
};

describe('Paymob HMAC', () => {
  it('builds the concatenated string exactly like the Paymob docs sample', () => {
    expect(buildPaymobHmacString(sampleObj)).toBe(
      '1000002024-06-13T11:33:44.592345EGPfalsefalse1920364654097558truefalsefalsefalsetruefalse217503754302852false2346MasterCardcardtrue'
    );
  });

  it('accepts a callback signed with the stored secret and rejects anything else', async () => {
    const secret = 'TEST_HMAC_SECRET';
    const signature = await hmacSha512Hex(buildPaymobHmacString(sampleObj), secret);
    expect(signature).toMatch(/^[0-9a-f]{128}$/);
    expect(await verifyPaymobHmac(sampleObj, signature, ['other', secret])).toBe(true);
    expect(await verifyPaymobHmac(sampleObj, signature, ['wrong-secret'])).toBe(false);
    expect(await verifyPaymobHmac({ ...sampleObj, amount_cents: 1 }, signature, [secret])).toBe(false);
    expect(await verifyPaymobHmac(sampleObj, '', [secret])).toBe(false);
  });

  it('compares signatures safely', () => {
    expect(safeEqualHex('abcd', 'ABCD')).toBe(true);
    expect(safeEqualHex('abcd', 'abce')).toBe(false);
    expect(safeEqualHex('', '')).toBe(false);
  });

  it('rejects live keys in test mode and vice versa', () => {
    expect(validatePaymobKeys('test', { publicKey: 'egy_pk_test_x', secretKey: 'egy_sk_test_y' })).toBeNull();
    expect(validatePaymobKeys('live', { publicKey: 'egy_pk_live_x', secretKey: 'egy_sk_live_y' })).toBeNull();
    expect(validatePaymobKeys('test', { secretKey: 'egy_sk_live_y' })).not.toBeNull();
    expect(validatePaymobKeys('live', { publicKey: 'egy_pk_test_x' })).not.toBeNull();
  });
});
