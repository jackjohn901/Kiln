import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, CreditCard, Lock, Check, Package, ArrowRight, Truck, ShieldCheck } from "lucide-react";
import Nav from "@/components/Nav";
import { useCart } from "@/contexts/CartContext";
import { formatPrice } from "@/data/listings";

type Step = "address" | "payment" | "confirm" | "success";

interface AddressForm {
  name: string; email: string; phone: string;
  address: string; city: string; state: string; zip: string; country: string;
}
interface PaymentForm {
  cardName: string; cardNumber: string; expiry: string; cvv: string;
}

const EMPTY_ADDR: AddressForm = { name: "", email: "", phone: "", address: "", city: "", state: "", zip: "", country: "US" };
const EMPTY_PAY: PaymentForm = { cardName: "", cardNumber: "", expiry: "", cvv: "" };

function formatCard(v: string) {
  return v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}
function formatExpiry(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 4);
  return d.length > 2 ? d.slice(0, 2) + "/" + d.slice(2) : d;
}

export default function CartCheckout() {
  const [, navigate] = useLocation();
  const { items, subtotal, itemCount, clearCart } = useCart();
  const [step, setStep] = useState<Step>("address");
  const [addr, setAddr] = useState<AddressForm>(EMPTY_ADDR);
  const [pay, setPay] = useState<PaymentForm>(EMPTY_PAY);
  const [processing, setProcessing] = useState(false);
  const [orderId] = useState(() => "KLN-" + Math.random().toString(36).slice(2, 8).toUpperCase());

  const shipping = subtotal > 500 ? 0 : 18;
  const tax = Math.round(subtotal * 0.0875 * 100) / 100;
  const total = subtotal + shipping + tax;

  const STEPS: Step[] = ["address", "payment", "confirm", "success"];
  const stepIdx = STEPS.indexOf(step);

  function addrValid() {
    return addr.name && addr.email && addr.address && addr.city && addr.state && addr.zip;
  }
  function payValid() {
    return pay.cardName && pay.cardNumber.replace(/\s/g, "").length === 16 && pay.expiry.length === 5 && pay.cvv.length >= 3;
  }

  async function handleConfirm() {
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 1800));
    setProcessing(false);
    clearCart();
    setStep("success");
  }

  if (items.length === 0 && step !== "success") {
    return (
      <div className="min-h-screen bg-[#12100e]">
        <Nav />
        <div className="flex flex-col items-center justify-center py-32 text-center px-6">
          <Package size={40} className="text-stone-700 mb-4" />
          <p className="text-stone-400 mb-2">Your cart is empty</p>
          <Link href="/shop">
            <button className="mt-4 rounded-full bg-amber-500 px-6 py-2.5 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors">
              Browse Shop
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-3xl px-4 pb-32 pt-6">

        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          {step !== "success" && (
            <button
              onClick={() => step === "address" ? navigate("/cart") : setStep(STEPS[stepIdx - 1])}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-stone-500 hover:text-stone-300 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
          )}
          <h1 className="font-serif text-2xl text-amber-100">
            {step === "success" ? "Order Confirmed" : "Checkout"}
          </h1>
        </div>

        {/* Progress bar */}
        {step !== "success" && (
          <div className="mb-8 flex items-center gap-2">
            {(["address", "payment", "confirm"] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  stepIdx > i ? "bg-emerald-500 text-white" : stepIdx === i ? "bg-amber-500 text-stone-950" : "bg-stone-800 text-stone-500"
                }`}>
                  {stepIdx > i ? <Check size={12} /> : i + 1}
                </div>
                <span className={`text-xs capitalize ${stepIdx === i ? "text-amber-300" : "text-stone-600"}`}>
                  {s === "address" ? "Shipping" : s === "payment" ? "Payment" : "Review"}
                </span>
                {i < 2 && <div className={`flex-1 h-px ${stepIdx > i ? "bg-emerald-500/40" : "bg-stone-800"}`} />}
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main form */}
          <div className="flex-1">
            <AnimatePresence mode="wait">
              {step === "address" && (
                <motion.div key="address" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <div className="rounded-2xl border border-white/8 bg-stone-900/60 p-5 space-y-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Shipping address</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <Field label="Full name" value={addr.name} onChange={(v) => setAddr({ ...addr, name: v })} />
                      </div>
                      <Field label="Email" type="email" value={addr.email} onChange={(v) => setAddr({ ...addr, email: v })} />
                      <Field label="Phone" type="tel" value={addr.phone} onChange={(v) => setAddr({ ...addr, phone: v })} />
                      <div className="col-span-2">
                        <Field label="Street address" value={addr.address} onChange={(v) => setAddr({ ...addr, address: v })} />
                      </div>
                      <Field label="City" value={addr.city} onChange={(v) => setAddr({ ...addr, city: v })} />
                      <Field label="State" value={addr.state} onChange={(v) => setAddr({ ...addr, state: v })} />
                      <Field label="ZIP code" value={addr.zip} onChange={(v) => setAddr({ ...addr, zip: v })} />
                      <div>
                        <label className="text-xs text-stone-500 mb-1 block">Country</label>
                        <select
                          value={addr.country}
                          onChange={(e) => setAddr({ ...addr, country: e.target.value })}
                          className="w-full rounded-xl border border-white/10 bg-stone-800/60 px-3 py-2.5 text-sm text-stone-200 focus:border-amber-500/50 focus:outline-none"
                        >
                          <option value="US">United States</option>
                          <option value="CA">Canada</option>
                          <option value="GB">United Kingdom</option>
                          <option value="AU">Australia</option>
                          <option value="DE">Germany</option>
                          <option value="FR">France</option>
                          <option value="JP">Japan</option>
                        </select>
                      </div>
                    </div>
                    <button
                      disabled={!addrValid()}
                      onClick={() => setStep("payment")}
                      className="mt-2 w-full flex items-center justify-center gap-2 rounded-full bg-amber-500 py-3 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Continue to payment <ArrowRight size={14} />
                    </button>
                  </div>
                </motion.div>
              )}

              {step === "payment" && (
                <motion.div key="payment" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <div className="rounded-2xl border border-white/8 bg-stone-900/60 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Payment details</p>
                      <div className="flex items-center gap-1.5 text-xs text-stone-600">
                        <Lock size={10} /> SSL encrypted
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <Field label="Name on card" value={pay.cardName} onChange={(v) => setPay({ ...pay, cardName: v })} />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs text-stone-500 mb-1 block">Card number</label>
                        <div className="relative">
                          <input
                            value={pay.cardNumber}
                            onChange={(e) => setPay({ ...pay, cardNumber: formatCard(e.target.value) })}
                            placeholder="1234 5678 9012 3456"
                            className="w-full rounded-xl border border-white/10 bg-stone-800/60 px-3 py-2.5 pr-10 text-sm text-stone-200 placeholder-stone-700 focus:border-amber-500/50 focus:outline-none"
                          />
                          <CreditCard size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-600" />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-stone-500 mb-1 block">Expiry</label>
                        <input
                          value={pay.expiry}
                          onChange={(e) => setPay({ ...pay, expiry: formatExpiry(e.target.value) })}
                          placeholder="MM/YY"
                          className="w-full rounded-xl border border-white/10 bg-stone-800/60 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-700 focus:border-amber-500/50 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-stone-500 mb-1 block">CVV</label>
                        <input
                          value={pay.cvv}
                          onChange={(e) => setPay({ ...pay, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                          placeholder="123"
                          type="password"
                          className="w-full rounded-xl border border-white/10 bg-stone-800/60 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-700 focus:border-amber-500/50 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Test mode notice */}
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                      <p className="text-xs text-amber-400/80">Demo mode — no real charges. Use any values to proceed.</p>
                    </div>

                    <button
                      disabled={!payValid()}
                      onClick={() => setStep("confirm")}
                      className="mt-2 w-full flex items-center justify-center gap-2 rounded-full bg-amber-500 py-3 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Review order <ArrowRight size={14} />
                    </button>
                  </div>
                </motion.div>
              )}

              {step === "confirm" && (
                <motion.div key="confirm" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <div className="rounded-2xl border border-white/8 bg-stone-900/60 p-5 space-y-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Review your order</p>

                    <div className="space-y-3">
                      {items.map(({ listing, quantity }) => (
                        <div key={listing.id} className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-lg overflow-hidden bg-stone-800 shrink-0">
                            {listing.imageUrl && <img src={listing.imageUrl} alt={listing.title} className="h-full w-full object-cover" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-stone-200 line-clamp-1">{listing.title}</p>
                            <p className="text-xs text-stone-500">Qty: {quantity}</p>
                          </div>
                          <p className="text-sm font-semibold text-amber-300">{formatPrice(listing.price * quantity)}</p>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-white/8 pt-3 space-y-1.5 text-sm text-stone-400">
                      <div className="flex justify-between">
                        <span>Shipping to</span>
                        <span className="text-stone-300">{addr.city}, {addr.state}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="flex items-center gap-1"><Truck size={11} /> Shipping</span>
                        <span className={shipping === 0 ? "text-emerald-400" : ""}>{shipping === 0 ? "Free" : `$${shipping}`}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tax (8.75%)</span>
                        <span>${tax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-t border-white/8 pt-2 text-base font-bold text-amber-100">
                        <span>Total</span>
                        <span>${total.toFixed(2)}</span>
                      </div>
                    </div>

                    <button
                      disabled={processing}
                      onClick={handleConfirm}
                      className="mt-2 w-full flex items-center justify-center gap-2 rounded-full bg-amber-500 py-3 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors disabled:opacity-70"
                    >
                      {processing ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-stone-950 border-t-transparent" />
                          Processing…
                        </>
                      ) : (
                        <><Lock size={13} /> Place order · ${total.toFixed(2)}</>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

              {step === "success" && (
                <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center space-y-4">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/30">
                      <Check size={28} className="text-emerald-400" />
                    </div>
                    <div>
                      <h2 className="font-serif text-xl text-amber-100 mb-1">Order placed!</h2>
                      <p className="text-sm text-stone-400">Confirmation #{orderId}</p>
                    </div>
                    <div className="rounded-xl bg-stone-900/60 border border-white/8 px-4 py-3 text-sm text-stone-400 text-left space-y-1">
                      <div className="flex justify-between">
                        <span>Shipped to</span>
                        <span className="text-stone-300">{addr.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Confirmation sent to</span>
                        <span className="text-stone-300 truncate ml-2">{addr.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Estimated delivery</span>
                        <span className="text-stone-300">5–10 business days</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-xs text-stone-600">
                      <ShieldCheck size={12} className="text-emerald-600" /> Artist-verified, authenticity guaranteed
                    </div>
                    <div className="flex gap-3 pt-2">
                      <Link href="/orders" className="flex-1">
                        <button className="w-full rounded-full border border-white/10 py-2.5 text-sm text-stone-300 hover:border-white/20 transition-colors">
                          View orders
                        </button>
                      </Link>
                      <Link href="/shop" className="flex-1">
                        <button className="w-full rounded-full bg-amber-500 py-2.5 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors">
                          Keep shopping
                        </button>
                      </Link>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Order summary sidebar */}
          {step !== "success" && (
            <div className="lg:w-72 shrink-0">
              <div className="rounded-2xl border border-white/8 bg-stone-900/60 p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  {itemCount} {itemCount === 1 ? "item" : "items"}
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {items.map(({ listing, quantity }) => (
                    <div key={listing.id} className="flex items-center gap-2.5">
                      <div className="relative shrink-0">
                        <div className="h-10 w-10 rounded-lg overflow-hidden bg-stone-800">
                          {listing.imageUrl && <img src={listing.imageUrl} alt="" className="h-full w-full object-cover" />}
                        </div>
                        {quantity > 1 && (
                          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-amber-500 text-[9px] font-bold text-stone-950 flex items-center justify-center">
                            {quantity}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-stone-300 line-clamp-1">{listing.title}</p>
                        <p className="text-xs text-stone-600">{formatPrice(listing.price)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-white/8 pt-3 space-y-1.5 text-xs text-stone-500">
                  <div className="flex justify-between">
                    <span>Subtotal</span><span>${subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span className={shipping === 0 ? "text-emerald-400" : ""}>{shipping === 0 ? "Free" : `$${shipping}`}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax</span><span>${tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-white/8 pt-2 text-sm font-bold text-amber-100">
                    <span>Total</span><span>${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-xs text-stone-500 mb-1 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-stone-800/60 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-700 focus:border-amber-500/50 focus:outline-none transition-colors"
      />
    </div>
  );
}
