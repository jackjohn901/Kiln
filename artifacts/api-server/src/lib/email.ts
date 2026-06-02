import { logger } from "./logger";
import { enqueueFailedEmail } from "./emailQueue";

async function getResendApiKey(): Promise<string | null> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (hostname && xReplitToken) {
    try {
      const resp = await fetch(
        `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=resend`,
        {
          headers: { Accept: "application/json", "X-Replit-Token": xReplitToken },
          signal: AbortSignal.timeout(5_000),
        }
      );
      if (resp.ok) {
        const data = await resp.json() as { items?: { settings?: { api_key?: string } }[] };
        const key = data.items?.[0]?.settings?.api_key;
        if (key) return key;
      }
    } catch { /* fall through to env var */ }
  }

  return process.env.RESEND_API_KEY ?? null;
}

export interface EmailAttachment {
  filename: string;
  /** Base64-encoded file content */
  content: string;
}

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  from?: string;
  attachments?: EmailAttachment[];
}

export interface EmailRetryContext {
  /** Arbitrary identifier for log correlation (e.g. Stripe session ID). */
  contextId?: string;
  /** Human-readable label for the log (e.g. "order confirmation"). */
  label?: string;
}

/**
 * Sends an email with up to two automatic retries on transient failure.
 * Delays: 1 s before retry 1, 2 s before retry 2.
 * Logs a structured warning on each failed attempt and an error when all
 * attempts are exhausted so failures are always diagnosable.
 */
export async function sendEmailWithRetry(
  payload: EmailPayload,
  ctx?: EmailRetryContext,
  maxAttempts = 3,
): Promise<boolean> {
  // Never retry or queue fake/seed addresses — they can never be delivered.
  if (isFakeAddress(payload.to)) {
    logger.debug({ to: payload.to, subject: payload.subject }, "Email skipped — fake/seed address (not queued)");
    return false;
  }

  const delays = [1_000, 2_000];
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const ok = await sendEmail(payload);
    if (ok) return true;
    if (attempt < maxAttempts) {
      const delayMs = delays[attempt - 1] ?? 2_000;
      logger.warn(
        { to: payload.to, subject: payload.subject, attempt, contextId: ctx?.contextId, label: ctx?.label },
        `Email send attempt ${attempt} failed — retrying in ${delayMs}ms`,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  logger.error(
    { to: payload.to, subject: payload.subject, attempts: maxAttempts, contextId: ctx?.contextId, label: ctx?.label },
    "Email send failed after all retry attempts — queuing for persistent retry",
  );
  void enqueueFailedEmail(payload, ctx?.contextId, ctx?.label);
  return false;
}

// Known fake/internal domains used in seed data — never attempt real sends to these
const FAKE_DOMAINS = [".kiln", ".internal", ".test", ".example", ".invalid", ".localhost"];

/**
 * Returns true if the recipient address belongs to a fake/seed domain that can
 * never receive real mail. Such addresses must never be sent, retried, or queued.
 */
export function isFakeAddress(to: string): boolean {
  const domain = to.slice(to.lastIndexOf("@") + 1).toLowerCase();
  return FAKE_DOMAINS.some((d) => domain.endsWith(d)) || domain === "example.com";
}

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  // Skip fake seed addresses silently — they always fail and flood the logs
  if (isFakeAddress(payload.to)) {
    logger.debug({ to: payload.to }, "Email skipped — fake/seed address");
    return false;
  }

  const apiKey = await getResendApiKey();

  if (!apiKey) {
    logger.debug({ to: payload.to, subject: payload.subject }, "Email skipped — Resend not configured");
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: payload.from ?? "Kiln <onboarding@resend.dev>",
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
        ...(payload.attachments && payload.attachments.length > 0
          ? { attachments: payload.attachments }
          : {}),
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      logger.error({ err, to: payload.to }, "Email send failed");
      return false;
    }

    logger.info({ to: payload.to, subject: payload.subject }, "Email sent");
    return true;
  } catch (err) {
    logger.error({ err, to: payload.to }, "Email send error");
    return false;
  }
}

const BASE_URL = "https://kilnfire.replit.app/kiln";

const shell = (content: string) => `
<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;background:#1a1714;color:#d6d3d1;padding:32px;border-radius:16px;">
  <div style="margin-bottom:24px;">
    <span style="font-size:20px;font-weight:bold;color:#f59e0b;">Kiln</span>
    <span style="color:#78716c;font-size:12px;margin-left:8px;">Craft Creator Platform</span>
  </div>
  ${content}
  <div style="margin-top:32px;padding-top:16px;border-top:1px solid #292524;font-size:11px;color:#57534e;">
    You're receiving this because you have an account on Kiln. <a href="${BASE_URL}/settings" style="color:#f59e0b;">Manage preferences</a>
  </div>
</div>`;

const btn = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;background:#f59e0b;color:#1c1917;padding:12px 28px;border-radius:24px;text-decoration:none;font-weight:bold;margin-top:16px;">${label} →</a>`;

const card = (content: string) =>
  `<div style="background:#292524;border-radius:12px;padding:20px;margin:16px 0;">${content}</div>`;

const CARRIER_TRACKING_URLS: Record<string, (tracking: string) => string> = {
  usps:  (t) => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(t)}`,
  ups:   (t) => `https://www.ups.com/track?tracknum=${encodeURIComponent(t)}`,
  fedex: (t) => `https://www.fedex.com/fedextrack/?tracknumbers=${encodeURIComponent(t)}`,
  dhl:   (t) => `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${encodeURIComponent(t)}`,
};

const CARRIER_LABELS: Record<string, string> = {
  usps:  "USPS",
  ups:   "UPS",
  fedex: "FedEx",
  dhl:   "DHL",
};

