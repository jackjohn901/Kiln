import { AlertCircle } from "lucide-react";

// Buyer-facing error notice shown when a checkout can't be completed (e.g. an item
// is no longer available). Mirrors the red AlertCircle box used on the cart success
// page so single-item and cart checkouts surface failures with one consistent look.
export default function CheckoutErrorNotice({
  message,
  heading = "Checkout couldn't be completed",
}: {
  message: string;
  heading?: string;
}) {
  return (
    <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-left">
      <div className="flex items-start gap-3">
        <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-red-300 font-semibold mb-1">{heading}</p>
          <p className="text-stone-400 leading-relaxed">{message}</p>
        </div>
      </div>
    </div>
  );
}
