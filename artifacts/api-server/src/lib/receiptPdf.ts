import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const DARK   = rgb(0.173, 0.149, 0.129);
const MID    = rgb(0.541, 0.494, 0.455);
const RULE   = rgb(0.906, 0.890, 0.863);
const BLACK  = rgb(0,     0,     0    );

function usdDollars(dollars: number): string {
  return dollars.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function fmtDate(val: Date | string): string {
  return new Date(val).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export function ordinalId(id: string): string {
  return "KLN-" + id.slice(0, 8).toUpperCase();
}

export function sessionReceiptId(sessionKey: string): string {
  return "KLN-CART-" + sessionKey.slice(-6).toUpperCase();
}

export interface ReceiptLine {
  title:       string;
  description: string | null;
  amount:      number;
}

export interface ReceiptData {
  refNum:           string;
  receiptTitle:     string;
  dateStr:          string;
  statusLabel:      string;
  typeLabel:        string;
  lines:            ReceiptLine[];
  total:            number;
  buyerName:        string | null;
  buyerAddress:     string | null;
  buyerEmail:       string | null;
  trackingNumber:   string | null;
  processingWindow: string | null;
}

export const STATUS_LABELS: Record<string, string> = {
  pending:     "Pending",
  inquiry:     "Inquiry sent",
  in_progress: "In Progress",
  shipped:     "Shipped",
  delivered:   "Delivered",
  waitlisted:  "Waitlisted",
  confirmed:   "Confirmed",
  cancelled:   "Cancelled",
};

export const TYPE_LABELS: Record<string, string> = {
  drop:       "Drop",
  listing:    "Shop",
  commission: "Commission",
  workshop:   "Workshop",
  inquiry:    "Inquiry",
};

export async function buildReceiptPdf(data: ReceiptData): Promise<Uint8Array> {
  const doc    = await PDFDocument.create();
  const bold   = await doc.embedFont(StandardFonts.HelveticaBold);
  const normal = await doc.embedFont(StandardFonts.Helvetica);

  const page  = doc.addPage([595, 842]);
  const { width, height } = page.getSize();
  const ML = 60;
  const MR = 60;
  const CW = width - ML - MR;
  let y = height - 60;

  page.drawText("Kiln", { x: ML, y, font: bold, size: 22, color: DARK });
  page.drawText("kilnfire.replit.app", { x: ML, y: y - 14, font: normal, size: 9, color: MID });

  page.drawText(data.refNum, { x: ML + CW - bold.widthOfTextAtSize(data.refNum, 14), y, font: bold, size: 14, color: DARK });
  page.drawText(data.receiptTitle, {
    x: ML + CW - normal.widthOfTextAtSize(data.receiptTitle, 9),
    y: y - 14, font: normal, size: 9, color: MID,
  });

  y -= 30;
  page.drawLine({ start: { x: ML, y }, end: { x: ML + CW, y }, thickness: 1.5, color: BLACK });
  y -= 22;

  const colW = CW / 3;
  const metaItems = [
    { label: "Date",       value: data.dateStr },
    { label: "Status",     value: data.statusLabel },
    { label: "Order type", value: data.typeLabel },
  ];
  metaItems.forEach((item, i) => {
    const x = ML + i * colW;
    page.drawText(item.label.toUpperCase(), { x, y, font: bold, size: 7, color: MID });
    page.drawText(item.value, { x, y: y - 12, font: normal, size: 11, color: DARK });
  });

  y -= 38;
  page.drawLine({ start: { x: ML, y }, end: { x: ML + CW, y }, thickness: 0.5, color: RULE });
  y -= 14;

  page.drawText("ITEM", { x: ML, y, font: bold, size: 7, color: MID });
  page.drawText("PRICE", {
    x: ML + CW - bold.widthOfTextAtSize("PRICE", 7),
    y, font: bold, size: 7, color: MID,
  });
  y -= 6;
  page.drawLine({ start: { x: ML, y }, end: { x: ML + CW, y }, thickness: 0.5, color: RULE });
  y -= 16;

  const maxTitleWidth = CW - 70;
  for (const line of data.lines) {
    const priceStr = usdDollars(line.amount);
    const priceW   = normal.widthOfTextAtSize(priceStr, 11);

    let title = line.title;
    while (title.length > 4 && normal.widthOfTextAtSize(title, 11) > maxTitleWidth) {
      title = title.slice(0, -1);
    }
    if (title !== line.title) title = title.slice(0, -1) + "…";

    page.drawText(title, { x: ML, y, font: normal, size: 11, color: DARK });
    page.drawText(priceStr, { x: ML + CW - priceW, y, font: bold, size: 11, color: DARK });

    if (line.description) {
      y -= 13;
      let desc = line.description;
      while (desc.length > 4 && normal.widthOfTextAtSize(desc, 8) > maxTitleWidth) {
        desc = desc.slice(0, -1);
      }
      if (desc !== line.description) desc = desc.slice(0, -1) + "…";
      page.drawText(desc, { x: ML, y, font: normal, size: 8, color: MID });
    }

    y -= 10;
    page.drawLine({ start: { x: ML, y }, end: { x: ML + CW, y }, thickness: 0.5, color: RULE });
    y -= 16;
  }

  y -= 4;
  page.drawLine({ start: { x: ML, y }, end: { x: ML + CW, y }, thickness: 1.5, color: BLACK });
  y -= 18;

  const totalStr = usdDollars(data.total);
  const totalLabelW = bold.widthOfTextAtSize("TOTAL", 7);
  const totalValW   = bold.widthOfTextAtSize(totalStr, 16);
  const totalX = ML + CW - Math.max(totalLabelW, totalValW);

  page.drawText("TOTAL", { x: totalX, y, font: bold, size: 7, color: MID });
  y -= 16;
  page.drawText(totalStr, {
    x: ML + CW - totalValW, y, font: bold, size: 16, color: DARK,
  });
  y -= 32;

  function drawMeta(label: string, value: string) {
    page.drawText(label.toUpperCase(), { x: ML, y, font: bold, size: 7, color: MID });
    y -= 13;
    const words = value.split(" ");
    let lineBuf = "";
    for (const word of words) {
      const candidate = lineBuf ? `${lineBuf} ${word}` : word;
      if (normal.widthOfTextAtSize(candidate, 11) > CW) {
        page.drawText(lineBuf, { x: ML, y, font: normal, size: 11, color: DARK });
        y -= 13;
        lineBuf = word;
      } else {
        lineBuf = candidate;
      }
    }
    if (lineBuf) {
      page.drawText(lineBuf, { x: ML, y, font: normal, size: 11, color: DARK });
      y -= 13;
    }
    y -= 8;
  }

  if (data.buyerName || data.buyerAddress) {
    const billTo = [data.buyerName, data.buyerAddress].filter(Boolean).join("\n");
    drawMeta("Billed to", billTo);
  }

  if (data.processingWindow) {
    drawMeta("Processing time", data.processingWindow);
  }

  if (data.trackingNumber) {
    drawMeta("Tracking", data.trackingNumber);
  }

  if (data.buyerEmail) {
    drawMeta("Receipt emailed to", data.buyerEmail);
  }

  const footerY = 40;
  page.drawLine({ start: { x: ML, y: footerY + 14 }, end: { x: ML + CW, y: footerY + 14 }, thickness: 0.5, color: RULE });
  const footerText = "Thank you for your purchase. Questions? Visit kilnfire.replit.app/kiln/messages";
  const footerW = normal.widthOfTextAtSize(footerText, 8);
  page.drawText(footerText, {
    x: ML + (CW - footerW) / 2, y: footerY, font: normal, size: 8, color: MID,
  });

  return doc.save();
}
