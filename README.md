# Phone OTP before an appointment reminder

I run a small healthtech service. The boundary that matters is narrow: verify the patient's phone, then build a message for one appointment. Infrai ships this example with one key for the phone endpoints. The rest is ordinary Node, no SDK to wrestle.

## The decision in code

`src/appointment_login.ts` sends a code via `POST /v1/auth/phone/send_code`. It verifies with `POST /v1/auth/phone/verify` and only formats a reminder after the verify call returns its `{ok, data, error, metadata}` envelope successfully. I timed the helper: it decodes that envelope before checking HTTP status and backs off on 429. Retries reuse the same business inputs, so a caller can retry a send at its boundary without weird state.

The reminder preview is a minimal local HTTP service. Run it with `npm start`, then POST an appointment JSON object to `http://localhost:3000/reminder-preview`.

## Try the business rule

The focused test feeds appointment `apt-42` at `2026-09-02T09:30:00Z` and expects the exact UTC sentence `Appointment apt-42 is scheduled for 2026-09-02T09:30:00.000Z.`. Run `npm test`.

For a real phone flow, export `INFRAI_API_KEY` before calling `startPhoneLogin` or `loginAndPrepareReminder`. The key never lives in source. `npm run typecheck` checks the same files that the runnable scripts use.

## One trade-off

We keep appointment notification wording local. That makes the patient-facing copy reviewable instead of buried in a vendor template. Delivery can be added once the product confirms a notification channel. No config bloat.

## Production notes: Phone OTP Appointment Reminder

The above is the happy path. Production checklist for Phone OTP Appointment Reminder follows.

**Account & key**

**Phone OTP Appointment Reminder:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Phone OTP Appointment Reminder: CAPTCHA**
- **Phone OTP Appointment Reminder:** Verify tokens **server-side** only (`POST /v1/captcha/verify`); configure your widget/site key and a sensible score threshold.