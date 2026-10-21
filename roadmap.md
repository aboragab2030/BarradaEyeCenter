# Roadmap

## Migration from GitHub (Barrada Luxor Eye Center)
- [x] Port clinic screens, styles, tests, and Arabic content
- [x] Recreate database structure, permissions, and InstaPay/Paymob rules in Lovable Cloud
- [x] Move staff tools, assistant chat, Paymob checkout/settings and webhooks to this app's server
- [x] Verify build, 50 tests, home page, booking window, assistant chat, staff login error, 404
- [ ] Import existing records (doctors, services, bookings, etc.) — skipped for now by the user; waiting on data export
- [ ] Import staff accounts and verify admin sign-in — skipped for now by the user; waiting on staff list / first admin email
- [ ] Set PAYMENT_WEBHOOK_SECRET — waiting on the user's existing value
- [ ] Re-enter Paymob keys in admin panel and update Paymob callback URL — after first admin exists and the app is published

## InstaPay manual review wiring (from original project)
- [x] Transfer number + amount + optional receipt fields on the InstaPay booking step (present in code)
- [x] Booking reference + "under review" message after booking (present in code)
- [x] Review panel inside the payments section (present in code)
- [x] Patient status lookup under "حجوزاتي" (present in code)
- [x] "مراجعة مدفوعات إنستاباي" staff permission (present in code)
- [ ] Browser check of the full InstaPay flow — needs real doctors/services and a reviewer account
