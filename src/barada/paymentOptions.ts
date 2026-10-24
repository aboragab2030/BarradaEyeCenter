// Which transfer options the booking "طريقة الدفع" step offers, based on the
// payment methods saved in the dashboard settings. Cash at the center is always offered.

export const paymentOptionsFor = (methods: { type: string }[] | null | undefined) => ({
  cash: true,
  instapay: (methods || []).some(m => m.type === 'instapay'),
  wallet: (methods || []).some(m => m.type === 'wallet'),
});
