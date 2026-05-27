import { createHmac, timingSafeEqual } from "crypto";

const UNSUBSCRIBE_SECRET =
  process.env.UNSUBSCRIBE_SECRET ?? "kiln-unsubscribe-default-secret-v1";

/**
 * Generates a stateless HMAC-signed token that encodes the userId.
 * Format: base64url(userId).<hex-hmac>
 */
export function generateUnsubscribeToken(userId: string): string {
  const sig = createHmac("sha256", UNSUBSCRIBE_SECRET)
    .update(userId)
    .digest("hex");
  const payload = Buffer.from(userId).toString("base64url");
  return `${payload}.${sig}`;
}

/**
 * Verifies an unsubscribe token. Returns the userId on success, null on failure.
 */
export function verifyUnsubscribeToken(token: string): string | null {
  const dotIdx = token.indexOf(".");
  if (dotIdx === -1) return null;
  const payload = token.slice(0, dotIdx);
  const sig = token.slice(dotIdx + 1);
  if (!payload || !sig) return null;

  let userId: string;
  try {
    userId = Buffer.from(payload, "base64url").toString("utf8");
  } catch {
    return null;
  }

  if (!userId) return null;

  const expected = createHmac("sha256", UNSUBSCRIBE_SECRET)
    .update(userId)
    .digest("hex");

  try {
    const sigBuf = Buffer.from(sig, "hex");
    const expBuf = Buffer.from(expected, "hex");
    if (sigBuf.length !== expBuf.length) return null;
    if (!timingSafeEqual(sigBuf, expBuf)) return null;
  } catch {
    return null;
  }

  return userId;
}

/**
 * Generates a stateless HMAC-signed token that encodes both userId and bookingId
 * for per-booking reminder opt-out.
 * Format: base64url(userId\x00bookingId).<hex-hmac>
 */
export function generateBookingUnsubscribeToken(userId: string, bookingId: string): string {
  const raw = `${userId}\x00${bookingId}`;
  const sig = createHmac("sha256", UNSUBSCRIBE_SECRET)
    .update(raw)
    .digest("hex");
  const payload = Buffer.from(raw).toString("base64url");
  return `${payload}.${sig}`;
}

/**
 * Verifies a booking-level unsubscribe token.
 * Returns { userId, bookingId } on success, null on failure.
 */
export function verifyBookingUnsubscribeToken(token: string): { userId: string; bookingId: string } | null {
  const dotIdx = token.indexOf(".");
  if (dotIdx === -1) return null;
  const payload = token.slice(0, dotIdx);
  const sig = token.slice(dotIdx + 1);
  if (!payload || !sig) return null;

  let raw: string;
  try {
    raw = Buffer.from(payload, "base64url").toString("utf8");
  } catch {
    return null;
  }

  const sepIdx = raw.indexOf("\x00");
  if (sepIdx === -1) return null;
  const userId = raw.slice(0, sepIdx);
  const bookingId = raw.slice(sepIdx + 1);
  if (!userId || !bookingId) return null;

  const expected = createHmac("sha256", UNSUBSCRIBE_SECRET)
    .update(raw)
    .digest("hex");

  try {
    const sigBuf = Buffer.from(sig, "hex");
    const expBuf = Buffer.from(expected, "hex");
    if (sigBuf.length !== expBuf.length) return null;
    if (!timingSafeEqual(sigBuf, expBuf)) return null;
  } catch {
    return null;
  }

  return { userId, bookingId };
}
