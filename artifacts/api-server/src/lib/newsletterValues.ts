import crypto from "crypto";

// recipientCount is server-owned: there is no real delivery pipeline yet, so we
// always store 0 rather than trusting a client-supplied figure that would then be
// rendered as an authoritative "people reached" metric. Any recipientCount on the
// request body is intentionally ignored.
export function buildNewsletterValues(
  artistId: string,
  input: { subject: string; body: string; audience?: string },
) {
  return {
    id: crypto.randomUUID(),
    artistId,
    subject: input.subject.trim(),
    body: input.body.trim(),
    audience: input.audience ?? "all",
    recipientCount: 0,
    status: "sent" as const,
  };
}
