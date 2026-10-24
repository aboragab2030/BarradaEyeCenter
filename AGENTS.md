<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- The clinic app lives in `src/barada/` (ported verbatim from the original repo) and renders client-only from `src/routes/index.tsx` via `src/pages/Index.tsx`; it reads localStorage in state initializers, so it must not be server-rendered.
- Original backend functions are server functions in `src/lib/backend.functions.ts`; screens call them through `invokeBackend()` in `src/lib/backend.ts`, which keeps the old `{ data, error }` shape so ported code stays unchanged.
- External callers use `/api/public/payment-webhook` (shared `x-webhook-secret`) and `/api/public/paymob-webhook` (Paymob HMAC); both must verify before any write.
- Paymob secrets are AES-GCM encrypted in `payment_gateway_secrets` (helpers in `src/lib/paymob/paymob.server.ts`); never return decrypted values to the browser.
- Style class names were upgraded to the current Tailwind naming (shadow-xs, rounded-sm, outline-hidden, backdrop-blur-xs) to keep the original look; keep that mapping when porting more original code.
- tsconfig is relaxed (strict off, strictNullChecks on) to match the original project so ported code compiles unchanged.
- Staff accounts start from rows in `staff_invites`; the `claim_staff_invite` trigger grants profile + role only after the invited email is confirmed, so never grant roles from client input or before confirmation.
- Doctor add/edit/delete in the dashboard is mirrored to the `doctors` table (local list kept as before) because daily/hourly booking limits are enforced by a database trigger that reads that table.
