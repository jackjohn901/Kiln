import { logger } from "./logger";

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

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
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

export function orderConfirmationEmail(customerEmail: string, orderId: string, amountTotal: number): string {
  return shell(`
    <h1 style="color:#f59e0b;font-size:22px;margin-bottom:4px;">Order Confirmed</h1>
    ${card(`
      <p style="margin:0 0 8px;">Your order <strong style="color:#fcd34d;">${orderId}</strong> has been placed.</p>
      <p style="margin:0 0 8px;">Amount: <strong style="color:#fcd34d;">$${(amountTotal / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong></p>
      <p style="margin:0;color:#78716c;">The artist will reach out within 2–3 business days with shipping details.</p>
    `)}
    ${btn(`${BASE_URL}/orders`, "View Orders")}
  `);
}

export function workshopBookingEmail(workshopTitle: string, artistName: string, startDate: string): string {
  return shell(`
    <h1 style="color:#f59e0b;font-size:22px;margin-bottom:4px;">Workshop Booking Confirmed</h1>
    ${card(`
      <p style="margin:0 0 8px;"><strong>${workshopTitle}</strong></p>
      <p style="margin:0 0 8px;">with <strong style="color:#fcd34d;">${artistName}</strong></p>
      <p style="margin:0;color:#78716c;">${startDate}</p>
    `)}
    ${btn(`${BASE_URL}/workshops`, "View Workshop")}
  `);
}

export interface ManualPayoutReceiptItem {
  title: string;
  quantity: number;
  priceCents?: number;
  artistName?: string;
}

export function manualPayoutReceiptEmail(
  sessionId: string,
  amountTotalCents: number,
  items: ManualPayoutReceiptItem[],
  processingWindowDays?: number | null,
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

  return shell(`
    <h1 style="color:#f59e0b;font-size:22px;margin-bottom:4px;">Order Confirmed</h1>
    <p style="color:#78716c;margin-bottom:0;">Your payment was received. Here's your receipt.</p>
    ${card(`
      <p style="margin:0 0 12px;font-size:12px;color:#78716c;">Order ref: <code style="color:#d6d3d1;">${escHtml(sessionId)}</code></p>
      ${itemRows}
      <p style="margin:12px 0 0;font-size:16px;border-top:1px solid #3c3835;padding-top:12px;">
        Total: <strong style="color:#fcd34d;">$${(amountTotalCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong>
      </p>
    `)}
    ${card(`
      <p style="margin:0 0 8px;color:#fcd34d;font-weight:bold;">What happens next?</p>
      <p style="margin:0;color:#d6d3d1;">This order is fulfilled directly by the artist. They will contact you with shipping details and a tracking number once your item is on its way.</p>
      ${processingWindowDays != null
        ? `<p style="margin:8px 0 0;color:#a8a29e;font-size:13px;">The artist typically processes orders within <strong style="color:#d6d3d1;">${processingWindowDays} business day${processingWindowDays === 1 ? '' : 's'}</strong>.</p>`
        : ''}
    `)}
    ${btn(`${BASE_URL}/orders`, "View My Orders")}
  `);
}

export function newSaleEmail(
  buyerName: string,
  buyerEmail: string,
  sessionId: string,
  amountTotalCents: number,
  items: ManualPayoutReceiptItem[],
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

  return shell(`
    <h1 style="color:#f59e0b;font-size:22px;margin-bottom:4px;">New Sale! 🎉</h1>
    <p style="color:#78716c;margin-bottom:0;">Someone just purchased your work on Kiln.</p>
    ${card(`
      <p style="margin:0 0 8px;font-size:14px;color:#fcd34d;font-weight:bold;">Buyer</p>
      <p style="margin:0 0 4px;"><strong>${escHtml(buyerName || "A buyer")}</strong></p>
      <p style="margin:0;color:#78716c;">${escHtml(buyerEmail)}</p>
    `)}
    ${card(`
      <p style="margin:0 0 10px;font-size:14px;color:#fcd34d;font-weight:bold;">Items ordered</p>
      ${itemRows}
      <p style="margin:12px 0 0;font-size:16px;border-top:1px solid #3c3835;padding-top:12px;">
        Total: <strong style="color:#fcd34d;">$${(amountTotalCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong>
      </p>
      <p style="margin:8px 0 0;font-size:12px;color:#78716c;">Order ref: <code style="color:#d6d3d1;">${escHtml(sessionId)}</code></p>
    `)}
    ${card(`
      <p style="margin:0 0 8px;color:#fcd34d;font-weight:bold;">Next steps</p>
      <p style="margin:0;color:#d6d3d1;">Contact the buyer at the email above to confirm their shipping address and send tracking once the item is on its way.</p>
    `)}
    ${btn(`${BASE_URL}/earnings`, "View Earnings")}
  `);
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
