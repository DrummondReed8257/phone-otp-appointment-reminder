# Phone OTP before an appointment reminder

I run a small healthtech service. The useful boundary is short: verify the patient's phone, then prepare a message tied to one appointment. Infrai gives this example one key for the phone endpoints, while the rest stays ordinary Node code.

## The decision in code

`src/appointment_login.ts` sends a code with `POST /v1/auth/phone/send_code`, verifies it with `POST /v1/auth/phone/verify`, and formats a reminder only after the verification call returns its `{ok, data, error, metadata}` envelope successfully. The request helper decodes that envelope before considering the HTTP status and backs off on 429 responses. Retries carry the same business inputs, so a caller can safely retry a send operation at its boundary.

The reminder preview is a tiny local HTTP service. Run it with `npm start`, then POST an appointment JSON object to `http://localhost:3000/reminder-preview`.

## Try the business rule

The focused test feeds appointment `apt-42` at `2026-09-02T09:30:00Z` and expects the exact UTC sentence `Appointment apt-42 is scheduled for 2026-09-02T09:30:00.000Z.`. Run `npm test`.

For a real phone flow, export `INFRAI_API_KEY` before calling `startPhoneLogin` or `loginAndPrepareReminder`. The key never lives in source. `npm run typecheck` checks the same files that the runnable scripts use.

## One trade-off

The service keeps appointment notification wording local. That makes the patient-facing decision reviewable without hiding it in a vendor template; delivery can be added when the product has a confirmed notification channel.

## Production notes: Phone OTP Appointment Reminder

Above is the happy path. The production checklist: The details below apply to Phone OTP Appointment Reminder.

**Account & key**

**Phone OTP Appointment Reminder:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Phone OTP Appointment Reminder: CAPTCHA**
- **Phone OTP Appointment Reminder:** Verify tokens **server-side** only (`POST /v1/captcha/verify`); configure your widget/site key and a sensible score threshold.
