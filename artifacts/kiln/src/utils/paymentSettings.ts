export const PAYMENT_KEY = "kiln_payment_settings_v1";

export interface ArtistPayments {
  stripeLink: string;
  venmo: string;
  cashapp: string;
  paypalMe: string;
  notes: string;
  /** Processing window in business days for manually-paid orders */
  processingWindow?: number;
  /** Free-text delivery estimate shown to buyers (e.g. "2–3 weeks after firing") */
  processingWindowLabel?: string;
}

export const EMPTY_PAYMENTS: ArtistPayments = {
  stripeLink: "",
  venmo: "",
  cashapp: "",
  paypalMe: "",
  notes: "",
  processingWindow: undefined,
  processingWindowLabel: undefined,
};

export function readPaymentSettings(): ArtistPayments {
  try {
    return { ...EMPTY_PAYMENTS, ...JSON.parse(localStorage.getItem(PAYMENT_KEY) ?? "{}") };
  } catch {
    return { ...EMPTY_PAYMENTS };
  }
}

export function savePaymentSettings(p: ArtistPayments) {
  try { localStorage.setItem(PAYMENT_KEY, JSON.stringify(p)); } catch {}
}

export function hasAnyPaymentMethod(p: ArtistPayments) {
  return !!(p.stripeLink || p.venmo || p.cashapp || p.paypalMe);
}

/**
 * Derives a buyer-friendly delivery estimate label from a numeric day count.
 * Returns the custom label unchanged if provided, otherwise generates
 * "within 1 business day" / "within N business days" from the day count.
 * Returns null when neither value is set.
 */
export function formatProcessingWindowLabel(
  days: number | null | undefined,
  label: string | null | undefined,
): string | null {
  if (label && label.trim()) return label.trim();
  if (days == null) return null;
  return days === 1 ? "within 1 business day" : `within ${days} business days`;
}

// Build a Venmo payment URL with pre-filled amount and note
export function venmoUrl(handle: string, amount: number, note: string) {
  const h = handle.startsWith("@") ? handle.slice(1) : handle;
  return `https://venmo.com/${h}?txn=pay&amount=${amount.toFixed(2)}&note=${encodeURIComponent(note)}`;
}

// Build a Cash App URL
export function cashAppUrl(tag: string, amount: number, note: string) {
  const t = tag.startsWith("$") ? tag.slice(1) : tag;
  return `https://cash.app/$${t}/${amount.toFixed(0)}?note=${encodeURIComponent(note)}`;
}

// Build a PayPal.me URL
export function paypalMeUrl(username: string, amount: number) {
  const u = username.replace(/^paypal\.me\//i, "");
  return `https://paypal.me/${u}/${amount.toFixed(2)}`;
}
