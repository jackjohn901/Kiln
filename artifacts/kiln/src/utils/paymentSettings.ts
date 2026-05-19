export const PAYMENT_KEY = "kiln_payment_settings_v1";

export interface ArtistPayments {
  stripeLink: string;
  venmo: string;
  cashapp: string;
  paypalMe: string;
  notes: string;
  /** Processing window in business days for manually-paid orders */
  processingWindow?: number;
}

export const EMPTY_PAYMENTS: ArtistPayments = {
  stripeLink: "",
  venmo: "",
  cashapp: "",
  paypalMe: "",
  notes: "",
  processingWindow: undefined,
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