export function shippingNotificationEmail(
  orderTitle: string,
  orderId: string,
  trackingNumber?: string | null,
  carrier?: string | null,
): string {
  const receiptUrl = `${BASE_URL}/orders/${orderId}`;

  let trackingHtml = `<p style="margin:0;color:#78716c;font-size:13px;">The artist will send you tracking details as soon as they're available.</p>`;
  if (trackingNumber) {
    const carrierKey = carrier?.toLowerCase().trim() ?? "";
    const buildUrl = CARRIER_TRACKING_URLS[carrierKey];
    const carrierLabel = CARRIER_LABELS[carrierKey] ?? carrier ?? null;
    const trackingUrl = buildUrl ? buildUrl(trackingNumber) : null;

    const numberHtml = trackingUrl
      ? `<a href="${trackingUrl}" style="color:#f59e0b;text-decoration:none;font-family:monospace;">${escHtml(trackingNumber)}</a>`
      : `<strong style="color:#d6d3d1;font-family:monospace;">${escHtml(trackingNumber)}</strong>`;

    trackingHtml = `
      ${carrierLabel ? `<p style="margin:0 0 6px;color:#a8a29e;font-size:13px;">Carrier: <strong style="color:#d6d3d1;">${escHtml(carrierLabel)}</strong></p>` : ""}
      <p style="margin:0 0 6px;color:#a8a29e;font-size:13px;">Tracking: ${numberHtml}</p>
      ${trackingUrl ? `<p style="margin:8px 0 0;"><a href="${trackingUrl}" style="display:inline-block;background:#1c4f8a;color:#93c5fd;padding:7px 16px;border-radius:16px;text-decoration:none;font-size:12px;font-weight:bold;">Track your package →</a></p>` : ""}
    `;
  }

  return shell(`
    <h1 style="color:#f59e0b;font-size:22px;margin-bottom:4px;">Your order has shipped! 📦</h1>
    <p style="color:#78716c;margin-bottom:0;">Great news — the artist has marked your order as shipped.</p>
    ${card(`
      <p style="margin:0 0 8px;font-size:15px;"><strong>${escHtml(orderTitle)}</strong></p>
      ${trackingHtml}
    `)}
    ${btn(receiptUrl, "View receipt")}
  `);
}

export function trackingUpdateEmail(
  orderTitle: string,
  orderId: string,
  trackingNumber?: string | null,
  carrier?: string | null,
): string {
  const receiptUrl = `${BASE_URL}/orders/${orderId}`;

  let trackingHtml = `<p style="margin:0;color:#78716c;font-size:13px;">The artist has updated your order details.</p>`;
  if (trackingNumber) {
    const carrierKey = carrier?.toLowerCase().trim() ?? "";
    const buildUrl = CARRIER_TRACKING_URLS[carrierKey];
    const carrierLabel = CARRIER_LABELS[carrierKey] ?? carrier ?? null;
    const trackingUrl = buildUrl ? buildUrl(trackingNumber) : null;

    const numberHtml = trackingUrl
      ? `<a href="${trackingUrl}" style="color:#f59e0b;text-decoration:none;font-family:monospace;">${escHtml(trackingNumber)}</a>`
      : `<strong style="color:#d6d3d1;font-family:monospace;">${escHtml(trackingNumber)}</strong>`;

    trackingHtml = `
      ${carrierLabel ? `<p style="margin:0 0 6px;color:#a8a29e;font-size:13px;">Carrier: <strong style="color:#d6d3d1;">${escHtml(carrierLabel)}</strong></p>` : ""}
      <p style="margin:0 0 6px;color:#a8a29e;font-size:13px;">Tracking: ${numberHtml}</p>
      ${trackingUrl ? `<p style="margin:8px 0 0;"><a href="${trackingUrl}" style="display:inline-block;background:#1c4f8a;color:#93c5fd;padding:7px 16px;border-radius:16px;text-decoration:none;font-size:12px;font-weight:bold;">Track your package →</a></p>` : ""}
    `;
  }

  return shell(`
    <h1 style="color:#f59e0b;font-size:22px;margin-bottom:4px;">Tracking updated 📦</h1>
    <p style="color:#78716c;margin-bottom:0;">The artist has updated the tracking information for your order.</p>
    ${card(`
      <p style="margin:0 0 8px;font-size:15px;"><strong>${escHtml(orderTitle)}</strong></p>
      ${trackingHtml}
    `)}
    ${btn(receiptUrl, "View receipt")}
  `);
}

export function deliveryNotificationEmail(
  orderTitle: string,
  orderId: string,
): string {
  const receiptUrl = `${BASE_URL}/orders/${orderId}`;
  return shell(`
    <h1 style="color:#f59e0b;font-size:22px;margin-bottom:4px;">Your order has been delivered! 🎉</h1>
    <p style="color:#78716c;margin-bottom:0;">Great news — the artist has marked your order as delivered.</p>
    ${card(`
      <p style="margin:0 0 8px;font-size:15px;"><strong>${escHtml(orderTitle)}</strong></p>
      <p style="margin:0;color:#78716c;font-size:13px;">We hope you love your new piece. If you have any issues with your order, please reach out to the artist directly.</p>
    `)}
    ${btn(receiptUrl, "View receipt")}
  `);
}

export function newFollowerEmail(followerName: string): string {
  return shell(`
    <h1 style="color:#f59e0b;font-size:22px;margin-bottom:4px;">New Follower</h1>
    ${card(`<p style="margin:0;"><strong>${followerName}</strong> is now following your work on Kiln.</p>`)}
    ${btn(`${BASE_URL}/me`, "View your profile")}
  `);
}

export function newCommentEmail(commenterName: string, postCaption: string, postId: string): string {
  return shell(`
    <h1 style="color:#f59e0b;font-size:22px;margin-bottom:4px;">New Comment</h1>
    ${card(`
      <p style="margin:0 0 8px;"><strong>${commenterName}</strong> commented on your post:</p>
      <p style="margin:0;color:#78716c;font-style:italic;">"${postCaption.slice(0, 80)}…"</p>
    `)}
    ${btn(`${BASE_URL}/posts/${postId}`, "See the comment")}
  `);
}

