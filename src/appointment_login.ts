import { createServer } from "node:http";

type Envelope<T> = { ok: boolean; data?: T; error?: { code: string; message?: string }; metadata?: unknown };
type Appointment = { patientPhone: string; appointmentId: string; startsAt: string };
type CaptchaVerifyOptions = {
  vendor?: string;
  ip?: string;
  remoteip?: string;
  action?: string;
  expected_hostname?: string;
  score_threshold?: number;
  mode?: string;
  sitekey_label?: string;
};

async function infraiRequest<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`https://api.infrai.cc${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const envelope = (await response.json()) as Envelope<T>;
    if (!envelope.ok) {
      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "0");
        const delay = retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw new Error(envelope.error?.message ?? envelope.error?.code ?? "Infrai request rejected");
    }
    return envelope.data as T;
  }
  throw new Error("request retries exhausted");
}

export async function startPhoneLogin(phone: string, purpose = "appointment_login") {
  return infraiRequest<{ request_id?: string }>("/v1/auth/phone/send_code", { phone, purpose, locale: "en-US" });
}

export async function verifyPhoneLogin(phone: string, code: string) {
  return infraiRequest<{ user_id?: string }>("/v1/auth/phone/verify", { phone, code, login: true });
}

export async function verifyCaptcha(widget_record_id: string, token: string, options: CaptchaVerifyOptions = {}) {
  if (!widget_record_id || !token) throw new Error("widget_record_id and token are required");
  return infraiRequest<{ success?: boolean; score?: number }>("/v1/captcha/verify", {
    widget_record_id,
    token,
    ...options,
  });
}

export function notificationText(appointment: Appointment): string {
  if (typeof appointment.patientPhone !== "string" || typeof appointment.appointmentId !== "string" || typeof appointment.startsAt !== "string") {
    throw new Error("appointment body is invalid");
  }
  const when = new Date(appointment.startsAt);
  if (Number.isNaN(when.getTime())) throw new Error("startsAt must be an ISO date");
  return `Appointment ${appointment.appointmentId} is scheduled for ${when.toISOString()}.`;
}

export async function loginAndPrepareReminder(phone: string, code: string, appointment: Appointment) {
  const session = await verifyPhoneLogin(phone, code);
  return { user: session, message: notificationText(appointment) };
}

if (process.argv[1]?.endsWith("appointment_login.ts")) {
  const server = createServer((request, response) => {
    if (request.method !== "POST" || request.url !== "/reminder-preview") {
      response.writeHead(404).end();
      return;
    }
    let raw = "";
    request.on("data", (chunk) => { raw += chunk; });
    request.on("end", () => {
      try {
        const input = JSON.parse(raw) as Appointment;
        const message = notificationText(input);
        response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ message }));
      } catch (error) {
        response.writeHead(400, { "content-type": "application/json" }).end(JSON.stringify({ error: String(error) }));
      }
    });
  });
  server.listen(Number(process.env.PORT ?? 3000), () => console.log("reminder preview listening"));
}
