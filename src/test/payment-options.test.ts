import { describe, it, expect } from 'vitest';
import { paymentOptionsFor } from '@/barada/paymentOptions';

describe('booking payment options follow dashboard settings', () => {
  it('hides InstaPay when it is removed from settings', () => {
    expect(paymentOptionsFor([{ type: 'wallet' }]).instapay).toBe(false);
  });
  it('hides the wallet when it is removed from settings', () => {
    expect(paymentOptionsFor([{ type: 'instapay' }]).wallet).toBe(false);
  });
  it('always keeps cash at the center, even with no methods', () => {
    expect(paymentOptionsFor([])).toEqual({ cash: true, instapay: false, wallet: false });
  });
  it('shows both when both are set', () => {
    expect(paymentOptionsFor([{ type: 'instapay' }, { type: 'wallet' }])).toEqual({ cash: true, instapay: true, wallet: true });
  });
});
