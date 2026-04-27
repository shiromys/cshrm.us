import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { createHmac } from "crypto";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── HMAC token helpers ───────────────────────────────────────────────────────
export function generateHmacToken(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function verifyHmacToken(secret: string, payload: string, token: string): boolean {
  const expected = generateHmacToken(secret, payload);
  // Constant-time comparison
  if (expected.length !== token.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  }
  return mismatch === 0;
}

export function buildUnsubscribeLink(emailLogId: string, contactEmail: string): string {
  const secret = process.env.UNSUBSCRIBE_HMAC_SECRET ?? "";
  const payload = `${emailLogId}:${contactEmail}`;
  const token = generateHmacToken(secret, payload);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${appUrl}/api/unsubscribe?id=${emailLogId}&email=${encodeURIComponent(contactEmail)}&token=${token}`;
}

export function buildOpenTrackingPixel(emailLogId: string, contactEmail: string): string {
  const secret = process.env.OPEN_TRACKING_HMAC_SECRET ?? "";
  const payload = `${emailLogId}:${contactEmail}`;
  const token = generateHmacToken(secret, payload);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `<img src="${appUrl}/api/track/open?id=${emailLogId}&email=${encodeURIComponent(contactEmail)}&token=${token}" width="1" height="1" alt="" style="display:none" />`;
}

// ─── Name normalisation ───────────────────────────────────────────────────────
export function normaliseName(raw: string): string {
  if (!raw) return "";
  const trimmed = raw.trim();

  // Last, First format
  if (trimmed.includes(",")) {
    const parts = trimmed.split(",").map((p) => p.trim());
    if (parts.length === 2) return toTitleCase(`${parts[1]} ${parts[0]}`);
  }

  // Initials only (e.g., A.B. or A.B)
  if (/^[A-Z]\.[A-Z]\.?$/.test(trimmed)) return trimmed;

  // Single word (first name only)
  if (!/\s/.test(trimmed)) return toTitleCase(trimmed);

  // Full name
  return toTitleCase(trimmed);
}

function toTitleCase(str: string): string {
  // If already mixed case (not all-lower or all-upper), preserve it
  if (str !== str.toLowerCase() && str !== str.toUpperCase()) return str;
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
export function today(): string {
  return new Date().toISOString().split("T")[0]!;
}

// ─── Cron security ────────────────────────────────────────────────────────────
export function verifyCronSecret(request: Request): boolean {
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}
