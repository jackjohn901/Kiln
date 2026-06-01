// ─── PAIRED WITH artifacts/api-server/src/lib/receiptPdf.ts ──────────────────
// This file builds the client-side print/browser receipt (HTML).
// `receiptPdf.ts` builds the server-side downloadable PDF.
// Both implement the SAME layout. When you add, remove, or rename a section
// here, mirror the change in receiptPdf.ts — and vice versa.
//
// SECTION CHECKLIST (must be present in both templates):
//   1. Header            — Kiln logo | receipt number + title
//   2. Meta row          — Date | Status | Order type   (omit Status/Type when unavailable)
//   3. Line items table  — title, optional description, optional qty × unit price, price
//   4. Total             — right-aligned bold amount
//   5. Billed to         — buyerName + buyerAddress
//   6. Processing time   — processingWindow text
//   7. Tracking          — trackingNumber
//   8. Notes             — buyer-supplied or order notes
//   9. Receipt emailed to — buyerEmail
//  10. Footer            — thank-you line + support URL
// ─────────────────────────────────────────────────────────────────────────────

// ─── Shared ID formatters (mirror receiptPdf.ts exports) ────────────────────
export function ordinalId(id: string): string {
  return "KLN-" + id.slice(0, 8).toUpperCase();
}

export function sessionReceiptId(sessionKey: string): string {
  return "KLN-CART-" + sessionKey.slice(-6).toUpperCase();
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ReceiptHtmlLine {
  title: string;
  description?: string | null;
  /** Amount in dollars (not cents). */
  amount: number;
  quantity?: number | null;
}

export interface ReceiptHtmlData {
  refNum: string;
  receiptTitle: string;
  dateStr: string;
  /** Omit or pass null when the status is not available (e.g. CartSuccess). */
  statusLabel?: string | null;
  /** Omit or pass null when the type is not available (e.g. CartSuccess). */
  typeLabel?: string | null;
  lines: ReceiptHtmlLine[];
  /** Total in dollars. */
  total: number;
  /** Price formatter. Defaults to USD with 2 decimal places (matches the PDF). */
  formatPrice?: (dollars: number) => string;
  buyerName?: string | null;
  buyerAddress?: string | null;
  buyerEmail?: string | null;
  trackingNumber?: string | null;
  processingWindow?: string | null;
  notes?: string | null;
}

// ─── Builder ─────────────────────────────────────────────────────────────────

function esc(text: string | null | undefined): string {
  if (text == null) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const DEFAULT_FORMAT_PRICE = (dollars: number) =>
  dollars.toLocaleString("en-US", { style: "currency", currency: "USD" });

/**
 * Returns a full `<!DOCTYPE html>…</html>` string for the print / browser
 * receipt window. The structure mirrors `buildReceiptPdf` in
 * `artifacts/api-server/src/lib/receiptPdf.ts` — keep both in sync.
 */
export function buildReceiptHtml(data: ReceiptHtmlData): string {
  const fmt = data.formatPrice ?? DEFAULT_FORMAT_PRICE;

  // ── Section 3: Line items ─────────────────────────────────────────────────
  const lineItems = data.lines
    .map((item) => {
      const qty = item.quantity ?? 1;
      const unitPrice = qty > 1 ? item.amount / qty : item.amount;
      const qtyNote =
        qty > 1
          ? `<br><span style="font-size:11px;color:#8a7e74;">Qty: ${qty} &times; ${esc(fmt(unitPrice))}</span>`
          : "";
      const descNote = item.description
        ? `<br><span style="font-size:11px;color:#8a7e74;">${esc(item.description)}</span>`
        : "";
      return `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #e7e3dc;font-size:13px;color:#2c2621;">${esc(item.title)}${descNote}${qtyNote}</td>
        <td style="padding:10px 0;border-bottom:1px solid #e7e3dc;text-align:right;font-size:13px;font-weight:600;color:#2c2621;white-space:nowrap;">${esc(fmt(item.amount))}</td>
      </tr>`;
    })
    .join("");

  // ── Section 2: Meta row ───────────────────────────────────────────────────
  const hasStatus = data.statusLabel != null;
  const hasType   = data.typeLabel   != null;
  const metaRow = hasStatus || hasType
    ? `
  <div style="display:flex;justify-content:space-between;margin-bottom:28px;gap:24px;">
    <div>
      <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8a7e74;margin-bottom:4px;">Date</p>
      <p style="font-size:13px;">${esc(data.dateStr)}</p>
    </div>
    ${hasStatus ? `<div>
      <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8a7e74;margin-bottom:4px;">Status</p>
      <p style="font-size:13px;">${esc(data.statusLabel!)}</p>
    </div>` : ""}
    ${hasType ? `<div style="text-align:right;">
      <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8a7e74;margin-bottom:4px;">Order type</p>
      <p style="font-size:13px;">${esc(data.typeLabel!)}</p>
    </div>` : ""}
  </div>`
    : `
  <div style="margin-bottom:28px;">
    <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8a7e74;margin-bottom:4px;">Date</p>
    <p style="font-size:13px;">${esc(data.dateStr)}</p>
  </div>`;

  // ── Section 4: Total ──────────────────────────────────────────────────────
  const totalBlock = `
  <div style="display:flex;justify-content:flex-end;padding-top:12px;border-top:2px solid #2c2621;margin-top:4px;">
    <div style="text-align:right;">
      <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8a7e74;margin-bottom:4px;">Total</p>
      <p style="font-size:20px;font-weight:700;">${esc(fmt(data.total))}</p>
    </div>
  </div>`;

  // ── Section 5: Billed to ──────────────────────────────────────────────────
  const buyerRow =
    data.buyerName || data.buyerAddress
      ? `
  <div style="margin-top:24px;">
    <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8a7e74;margin:0 0 6px;">Billed to</p>
    ${data.buyerName ? `<p style="font-size:13px;font-weight:600;color:#2c2621;margin:0 0 2px;">${esc(data.buyerName)}</p>` : ""}
    ${data.buyerAddress ? `<p style="font-size:12px;color:#8a7e74;white-space:pre-line;margin:0;">${esc(data.buyerAddress)}</p>` : ""}
  </div>`
      : "";

  // ── Section 6: Processing time ────────────────────────────────────────────
  const processingRow = data.processingWindow
    ? `
  <div style="margin-top:16px;">
    <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8a7e74;margin:0 0 6px;">Processing time</p>
    <p style="font-size:13px;color:#2c2621;margin:0;">${esc(data.processingWindow)}</p>
  </div>`
    : "";

  // ── Section 7: Tracking ───────────────────────────────────────────────────
  const trackingRow = data.trackingNumber
    ? `
  <div style="margin-top:16px;">
    <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8a7e74;margin:0 0 6px;">Tracking</p>
    <p style="font-size:13px;color:#2c2621;margin:0;font-family:monospace;">${esc(data.trackingNumber)}</p>
  </div>`
    : "";

  // ── Section 8: Notes ──────────────────────────────────────────────────────
  const notesRow = data.notes
    ? `
  <div style="margin-top:16px;">
    <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8a7e74;margin:0 0 6px;">Notes</p>
    <p style="font-size:13px;color:#2c2621;margin:0;">${esc(data.notes)}</p>
  </div>`
    : "";

  // ── Section 9: Receipt emailed to ────────────────────────────────────────
  const emailRow = data.buyerEmail
    ? `
  <div style="margin-top:16px;">
    <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8a7e74;margin:0 0 6px;">Receipt emailed to</p>
    <p style="font-size:13px;color:#2c2621;margin:0;">${esc(data.buyerEmail)}</p>
  </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Receipt ${esc(data.refNum)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #fff; color: #2c2621; padding: 48px; max-width: 600px; margin: 0 auto; }
    @media print { body { padding: 24px; } }
  </style>
</head>
<body>
  <!-- Section 1: Header -->
  <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #2c2621;padding-bottom:20px;margin-bottom:28px;">
    <div>
      <p style="font-size:22px;font-weight:700;letter-spacing:-.01em;">Kiln</p>
      <p style="font-size:11px;color:#8a7e74;margin-top:2px;">kilnfire.replit.app</p>
    </div>
    <div style="text-align:right;">
      <p style="font-size:18px;font-weight:700;font-family:monospace;">${esc(data.refNum)}</p>
      <p style="font-size:11px;color:#8a7e74;margin-top:2px;">${esc(data.receiptTitle)}</p>
    </div>
  </div>

  <!-- Section 2: Meta row (Date / Status / Order type) -->
  ${metaRow}

  <!-- Section 3 + 4: Line items + Total -->
  <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
    <thead>
      <tr>
        <th style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8a7e74;padding-bottom:8px;border-bottom:1px solid #e7e3dc;text-align:left;">Item</th>
        <th style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8a7e74;padding-bottom:8px;border-bottom:1px solid #e7e3dc;text-align:right;">Price</th>
      </tr>
    </thead>
    <tbody>${lineItems}</tbody>
  </table>
  ${totalBlock}

  <!-- Section 5–9: Meta fields -->
  ${buyerRow}${processingRow}${trackingRow}${notesRow}${emailRow}

  <!-- Section 10: Footer -->
  <div style="margin-top:40px;padding-top:16px;border-top:1px solid #e7e3dc;text-align:center;">
    <p style="font-size:11px;color:#8a7e74;">Thank you for your purchase. Questions? Visit kilnfire.replit.app/kiln/messages</p>
  </div>
</body>
</html>`;
}