export function newMentionEmail(mentionerName: string, snippet: string, postId: string, unsubscribeUrl?: string): string {
  const unsubscribeFooter = unsubscribeUrl
    ? `<p style="margin-top:16px;font-size:11px;color:#57534e;">Don't want mention emails? <a href="${unsubscribeUrl}" style="color:#f59e0b;">Unsubscribe from @mention emails</a></p>`
    : "";
  return shell(`
    <h1 style="color:#f59e0b;font-size:22px;margin-bottom:4px;">You were mentioned</h1>
    ${card(`
      <p style="margin:0 0 8px;"><strong>${mentionerName}</strong> mentioned you in a comment:</p>
      <p style="margin:0;color:#78716c;font-style:italic;">"${snippet.slice(0, 80)}…"</p>
    `)}
    ${btn(`${BASE_URL}/posts/${postId}`, "See the comment")}
    ${unsubscribeFooter}
  `);
}

export function newPatronEmail(patronName: string, tierName: string): string {
  return shell(`
    <h1 style="color:#f59e0b;font-size:22px;margin-bottom:4px;">New Patron! 🌟</h1>
    ${card(`
      <p style="margin:0 0 8px;"><strong>${patronName}</strong> just subscribed to your <strong style="color:#fcd34d;">${tierName}</strong> tier.</p>
      <p style="margin:0;color:#78716c;">Your patron community is growing. Keep creating amazing work!</p>
    `)}
    ${btn(`${BASE_URL}/earnings`, "View your patrons")}
  `);
}

export function newCommissionEmail(clientName: string, workType: string, description: string): string {
  return shell(`
    <h1 style="color:#f59e0b;font-size:22px;margin-bottom:4px;">New Commission Request</h1>
    <p style="color:#78716c;margin-bottom:0;">A collector wants to commission your work.</p>
    ${card(`
      <p style="margin:0 0 8px;"><strong style="color:#fcd34d;">From:</strong> ${clientName}</p>
      <p style="margin:0 0 8px;"><strong style="color:#fcd34d;">Work type:</strong> ${workType || "Custom work"}</p>
      <p style="margin:0;"><strong style="color:#fcd34d;">Description:</strong> ${description}</p>
    `)}
    ${btn(`${BASE_URL}/commissions`, "View Request")}
  `);
}

export function commissionQuotedEmail(
  artistName: string,
  workType: string,
  quotedPrice: number,
  currency: string,
  artistNotes?: string | null,
): string {
  const formattedPrice = quotedPrice.toLocaleString("en-US", {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 2,
  });
  const notesHtml = artistNotes
    ? `<p style="margin:12px 0 0;color:#a8a29e;font-size:13px;"><strong style="color:#d6d3d1;">Artist notes:</strong> ${escHtml(artistNotes)}</p>`
    : "";
  return shell(`
    <h1 style="color:#f59e0b;font-size:22px;margin-bottom:4px;">You have a quote from ${escHtml(artistName)}</h1>
    <p style="color:#78716c;margin-bottom:0;">The artist has reviewed your request and sent a price quote.</p>
    ${card(`
      <p style="margin:0 0 8px;color:#a8a29e;font-size:13px;">Work type: <strong style="color:#d6d3d1;">${escHtml(workType || "Custom work")}</strong></p>
      <p style="margin:0;font-size:18px;">Quoted price: <strong style="color:#fcd34d;">${formattedPrice}</strong></p>
      ${notesHtml}
    `)}
    ${btn(`${BASE_URL}/commission-tracker`, "Review Quote")}
  `);
}

export function commissionUpdateEmail(artistName: string, status: string, workType: string): string {
  const label = status === "accepted"
    ? `<span style="color:#4ade80;">accepted your request</span>`
    : status === "declined"
      ? `<span style="color:#f87171;">declined your request</span>`
      : `updated your commission to <strong>${status}</strong>`;
  return shell(`
    <h1 style="color:#f59e0b;font-size:22px;margin-bottom:4px;">Commission Update</h1>
    ${card(`<p style="margin:0;"><strong>${artistName}</strong> has ${label} for your ${workType || "commission"}.</p>`)}
    ${btn(`${BASE_URL}/commission-tracker`, "View Tracker")}
  `);
}

export function outbidEmail(auctionTitle: string, newBid: number, bidderName: string): string {
  return shell(`
    <h1 style="color:#f59e0b;font-size:22px;margin-bottom:4px;">You've been outbid</h1>
    ${card(`
      <p style="margin:0 0 8px;"><strong>${bidderName}</strong> just placed a bid of <strong style="color:#fcd34d;">$${newBid.toLocaleString()}</strong>.</p>
      <p style="margin:0;color:#78716c;">Auction: ${auctionTitle}</p>
    `)}
    ${btn(`${BASE_URL}/auctions`, "Bid Now")}
  `);
}

export function stripeAccountRestrictedEmail(displayName: string): string {
  return shell(`
    <h1 style="color:#f87171;font-size:22px;margin-bottom:4px;">Action Required: Payout Account Restricted</h1>
    <p style="color:#78716c;margin-bottom:0;">Hi${displayName ? ` ${escHtml(displayName)}` : ''}, your Stripe payout account has been restricted.</p>
    ${card(`
      <p style="margin:0 0 8px;">Stripe has flagged your connected account and payouts may be paused until the issue is resolved.</p>
      <p style="margin:0;color:#78716c;">Please complete any outstanding verification requirements to restore full access.</p>
    `)}
    ${btn(`${BASE_URL}/earnings`, "Complete Verification")}
  `);
}

