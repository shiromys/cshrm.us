const AHASEND_API_URL = process.env.AHASEND_API_URL ?? "https://api.ahasend.com";
const AHASEND_API_KEY = process.env.AHASEND_API_KEY ?? "";
const FROM = process.env.EMAIL_FROM_ADDRESS ?? "noreply@mail.cloudsourcehrm.us";

export interface AhaSendMessage {
  to: string;
  toName?: string;
  fromName: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
}

async function sendBulk(messages: AhaSendMessage[]) {
  const payload = {
    messages: messages.map((m) => ({
      from: { email: FROM, name: m.fromName },
      to: [{ email: m.to, name: m.toName ?? m.to }],
      reply_to: m.replyTo ? { email: m.replyTo } : undefined,
      subject: m.subject,
      html: m.html,
      text: m.text,
    })),
  };

  const res = await fetch(`${AHASEND_API_URL}/v1/email/send-bulk`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": AHASEND_API_KEY,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`AhaSend bulk send failed (${res.status}): ${body}`);
  }

  return res.json();
}

async function sendSingle(message: AhaSendMessage) {
  const payload = {
    from: { email: FROM, name: message.fromName },
    to: [{ email: message.to, name: message.toName ?? message.to }],
    reply_to: message.replyTo ? { email: message.replyTo } : undefined,
    subject: message.subject,
    html: message.html,
    text: message.text,
  };

  const res = await fetch(`${AHASEND_API_URL}/v1/email/send-message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": AHASEND_API_KEY,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`AhaSend send failed (${res.status}): ${body}`);
  }

  return res.json();
}

export const ahasend = { sendBulk, sendSingle };
