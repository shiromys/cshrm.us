/**
 * MailerCloud Email API wrapper
 *
 * Docs: https://apidoc.mailercloud.com/api-reference/email/send-email
 * Base: https://email-api.mailercloud.com
 * Auth: Authorization: <api_key>  (plain text — no "Bearer" prefix)
 *
 * The `from` address must be a verified sender in your MailerCloud account
 * (Settings → Senders). Set MAILERCLOUD_FROM_EMAIL if different from the
 * shared EMAIL_FROM_ADDRESS.
 */

const BASE_URL  = "https://email-api.mailercloud.com";
const API_KEY   = () => process.env.MAILERCLOUD_API_KEY ?? "";
const FROM_EMAIL = () =>
  process.env.MAILERCLOUD_FROM_EMAIL ??
  process.env.EMAIL_FROM_ADDRESS ??
  "info@cloudsourcehrm.us";

export interface MailerCloudMessage {
  to:        string;
  toName?:   string;
  fromName?: string;
  replyTo?:  string;
  subject:   string;
  html:      string;
  text?:     string;
  cc?:       string[];
  /** Caller tracking only — not sent to MailerCloud. */
  emailLogId?: string;
}

/**
 * Send a single email via MailerCloud's transactional Email API.
 */
async function sendOne(msg: MailerCloudMessage): Promise<void> {
  const key = API_KEY();
  if (!key) throw new Error("MAILERCLOUD_API_KEY is not configured");

  const payload = {
    version: "1.0",
    email: {
      from:     FROM_EMAIL(),
      fromName: msg.fromName,
      ...(msg.replyTo ? { replyTo: [msg.replyTo] } : {}),
      subject:  msg.subject,
      html:     msg.html,
      ...(msg.text ? { text: msg.text } : {}),
      recipients: {
        to: [{ name: msg.toName ?? msg.to, email: msg.to }],
        ...(msg.cc?.length ? { cc: msg.cc } : {}),
      },
    },
    metadata: { campaignType: "TRANSACTIONAL" },
  };

  const res = await fetch(`${BASE_URL}/email`, {
    method:  "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": key,         // plain key — no "Bearer" prefix
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`MailerCloud HTTP error (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { status?: string; message?: string; statusCode?: number };
  if (data.status !== "SUCCESS") {
    throw new Error(`MailerCloud send failed (${data.statusCode}): ${data.message}`);
  }
}

/**
 * Send to multiple recipients, one email per recipient (keeps addresses private).
 *
 * Strategy (mirrors the AhaSend sendBulk pattern):
 *   ≤ 50   → all in parallel
 *   51–500 → batches of 25, 150ms pause
 *   > 500  → batches of 20, 300ms pause
 *
 * Partial failures are logged but don't abort the batch.
 * Throws only if every single send fails.
 */
async function sendBulk(messages: MailerCloudMessage[]): Promise<{ sent: number; failed: number }> {
  const total      = messages.length;
  const BATCH_SIZE = total <= 50 ? total : total <= 500 ? 25 : 20;
  const PAUSE_MS   = total <= 50 ? 0     : total <= 500 ? 150 : 300;

  let sent = 0;
  let failed = 0;
  const firstError: string[] = [];
  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(batch.map((m) => sendOne(m)));

    for (const result of results) {
      if (result.status === "fulfilled") {
        sent++;
      } else {
        failed++;
        if (firstError.length === 0) {
          firstError.push(result.reason instanceof Error ? result.reason.message : String(result.reason));
        }
        console.error("[mailercloud] Send failed:", result.reason);
      }
    }

    if (PAUSE_MS > 0 && i + BATCH_SIZE < total) await sleep(PAUSE_MS);
  }

  if (sent === 0 && failed > 0) {
    throw new Error(`All MailerCloud sends failed. First error: ${firstError[0] ?? "unknown"}`);
  }

  return { sent, failed };
}

export const mailercloud = { sendOne, sendBulk };
