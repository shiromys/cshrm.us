const AHASEND_API_URL = process.env.AHASEND_API_URL ?? "https://api.ahasend.com";
const AHASEND_API_KEY = process.env.AHASEND_API_KEY ?? "";
// Prefer a dedicated AhaSend from-address; fall back to the shared transactional address
const FROM = process.env.AHASEND_FROM_EMAIL ?? process.env.EMAIL_FROM_ADDRESS ?? "no-reply@cloudsourcehrm.us";

export interface AhaSendMessage {
  to: string;
  toName?: string;
  fromName: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Send a single email via AhaSend v1 API.
 * Endpoint: POST /v1/email/send
 * Payload uses `recipients[]` and nested `content` object.
 */
async function sendOne(message: AhaSendMessage): Promise<void> {
  const payload = {
    from: {
      email: FROM,
      name: message.fromName,
    },
    recipients: [
      { email: message.to, name: message.toName ?? message.to },
    ],
    content: {
      subject: message.subject,
      html_body: message.html,
      text_body: message.text,
      ...(message.replyTo ? { reply_to: { email: message.replyTo } } : {}),
    },
  };

  const res = await fetch(`${AHASEND_API_URL}/v1/email/send`, {
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
}

/**
 * Send personalised emails to multiple recipients.
 *
 * Since each email is individually personalised, we send one request per recipient.
 * The strategy scales automatically based on list size:
 *
 *  ≤ 50  recipients → fire all simultaneously (fastest, safe at low volume)
 *  51–500            → batches of 25 with 150ms pause between batches
 *  > 500             → batches of 20 with 300ms pause between batches (steady, rate-limit safe)
 *
 * Partial failures are logged but don't abort the campaign.
 * Throws only if every single send fails.
 */
async function sendBulk(messages: AhaSendMessage[]): Promise<{ sent: number; failed: number }> {
  const total = messages.length;

  // Pick strategy based on list size
  const BATCH_SIZE  = total <= 50 ? total : total <= 500 ? 25 : 20;
  const PAUSE_MS    = total <= 50 ? 0     : total <= 500 ? 150 : 300;

  let sent = 0;
  let failed = 0;
  const firstError: string[] = [];

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
        console.error("[ahasend] Failed to send:", result.reason);
      }
    }

    // Pause between batches (skip after the last one)
    if (PAUSE_MS > 0 && i + BATCH_SIZE < total) {
      await sleep(PAUSE_MS);
    }
  }

  // Only throw if everything failed
  if (sent === 0 && failed > 0) {
    throw new Error(`All AhaSend sends failed. First error: ${firstError[0] ?? "unknown"}`);
  }

  return { sent, failed };
}

export const ahasend = { sendBulk, sendSingle: sendOne };
