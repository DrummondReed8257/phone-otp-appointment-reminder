import assert from "node:assert/strict";
import { notificationText } from "./appointment_login.ts";

const message = notificationText({ patientPhone: "+15551234567", appointmentId: "apt-42", startsAt: "2026-09-02T09:30:00Z" });
assert.equal(message, "Appointment apt-42 is scheduled for 2026-09-02T09:30:00.000Z.");
console.log("appointment notification decision: pass");
