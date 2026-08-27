/**
 * Postmark Email API wrapper — secondary/fallback bulk sender
 *
 * Docs: https://postmarkapp.com/developer/api/email-api
 * Base: https://api.postmarkapp.com
 * Auth: X-Postmark-Server-Token: <server_token>
 *
 * The `From` address must be a verified sender or domain in your Postmark account
 * (Sender Signatures or Domain). Set POSTMARK_FROM_EMAIL if different from
 * the shared EMAIL_FROM_ADDRESS.
 *
 * Batch endpoint accepts up to 500 messages per request.
 */

const BASE_URL   = "https://api.postmarkapp.com";
const TOKEN      = () => process.env.POSTMARK_SERVER_TOKEN ?? "";
const FROM_EMAIL = () =>
  process.env.POSTMARK_FROM_EMAIL ??
  process.env.EMAIL_FROM_ADDRESS ??
  "info@cloudsourcehrm.us";

/** Matches the MailerCloud message shape for drop-in compatibility. */
export interface PostmarkMessage {
  to:         string;
  toName?:    string;
  fromName?:  string;
  replyTo?:   string;
  subject:    string;
  html:       string;
  text?:      string;
  cc?:        string[];
  /** Caller tracking only — not sent to Postmark. */
  emailLogId?: string;
}

/** Build a Postmark-shaped email object from our internal message type. */
function toPostmarkPayload(msg: PostmarkMessage) {
  const fromAddress = FROM_EMAIL();
  const fromField   = msg.fromName ? `${msg.fromName} <${fromAddress}>` : fromAddress;
  const toField     = msg.toName   ? `${msg.toName} <${msg.to}>`        : msg.to;

  return {
    From:          fromField,
    To:            toField,
    Subject:       msg.subject,
    HtmlBody:      msg.html,
    ...(msg.text   ? { TextBody: msg.text }                          : {}),
    ...(msg.replyTo ? { ReplyTo: msg.replyTo }                       : {}),
    ...(msg.cc?.length ? { Cc: msg.cc.join(",") }                    : {}),
    MessageStream: "outbound",
  };
}

function headers() {
  const token = TOKEN();
  if (!token) throw new Error("POSTMARK_SERVER_TOKEN is not configured");
  return {
    "Content-Type":            "application/json",
    "Accept":                  "application/json",
    "X-Postmark-Server-Token": token,
  };
}

/**
 * Send a single email via Postmark.
 */
async function sendOne(msg: PostmarkMessage): Promise<void> {
  const res = await fetch(`${BASE_URL}/email`, {
    method:  "POST",
    headers: headers(),
    body:    JSON.stringify(toPostmarkPayload(msg)),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Postmark HTTP error (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { ErrorCode?: number; Message?: string };
  if (data.ErrorCode && data.ErrorCode !== 0) {
    throw new Error(`Postmark send failed (${data.ErrorCode}): ${data.Message}`);
  }
}

/**
 * Send to multiple recipients via Postmark's /email/batch endpoint.
 * Postmark accepts up to 500 messages per batch call.
 *
 * Mirrors the MailerCloud sendBulk signature exactly for drop-in fallback use.
 */
async function sendBulk(messages: PostmarkMessage[]): Promise<{ sent: number; failed: number }> {
  const BATCH_LIMIT = 500; // Postmark hard limit per call
  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  let sent   = 0;
  let failed = 0;
  const firstError: string[] = [];

  for (let i = 0; i < messages.length; i += BATCH_LIMIT) {
    const batch   = messages.slice(i, i + BATCH_LIMIT);
    const payload = batch.map(toPostmarkPayload);

    try {
      const res = await fetch(`${BASE_URL}/email/batch`, {
        method:  "POST",
        headers: headers(),
        body:    JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Postmark batch HTTP error (${res.status}): ${body}`);
      }

      // Response is an array of per-message results
      const results = (await res.json()) as Array<{ ErrorCode?: number; Message?: string }>;
      for (const r of results) {
        if (!r.ErrorCode || r.ErrorCode === 0) {
          sent++;
        } else {
          failed++;
          if (firstError.length === 0) {
            firstError.push(`ErrorCode ${r.ErrorCode}: ${r.Message}`);
          }
          console.error("[postmark] Per-message error:", r.ErrorCode, r.Message);
        }
      }
    } catch (err) {
      // Whole batch call failed — count all as failed
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[postmark] Batch send failed:", msg);
      failed += batch.length;
      if (firstError.length === 0) firstError.push(msg);
    }

    // Small pause between consecutive batch calls if there are many messages
    if (i + BATCH_LIMIT < messages.length) await sleep(200);
  }

  if (sent === 0 && failed > 0) {
    throw new Error(`All Postmark sends failed. First error: ${firstError[0] ?? "unknown"}`);
  }

  return { sent, failed };
}

export const postmark = { sendOne, sendBulk };