export function orderConfirmationEmail(customerEmail: string, orderId: string, amountTotal: number, receiptOrderId?: string): string {
  const receiptUrl = receiptOrderId ? `${BASE_URL}/orders/${receiptOrderId}` : `${BASE_URL}/orders`;
  return shell(`
    <h1 style="color:#f59e0b;font-size:22px;margin-bottom:4px;">Order Confirmed</h1>
    ${card(`
      <p style="margin:0 0 8px;">Your order <strong style="color:#fcd34d;">${orderId}</strong> has been placed.</p>
      <p style="margin:0 0 8px;">Amount: <strong style="color:#fcd34d;">$${(amountTotal / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong></p>
      <p style="margin:0;color:#78716c;">The artist will reach out within 2–3 business days with shipping details.</p>
    `)}
    ${btn(receiptUrl, "View full receipt")}
  `);
}

export interface WorkshopCalendarParams {
  startDateISO?: string | null;
  endDateISO?: string | null;
  location?: string | null;
  isOnline?: boolean;
  workshopId?: string | null;
  durationHours?: number | null;
}

function formatGCalDate(iso: string): string {
  return iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function buildGoogleCalendarUrl(
  title: string,
  artistName: string,
  params: WorkshopCalendarParams,
): string {
  const start = params.startDateISO ? new Date(params.startDateISO) : null;
  const end = params.endDateISO
    ? new Date(params.endDateISO)
    : start
      ? new Date(start.getTime() + (params.durationHours ?? 2) * 60 * 60 * 1000)
      : null;

  if (!start || !end) return "";

  const location = params.isOnline ? "Online" : (params.location ?? "");
  const details = `Workshop with ${artistName} on Kiln.`;

  const qs = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${formatGCalDate(start.toISOString())}/${formatGCalDate(end.toISOString())}`,
    details,
    ...(location ? { location } : {}),
  });

  return `https://calendar.google.com/calendar/render?${qs.toString()}`;
}

export interface WorkshopBookingEmailOptions {
  isOnline?: boolean;
  location?: string | null;
  meetingUrl?: string | null;
}

export function workshopBookingEmail(
  workshopTitle: string,
  artistName: string,
  startDate: string,
  calParams?: WorkshopCalendarParams,
  opts?: WorkshopBookingEmailOptions,
): string {
  const gcalUrl = calParams ? buildGoogleCalendarUrl(workshopTitle, artistName, calParams) : "";
  const icsUrl = calParams?.workshopId ? `${BASE_URL.replace(/\/kiln$/, "")}/api/workshops/${calParams.workshopId}/calendar.ics` : "";

  const isOnline = opts?.isOnline ?? calParams?.isOnline;
  const locationLine = isOnline
    ? opts?.meetingUrl
      ? `<p style="margin:4px 0 0;font-size:13px;">🌐 <strong>Online workshop</strong> — <a href="${escHtml(opts.meetingUrl)}" style="color:#f59e0b;word-break:break-all;">${escHtml(opts.meetingUrl)}</a></p>`
      : `<p style="margin:4px 0 0;font-size:12px;color:#4ade80;">🌐 Online workshop — the artist will share the meeting link shortly.</p>`
    : opts?.location
      ? `<p style="margin:4px 0 0;font-size:12px;color:#78716c;">📍 ${escHtml(opts.location)}</p>`
      : calParams?.location
        ? `<p style="margin:4px 0 0;font-size:12px;color:#78716c;">📍 ${escHtml(calParams.location)}</p>`
        : "";

  const calendarLinks = (gcalUrl || icsUrl) ? `
    <div style="margin-top:16px;">
      <p style="margin:0 0 10px;font-size:13px;color:#a8a29e;">Add this workshop to your calendar:</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        ${gcalUrl ? `<a href="${gcalUrl}" style="display:inline-block;background:#3b82f6;color:#fff;padding:8px 18px;border-radius:20px;text-decoration:none;font-size:13px;font-weight:bold;">📅 Google Calendar</a>` : ""}
        ${icsUrl ? `<a href="${icsUrl}" style="display:inline-block;background:#444039;color:#d6d3d1;padding:8px 18px;border-radius:20px;text-decoration:none;font-size:13px;font-weight:bold;border:1px solid #57534e;">🍎 Apple Calendar (.ics)</a>` : ""}
      </div>
    </div>` : "";

  return shell(`
    <h1 style="color:#f59e0b;font-size:22px;margin-bottom:4px;">Workshop Booking Confirmed</h1>
    ${card(`
      <p style="margin:0 0 8px;"><strong>${escHtml(workshopTitle)}</strong></p>
      <p style="margin:0 0 8px;">with <strong style="color:#fcd34d;">${escHtml(artistName)}</strong></p>
      <p style="margin:0 0 4px;color:#78716c;">${startDate}</p>
      ${locationLine}
      ${calendarLinks}
    `)}
    ${btn(`${BASE_URL}/workshops`, "View Workshop")}
  `);
}

export interface WorkshopReminderOptions {
  isOnline?: boolean;
  location?: string | null;
  meetingUrl?: string | null;
  unsubscribeToken?: string | null;
  bookingUnsubscribeToken?: string | null;
}

export function workshopReminderEmail(
  workshopTitle: string,
  artistName: string,
  startDate: string,
  workshopId: string,
  opts?: WorkshopReminderOptions,
  calParams?: WorkshopCalendarParams,
): string {
  const locationLine = opts?.isOnline
    ? opts.meetingUrl
      ? `<p style="margin:8px 0 0;font-size:13px;">🌐 <strong>Online workshop</strong> — <a href="${escHtml(opts.meetingUrl)}" style="color:#f59e0b;word-break:break-all;">${escHtml(opts.meetingUrl)}</a></p>`
      : `<p style="margin:8px 0 0;font-size:13px;color:#4ade80;">🌐 Online workshop — the artist will share the link shortly.</p>`
    : opts?.location
      ? `<p style="margin:8px 0 0;font-size:13px;color:#a8a29e;">📍 ${escHtml(opts.location)}</p>`
      : "";

  const gcalUrl = calParams ? buildGoogleCalendarUrl(workshopTitle, artistName, calParams) : "";
  const icsUrl = calParams?.workshopId ? `${BASE_URL.replace(/\/kiln$/, "")}/api/workshops/${calParams.workshopId}/calendar.ics` : "";

  const calendarLinks = (gcalUrl || icsUrl) ? `
    <div style="margin-top:16px;">
      <p style="margin:0 0 10px;font-size:13px;color:#a8a29e;">Add this workshop to your calendar:</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        ${gcalUrl ? `<a href="${gcalUrl}" style="display:inline-block;background:#3b82f6;color:#fff;padding:8px 18px;border-radius:20px;text-decoration:none;font-size:13px;font-weight:bold;">📅 Google Calendar</a>` : ""}
        ${icsUrl ? `<a href="${icsUrl}" style="display:inline-block;background:#444039;color:#d6d3d1;padding:8px 18px;border-radius:20px;text-decoration:none;font-size:13px;font-weight:bold;border:1px solid #57534e;">🍎 Apple Calendar (.ics)</a>` : ""}
      </div>
    </div>` : "";

  const apiBase = BASE_URL.replace(/\/kiln$/, "");
  const bookingUnsubLink = opts?.bookingUnsubscribeToken
    ? `<a href="${apiBase}/api/unsubscribe/workshop-booking?token=${encodeURIComponent(opts.bookingUnsubscribeToken)}" style="color:#78716c;">Don't remind me for this workshop</a>`
    : "";
  const globalUnsubLink = opts?.unsubscribeToken
    ? `<a href="${apiBase}/api/unsubscribe/workshop-reminders?token=${encodeURIComponent(opts.unsubscribeToken)}" style="color:#57534e;">Don't remind me for any workshops</a>`
    : `<a href="${BASE_URL}/settings" style="color:#78716c;">Manage notification preferences</a>`;
  const unsubscribeLink = bookingUnsubLink
    ? `${bookingUnsubLink} &nbsp;·&nbsp; ${globalUnsubLink}`
    : globalUnsubLink;

  return shell(`
    <h1 style="color:#f59e0b;font-size:22px;margin-bottom:4px;">Your workshop is tomorrow!</h1>
    <p style="color:#78716c;margin-bottom:0;">A friendly reminder that you have a workshop booked for tomorrow.</p>
    ${card(`
      <p style="margin:0 0 8px;font-size:16px;"><strong>${escHtml(workshopTitle)}</strong></p>
      <p style="margin:0 0 8px;">with <strong style="color:#fcd34d;">${escHtml(artistName)}</strong></p>
      <p style="margin:0;color:#78716c;">${escHtml(startDate)}</p>
      ${locationLine}
      ${calendarLinks}
    `)}
    ${btn(`${BASE_URL}/workshops/book/${escHtml(workshopId)}`, "View Workshop Details")}
    <p style="margin-top:20px;font-size:12px;color:#57534e;">${unsubscribeLink}</p>
  `);
}

export interface ManualPayoutReceiptItem {
  title: string;
  quantity: number;
  priceCents?: number;
  artistName?: string;
}

export interface PerArtistShippingLine {
  artistName: string;
  amountCents: number;
}

export function manualPayoutReceiptEmail(
  sessionId: string,
  amountTotalCents: number,
  items: ManualPayoutReceiptItem[],
  processingWindowDays?: number | null,
  orderId?: string | null,
  shippingAddress?: string | null,
  perArtistShipping?: PerArtistShippingLine[] | null,
  cartSessionKey?: string | null,
): string {
  const itemRows = items
    .map(
      (item) => {
        const lineTotal = item.priceCents != null
          ? item.priceCents * item.quantity
          : null;
        const priceStr = item.priceCents != null
          ? `$${(item.priceCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
          : null;
        const lineTotalStr = lineTotal != null
          ? `$${(lineTotal / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
          : null;

        return `<div style="display:flex;justify-content:space-between;align-items:baseline;margin:0 0 8px;gap:12px;">
          <div>
            <strong>${escHtml(item.title)}</strong>
            ${item.artistName ? `<span style="color:#78716c;font-size:12px;display:block;">by ${escHtml(item.artistName)}</span>` : ""}
            <span style="color:#78716c;font-size:12px;">Qty: ${item.quantity}${priceStr ? ` &times; ${priceStr}` : ""}</span>
          </div>
          ${lineTotalStr ? `<span style="white-space:nowrap;color:#fcd34d;font-weight:bold;">${lineTotalStr}</span>` : `<span style="white-space:nowrap;color:#fcd34d;font-weight:bold;">${priceStr ?? ""}</span>`}
        </div>`;
      }
    )
    .join("");

  const shippingLines = perArtistShipping ?? [];
  const totalShippingCents = shippingLines.reduce((sum, s) => sum + s.amountCents, 0);
  const hasMultiArtistShipping = shippingLines.length >= 2;

  const shippingSection = shippingLines.length > 0
    ? (() => {
        if (hasMultiArtistShipping) {
          const perArtistRows = shippingLines
            .map(
              (s) =>
                `<div style="display:flex;justify-content:space-between;align-items:baseline;margin:0 0 6px;gap:12px;">
                  <span style="color:#a8a29e;font-size:13px;">Shipping — ${escHtml(s.artistName)}</span>
                  <span style="white-space:nowrap;color:#d6d3d1;font-size:13px;">${s.amountCents === 0 ? "Free" : `$${(s.amountCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}</span>
                </div>`,
            )
            .join("");
          return `
            <div style="margin:12px 0 0;padding-top:12px;border-top:1px solid #3c3835;">
              ${perArtistRows}
              <div style="display:flex;justify-content:space-between;align-items:baseline;margin:6px 0 0;padding-top:6px;border-top:1px solid #3c3835;">
                <span style="color:#a8a29e;font-size:13px;font-weight:bold;">Combined shipping</span>
                <span style="white-space:nowrap;color:#d6d3d1;font-size:13px;font-weight:bold;">${totalShippingCents === 0 ? "Free" : `$${(totalShippingCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}</span>
              </div>
            </div>`;
        }
        const single = shippingLines[0];
        return `
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin:8px 0 0;gap:12px;">
            <span style="color:#a8a29e;font-size:13px;">Shipping</span>
            <span style="white-space:nowrap;color:#d6d3d1;font-size:13px;">${single.amountCents === 0 ? "Free" : `$${(single.amountCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}</span>
          </div>`;
      })()
    : "";

  return shell(`
    <h1 style="color:#f59e0b;font-size:22px;margin-bottom:4px;">Order Confirmed</h1>
    <p style="color:#78716c;margin-bottom:0;">Your payment was received. Here's your receipt.</p>
    ${card(`
      <p style="margin:0 0 12px;font-size:12px;color:#78716c;">Order ref: <code style="color:#d6d3d1;">${escHtml(sessionId)}</code></p>
      ${itemRows}
      ${shippingSection}
      <p style="margin:12px 0 0;font-size:16px;border-top:1px solid #3c3835;padding-top:12px;">
        Total: <strong style="color:#fcd34d;">$${(amountTotalCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong>
      </p>
    `)}
    ${shippingAddress ? card(`
      <p style="margin:0 0 10px;font-size:14px;color:#fcd34d;font-weight:bold;">Shipping address</p>
      <p style="margin:0;color:#d6d3d1;white-space:pre-line;line-height:1.6;">${escHtml(shippingAddress)}</p>
    `) : ''}
    ${card(`
      <p style="margin:0 0 8px;color:#fcd34d;font-weight:bold;">What happens next?</p>
      <p style="margin:0;color:#d6d3d1;">This order is fulfilled directly by the artist. They will contact you with shipping details and a tracking number once your item is on its way.</p>
      ${processingWindowDays != null
        ? `<p style="margin:8px 0 0;color:#a8a29e;font-size:13px;">The artist typically processes orders within <strong style="color:#d6d3d1;">${processingWindowDays} business day${processingWindowDays === 1 ? '' : 's'}</strong>.</p>`
        : ''}
    `)}
    ${btn(
      cartSessionKey
        ? `${BASE_URL}/orders/cart/${encodeURIComponent(cartSessionKey)}`
        : orderId
          ? `${BASE_URL}/orders/${orderId}`
          : `${BASE_URL}/orders`,
      "View your receipt",
    )}
  `);
}

export function newSaleEmail(
  buyerName: string,
  buyerEmail: string,
  sessionId: string,
  amountTotalCents: number,
  items: ManualPayoutReceiptItem[],
  orderId?: string | null,
  buyerHandle?: string | null,
  buyerId?: string | null,
  shippingCents?: number | null,
): string {
  const itemRows = items
    .map(
      (item) =>
        `<p style="margin:0 0 6px;">
          <strong>${escHtml(item.title)}</strong>
          ${item.quantity > 1 ? ` &times; ${item.quantity}` : ""}
        </p>`,
    )
    .join("");

  const buyerProfileUrl = buyerHandle
    ? `${BASE_URL}/artists/${encodeURIComponent(buyerHandle)}`
    : buyerId
      ? `${BASE_URL}/artists/${encodeURIComponent(buyerId)}`
      : null;

  const buyerNameHtml = buyerProfileUrl
    ? `<a href="${buyerProfileUrl}" style="color:#fcd34d;text-decoration:none;font-weight:bold;">${escHtml(buyerName || "A buyer")}</a>`
    : `<strong>${escHtml(buyerName || "A buyer")}</strong>`;

  const shippingLine = shippingCents !== null && shippingCents !== undefined
    ? `<p style="margin:6px 0 0;font-size:14px;color:#a8a29e;">Shipping charged: <strong style="color:#d6d3d1;">${shippingCents === 0 ? "Free shipping" : `$${(shippingCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}</strong></p>`
    : "";

  return shell(`
    <h1 style="color:#f59e0b;font-size:22px;margin-bottom:4px;">New Sale! 🎉</h1>
    <p style="color:#78716c;margin-bottom:0;">Someone just purchased your work on Kiln.</p>
    ${card(`
      <p style="margin:0 0 8px;font-size:14px;color:#fcd34d;font-weight:bold;">Buyer</p>
      <p style="margin:0 0 4px;">${buyerNameHtml}</p>
      <p style="margin:0;color:#78716c;">${escHtml(buyerEmail)}</p>
      ${buyerProfileUrl ? `<p style="margin:4px 0 0;font-size:12px;"><a href="${buyerProfileUrl}" style="color:#a8a29e;text-decoration:none;">View buyer profile →</a></p>` : ""}
    `)}
    ${card(`
      <p style="margin:0 0 10px;font-size:14px;color:#fcd34d;font-weight:bold;">Items ordered</p>
      ${itemRows}
      ${shippingLine}
      <p style="margin:12px 0 0;font-size:16px;border-top:1px solid #3c3835;padding-top:12px;">
        Total: <strong style="color:#fcd34d;">$${(amountTotalCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong>
      </p>
      <p style="margin:8px 0 0;font-size:12px;color:#78716c;">Order ref: <code style="color:#d6d3d1;">${escHtml(sessionId)}</code></p>
    `)}
    ${card(`
      <p style="margin:0 0 8px;color:#fcd34d;font-weight:bold;">Next steps</p>
      <p style="margin:0;color:#d6d3d1;">Contact the buyer at the email above to confirm their shipping address and send tracking once the item is on its way.</p>
    `)}
    ${btn(orderId ? `${BASE_URL}/earnings/orders/${orderId}` : `${BASE_URL}/earnings`, "View order")}
  `);
}

export function newWorkshopBookingArtistEmail(
  buyerName: string,
  buyerEmail: string,
  workshopTitle: string,
  amountCents: number,
  calParams?: WorkshopCalendarParams,
  buyerHandle?: string | null,
  buyerId?: string | null,
): string {
  const gcalUrl = calParams ? buildGoogleCalendarUrl(workshopTitle, buyerName, calParams) : "";
  const icsUrl = calParams?.workshopId ? `${BASE_URL.replace(/\/kiln$/, "")}/api/workshops/${calParams.workshopId}/calendar.ics` : "";

  const calendarLinks = (gcalUrl || icsUrl) ? `
    <div style="margin-top:16px;">
      <p style="margin:0 0 10px;font-size:13px;color:#a8a29e;">Add this workshop to your calendar:</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        ${gcalUrl ? `<a href="${gcalUrl}" style="display:inline-block;background:#3b82f6;color:#fff;padding:8px 18px;border-radius:20px;text-decoration:none;font-size:13px;font-weight:bold;">📅 Google Calendar</a>` : ""}
        ${icsUrl ? `<a href="${icsUrl}" style="display:inline-block;background:#444039;color:#d6d3d1;padding:8px 18px;border-radius:20px;text-decoration:none;font-size:13px;font-weight:bold;border:1px solid #57534e;">🍎 Apple Calendar (.ics)</a>` : ""}
      </div>
    </div>` : "";

  const buyerProfileUrl = buyerHandle
    ? `${BASE_URL}/artists/${encodeURIComponent(buyerHandle)}`
    : buyerId
      ? `${BASE_URL}/artists/${encodeURIComponent(buyerId)}`
      : null;

  const buyerNameHtml = buyerProfileUrl
    ? `<a href="${buyerProfileUrl}" style="color:#fcd34d;text-decoration:none;font-weight:bold;">${escHtml(buyerName || "A student")}</a>`
    : `<strong>${escHtml(buyerName || "A student")}</strong>`;

  return shell(`
    <h1 style="color:#f59e0b;font-size:22px;margin-bottom:4px;">New Workshop Booking! 🎓</h1>
    <p style="color:#78716c;margin-bottom:0;">A student just booked a seat in your workshop.</p>
    ${card(`
      <p style="margin:0 0 8px;font-size:14px;color:#fcd34d;font-weight:bold;">Workshop</p>
      <p style="margin:0 0 12px;"><strong>${escHtml(workshopTitle)}</strong></p>
      <p style="margin:0 0 8px;font-size:14px;color:#fcd34d;font-weight:bold;">Student</p>
      <p style="margin:0 0 4px;">${buyerNameHtml}</p>
      <p style="margin:0;color:#78716c;">${escHtml(buyerEmail)}</p>
      ${buyerProfileUrl ? `<p style="margin:4px 0 0;font-size:12px;"><a href="${buyerProfileUrl}" style="color:#a8a29e;text-decoration:none;">View student profile →</a></p>` : ""}
      ${calendarLinks}
    `)}
    ${amountCents > 0 ? card(`
      <p style="margin:0 0 8px;font-size:14px;color:#fcd34d;font-weight:bold;">Payment received</p>
      <p style="margin:0;font-size:18px;"><strong style="color:#fcd34d;">$${(amountCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></p>
    `) : ""}
    ${btn(calParams?.workshopId ? `${BASE_URL}/workshops/${calParams.workshopId}` : `${BASE_URL}/workshops`, "View Workshop")}
  `);
}

export function commissionPaymentEmail(
  clientName: string,
  clientEmail: string,
  commissionId: string,
  workType: string,
  milestone: string,
  amountCents: number,
): string {
  const milestoneLabel = milestone === 'deposit' ? 'Deposit' : milestone === 'final' ? 'Final Payment' : milestone;
  return shell(`
    <h1 style="color:#f59e0b;font-size:22px;margin-bottom:4px;">Commission Payment Received! 💰</h1>
    <p style="color:#78716c;margin-bottom:0;">A payment has been made on your commission.</p>
    ${card(`
      <p style="margin:0 0 8px;font-size:14px;color:#fcd34d;font-weight:bold;">Commission</p>
      <p style="margin:0 0 4px;"><strong>${escHtml(workType || 'Custom work')}</strong></p>
      <p style="margin:0 0 12px;color:#78716c;font-size:12px;">Ref: ${escHtml(commissionId)}</p>
      <p style="margin:0 0 8px;font-size:14px;color:#fcd34d;font-weight:bold;">Client</p>
      <p style="margin:0 0 4px;"><strong>${escHtml(clientName)}</strong></p>
      <p style="margin:0;color:#78716c;">${escHtml(clientEmail)}</p>
    `)}
    ${card(`
      <p style="margin:0 0 8px;font-size:14px;color:#fcd34d;font-weight:bold;">${escHtml(milestoneLabel)} received</p>
      <p style="margin:0;font-size:18px;"><strong style="color:#fcd34d;">$${(amountCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></p>
    `)}
    ${btn(`${BASE_URL}/commissions`, "View Commission")}
  `);
}

export function welcomeEmail(firstName: string | null): string {
  const name = firstName ? escHtml(firstName) : "there";
  return shell(`
    <h1 style="color:#f59e0b;font-size:22px;margin-bottom:4px;">Welcome to Kiln 🔥</h1>
    <p style="color:#d6d3d1;">Hi ${name} — you're in. Kiln is the creator platform built exclusively for craft artists.</p>
    ${card(`
      <p style="margin:0 0 12px;color:#fcd34d;font-weight:bold;">Get started in 3 steps:</p>
      <p style="margin:0 0 8px;">1. <strong>Set up your profile</strong> — add your discipline, location, and a short bio so collectors can find you.</p>
      <p style="margin:0 0 8px;">2. <strong>Post your first process video</strong> — show how you make your work. This is your shop window.</p>
      <p style="margin:0;">3. <strong>Add a listing</strong> — price a finished piece and connect it to your video.</p>
    `)}
    ${btn(`${BASE_URL}/`, "Set up your profile")}
  `);
}

export function broadcastEmail(messageBody: string): string {
  const paragraphs = messageBody
    .split(/\n{2,}/)
    .map((block) => escHtml(block.trim()).replace(/\n/g, "<br/>"))
    .filter((block) => block.length > 0)
    .map((block) => `<p style="margin:0 0 12px;color:#d6d3d1;">${block}</p>`)
    .join("");
  return shell(`
    <h1 style="color:#f59e0b;font-size:22px;margin-bottom:12px;">Kiln 🔥</h1>
    ${paragraphs}
    ${btn(`${BASE_URL}/`, "Open Kiln")}
  `);
}

export function onboardingDay3Email(firstName: string | null): string {
  const name = firstName ? escHtml(firstName) : "there";
  return shell(`
    <h1 style="color:#f59e0b;font-size:22px;margin-bottom:4px;">One more thing, ${name}</h1>
    <p style="color:#78716c;">Two revenue streams most artists on Kiln set up in their first week:</p>
    ${card(`
      <p style="margin:0 0 8px;color:#fcd34d;font-weight:bold;">Workshop Booking</p>
      <p style="margin:0;">Add a workshop and students can book and pay directly — no Calendly or separate payment link needed. Takes about 5 minutes to set up.</p>
    `)}
    ${btn(`${BASE_URL}/workshops/new`, "Add a workshop")}
    ${card(`
      <p style="margin:0 0 8px;color:#fcd34d;font-weight:bold;">Patron Tiers</p>
      <p style="margin:0;">Create a $5–$25/month supporter tier. Even 10 patrons covers your materials budget for the month.</p>
    `)}
    ${btn(`${BASE_URL}/settings`, "Set up patron tiers")}
  `);
}

export function onboardingDay7Email(firstName: string | null): string {
  const name = firstName ? escHtml(firstName) : "there";
  return shell(`
    <h1 style="color:#f59e0b;font-size:22px;margin-bottom:4px;">Your first week on Kiln</h1>
    <p style="color:#78716c;">Hi ${name} — here are three things worth knowing after your first week:</p>
    ${card(`
      <p style="margin:0 0 8px;color:#fcd34d;font-weight:bold;">Guilds</p>
      <p style="margin:0;">Join your technique guild (ceramics, glass, fiber, metal, wood) to connect with artists in your discipline, get critique, and find collaborators.</p>
    `)}
    ${btn(`${BASE_URL}/guilds`, "Find your guild")}
    ${card(`
      <p style="margin:0 0 8px;color:#fcd34d;font-weight:bold;">AI Grant Writer</p>
      <p style="margin:0;">Kiln has a built-in AI grant writer that drafts applications for real craft residencies and grants. Try it with your artist statement.</p>
    `)}
    ${btn(`${BASE_URL}/grant-writer`, "Try the grant writer")}
    ${card(`
      <p style="margin:0 0 8px;color:#fcd34d;font-weight:bold;">Opportunities Board</p>
      <p style="margin:0;">Browse open residencies, grants, and fellowships curated for craft artists — updated weekly.</p>
    `)}
    ${btn(`${BASE_URL}/opportunities`, "Browse opportunities")}
  `);
}

export function weeklyDigestEmail(stats: {
  newArtistCount: number;
  activeDropCount: number;
  upcomingWorkshopCount: number;
}): string {
  return shell(`
    <h1 style="color:#f59e0b;font-size:22px;margin-bottom:4px;">This week on Kiln 🔥</h1>
    <p style="color:#78716c;">What's happening in the craft community right now.</p>
    ${card(`
      <div style="display:flex;gap:24px;flex-wrap:wrap;">
        <div style="text-align:center;min-width:80px;">
          <div style="font-size:28px;font-weight:bold;color:#fcd34d;">${stats.newArtistCount}</div>
          <div style="font-size:12px;color:#78716c;">new artists</div>
        </div>
        <div style="text-align:center;min-width:80px;">
          <div style="font-size:28px;font-weight:bold;color:#fcd34d;">${stats.activeDropCount}</div>
          <div style="font-size:12px;color:#78716c;">active drops</div>
        </div>
        <div style="text-align:center;min-width:80px;">
          <div style="font-size:28px;font-weight:bold;color:#fcd34d;">${stats.upcomingWorkshopCount}</div>
          <div style="font-size:12px;color:#78716c;">upcoming workshops</div>
        </div>
      </div>
    `)}
    ${btn(`${BASE_URL}/`, "See what's new")}
    ${card(`
      <p style="margin:0 0 8px;color:#fcd34d;font-weight:bold;">Discover this week</p>
      <p style="margin:0 0 6px;">• Browse new process videos in the feed</p>
      <p style="margin:0 0 6px;">• Check the Drops page for limited-edition releases</p>
      <p style="margin:0;">• Find a workshop to book or a guild to join</p>
    `)}
    ${btn(`${BASE_URL}/discover`, "Discover artists")}
  `);
}

export function packingSlipEmail(opts: {
  orderTitle: string;
  orderId: string;
  refNum: string;
  dateStr: string;
  statusLabel: string;
  quantity: number;
  amount: number;
  shippingAddress: string | null;
  trackingNumber: string | null;
  processingWindow: string | null;
  notes: string | null;
  sellerName: string | null;
}): string {
  const orderUrl = `${BASE_URL}/orders/${opts.orderId}`;

  const qty = opts.quantity ?? 1;
  const unitPrice = qty > 1
    ? (opts.amount / qty).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
    : null;
  const totalStr = opts.amount.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  const shippingHtml = opts.shippingAddress
    ? `<p style="margin:4px 0 0;font-size:12px;color:#a8a29e;white-space:pre-line;">${escHtml(opts.shippingAddress)}</p>`
    : "";

  const trackingHtml = opts.trackingNumber
    ? `<p style="margin:12px 0 0;font-size:12px;color:#a8a29e;">Tracking: <strong style="color:#d6d3d1;font-family:monospace;">${escHtml(opts.trackingNumber)}</strong></p>`
    : "";

  const windowHtml = opts.processingWindow
    ? `<p style="margin:8px 0 0;font-size:12px;color:#a8a29e;">${escHtml(opts.processingWindow)}</p>`
    : "";

  const notesHtml = opts.notes
    ? `<p style="margin:12px 0 0;font-size:12px;color:#a8a29e;">Note: <span style="color:#d6d3d1;">${escHtml(opts.notes)}</span></p>`
    : "";

  const sellerLine = opts.sellerName
    ? `<p style="margin:0;color:#78716c;font-size:13px;">Sent by <strong style="color:#a8a29e;">${escHtml(opts.sellerName)}</strong></p>`
    : `<p style="margin:0;color:#78716c;font-size:13px;">Your seller has sent you a packing slip for this order.</p>`;

  return shell(`
    <h1 style="color:#f59e0b;font-size:22px;margin-bottom:4px;">Packing slip enclosed 📦</h1>
    ${sellerLine}
    ${card(`
      <p style="margin:0 0 4px;font-size:15px;"><strong>${escHtml(opts.orderTitle)}</strong></p>
      <p style="margin:0;font-size:12px;color:#78716c;">Ref: <span style="font-family:monospace;color:#a8a29e;">${escHtml(opts.refNum)}</span> &middot; ${escHtml(opts.dateStr)} &middot; ${escHtml(opts.statusLabel)}</p>
      <p style="margin:10px 0 0;font-size:13px;color:#d6d3d1;">
        ${qty > 1 ? `Qty ${qty} &times; ${escHtml(unitPrice!)} = ` : ""}<strong>${escHtml(totalStr)}</strong>
      </p>
      ${shippingHtml}
      ${trackingHtml}
      ${windowHtml}
      ${notesHtml}
    `)}
    ${btn(orderUrl, "View your order")}
  `);
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
