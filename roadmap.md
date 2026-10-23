# Roadmap

## Migration from GitHub (Barrada Luxor Eye Center)
- [x] Port clinic screens, styles, tests, and Arabic content
- [x] Recreate database structure, permissions, and InstaPay/Paymob rules in Lovable Cloud
- [x] Move staff tools, assistant chat, Paymob checkout/settings and webhooks to this app's server
- [x] Verify build, 50 tests, home page, booking window, assistant chat, staff login error, 404
- [ ] Import existing records (doctors, services, bookings, etc.) — skipped for now by the user; waiting on data export
- [x] First admin invite + first-time password setup on the staff sign-in page
- [ ] Verify admin sign-in — waiting on the admin to confirm the email sent to their inbox
- [ ] Import remaining staff accounts — skipped for now by the user; waiting on staff list
- [ ] Set PAYMENT_WEBHOOK_SECRET — waiting on the user's existing value
- [ ] Re-enter Paymob keys in admin panel and update Paymob callback URL — after first admin exists and the app is published

## InstaPay manual review wiring (from original project)
- [x] Transfer number + amount + optional receipt fields on the InstaPay booking step (present in code)
- [x] Booking reference + "under review" message after booking (present in code)
- [x] Review panel inside the payments section (present in code)
- [x] Patient status lookup under "حجوزاتي" (present in code)
- [x] "مراجعة مدفوعات إنستاباي" staff permission (present in code)
- [ ] Browser check of the full InstaPay flow — needs real doctors/services and a reviewer account

## Dashboard requests (Oct 22)
- [x] Password change from Users screen (incl. own account); removed first-time password link from staff sign-in
- [x] Print button in complaints box
- [x] Doctor filter, print, and quick "تأكيد الدفع" in InstaPay payments review
- [ ] Icon colors / labels on side menu and icon-only buttons — paused earlier (credits); waiting for the user to ask again
- [ ] Staff sign-in button shows blank on the user's computer (likely an older browser that can't read the new color format) — waiting on the user's go-ahead

## Dashboard requests (Oct 23)
- [x] Remove the test doctor and its test booking
- [ ] Enforce each doctor's daily patient limit (server + booking form)
- [ ] Remove rating from doctor cards on the home page
- [ ] Make InstaPay review "تحديث" refresh work visibly
- [ ] Fix password change from the Users screen
- [ ] Transparent top bar on the home page
- [ ] Staff + doctor filters and print in the contact & reminders log
