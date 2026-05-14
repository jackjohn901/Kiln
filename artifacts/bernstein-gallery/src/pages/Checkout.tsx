import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, useParams } from "wouter";
import { artworks, formatPrice } from "@/data/artworks";
import { ArrowLeft, Check } from "lucide-react";

type Step = "details" | "payment" | "confirmation";

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  cardNumber: string;
  cardExpiry: string;
  cardCvc: string;
  cardName: string;
}

const initialForm: FormData = {
  firstName: "", lastName: "", email: "", phone: "",
  address: "", city: "", state: "", zip: "", country: "United States",
  cardNumber: "", cardExpiry: "", cardCvc: "", cardName: "",
};

function Field({
  label, value, onChange, placeholder, type = "text", pattern,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; pattern?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] uppercase tracking-[0.15em] text-gray-400">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        pattern={pattern}
        className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 outline-none focus:border-gray-400 transition-colors bg-white"
      />
    </div>
  );
}

function formatCardNumber(value: string) {
  return value.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length >= 3) return `${digits.slice(0, 2)} / ${digits.slice(2)}`;
  return digits;
}

export default function Checkout() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>("details");
  const [form, setForm] = useState<FormData>(initialForm);
  const [submitting, setSubmitting] = useState(false);

  const artwork = artworks.find((a) => a.id === params.id);

  if (!artwork) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 text-sm">Artwork not found.</p>
          <button onClick={() => navigate("/")} className="mt-4 text-xs text-gray-400 underline">Return to gallery</button>
        </div>
      </div>
    );
  }

  const set = (key: keyof FormData) => (v: string) => setForm((f) => ({ ...f, [key]: v }));

  const detailsComplete =
    form.firstName && form.lastName && form.email && form.address && form.city && form.state && form.zip;

  const paymentComplete =
    form.cardNumber.replace(/\s/g, "").length === 16 && form.cardExpiry.length >= 6 && form.cardCvc.length >= 3 && form.cardName;

  const handleContinue = () => {
    if (step === "details" && detailsComplete) setStep("payment");
  };

  const handleSubmit = async () => {
    if (!paymentComplete) return;
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 1800));
    setSubmitting(false);
    setStep("confirmation");
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-4xl mx-auto">
        {step !== "confirmation" ? (
          <button
            onClick={() => (step === "payment" ? setStep("details") : navigate("/"))}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft size={12} />
            {step === "payment" ? "Back" : "Gallery"}
          </button>
        ) : (
          <div />
        )}
        <p className="text-[10px] uppercase tracking-[0.25em] text-gray-300">Alex Bernstein</p>
        <div className="w-16" />
      </header>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <AnimatePresence mode="wait">
          {step === "confirmation" ? (
            <motion.div
              key="confirmation"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="text-center py-16"
            >
              <div className="w-12 h-12 rounded-full bg-gray-900 flex items-center justify-center mx-auto mb-6">
                <Check size={20} className="text-white" strokeWidth={2} />
              </div>
              <h2 className="text-2xl font-light text-gray-900 tracking-tight mb-2">Order Confirmed</h2>
              <p className="text-sm text-gray-400 mb-1">Thank you, {form.firstName}.</p>
              <p className="text-sm text-gray-400 mb-6">A confirmation has been sent to {form.email}.</p>
              <div className="max-w-xs mx-auto border border-gray-100 rounded p-5 text-left mb-8">
                <img src={artwork.image} alt={artwork.title} className="h-28 object-contain mx-auto mb-4 artwork-shadow" />
                <p className="text-sm font-medium text-gray-900">{artwork.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{artwork.medium} &middot; {artwork.year}</p>
                <p className="text-sm text-gray-900 mt-3 font-light">{formatPrice(artwork.price)}</p>
              </div>
              <p className="text-xs text-gray-400 mb-1">Habatat Galleries will contact you within 24 hours to arrange shipping.</p>
              <button
                onClick={() => navigate("/")}
                className="mt-6 text-xs text-gray-400 hover:text-gray-700 transition-colors underline"
              >
                Return to gallery
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="grid grid-cols-1 lg:grid-cols-5 gap-12"
            >
              <div className="lg:col-span-3">
                <div className="flex items-center gap-3 mb-8">
                  {(["details", "payment"] as Step[]).map((s, i) => (
                    <div key={s} className="flex items-center gap-3">
                      {i > 0 && <div className="w-8 h-px bg-gray-200" />}
                      <div className="flex items-center gap-2">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] transition-colors ${
                          step === s ? "bg-gray-900 text-white" :
                          (s === "details" && step === "payment") ? "bg-gray-200 text-gray-500" :
                          "bg-gray-100 text-gray-300"
                        }`}>
                          {s === "details" && step === "payment" ? <Check size={10} /> : i + 1}
                        </div>
                        <span className={`text-[10px] uppercase tracking-[0.12em] ${step === s ? "text-gray-700" : "text-gray-300"}`}>
                          {s}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {step === "details" && (
                  <motion.div
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-5"
                  >
                    <h2 className="text-lg font-light text-gray-900 tracking-tight">Your Details</h2>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="First Name" value={form.firstName} onChange={set("firstName")} />
                      <Field label="Last Name" value={form.lastName} onChange={set("lastName")} />
                    </div>
                    <Field label="Email" value={form.email} onChange={set("email")} type="email" placeholder="you@example.com" />
                    <Field label="Phone (optional)" value={form.phone} onChange={set("phone")} type="tel" />
                    <div className="pt-2">
                      <h3 className="text-[10px] uppercase tracking-[0.15em] text-gray-400 mb-4">Shipping Address</h3>
                      <div className="space-y-4">
                        <Field label="Street Address" value={form.address} onChange={set("address")} />
                        <div className="grid grid-cols-2 gap-4">
                          <Field label="City" value={form.city} onChange={set("city")} />
                          <Field label="State" value={form.state} onChange={set("state")} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <Field label="ZIP Code" value={form.zip} onChange={set("zip")} />
                          <Field label="Country" value={form.country} onChange={set("country")} />
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleContinue}
                      disabled={!detailsComplete}
                      className="w-full mt-2 py-3 bg-gray-900 text-white text-xs uppercase tracking-[0.15em] rounded transition-opacity disabled:opacity-30 hover:opacity-80"
                    >
                      Continue to Payment
                    </button>
                  </motion.div>
                )}

                {step === "payment" && (
                  <motion.div
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-5"
                  >
                    <h2 className="text-lg font-light text-gray-900 tracking-tight">Payment</h2>
                    <Field
                      label="Card Number"
                      value={form.cardNumber}
                      onChange={(v) => set("cardNumber")(formatCardNumber(v))}
                      placeholder="0000 0000 0000 0000"
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <Field
                        label="Expiry"
                        value={form.cardExpiry}
                        onChange={(v) => set("cardExpiry")(formatExpiry(v))}
                        placeholder="MM / YY"
                      />
                      <Field
                        label="CVC"
                        value={form.cardCvc}
                        onChange={(v) => set("cardCvc")(v.replace(/\D/g, "").slice(0, 4))}
                        placeholder="123"
                      />
                    </div>
                    <Field label="Name on Card" value={form.cardName} onChange={set("cardName")} />
                    <div className="pt-1 border-t border-gray-100">
                      <div className="flex justify-between items-center py-3 text-sm">
                        <span className="text-gray-500 font-light">{artwork.title}</span>
                        <span className="text-gray-900">{formatPrice(artwork.price)}</span>
                      </div>
                      <div className="flex justify-between items-center py-3 text-sm border-t border-gray-100">
                        <span className="text-gray-500 font-light">Shipping</span>
                        <span className="text-gray-500">Complimentary</span>
                      </div>
                      <div className="flex justify-between items-center py-3 text-sm font-medium border-t border-gray-100">
                        <span className="text-gray-900">Total</span>
                        <span className="text-gray-900">{formatPrice(artwork.price)}</span>
                      </div>
                    </div>
                    <button
                      onClick={handleSubmit}
                      disabled={!paymentComplete || submitting}
                      className="w-full py-3 bg-gray-900 text-white text-xs uppercase tracking-[0.15em] rounded transition-opacity disabled:opacity-30 hover:opacity-80 flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <span className="w-3.5 h-3.5 border border-white/40 border-t-white rounded-full animate-spin" />
                          Processing
                        </>
                      ) : (
                        `Pay ${formatPrice(artwork.price)}`
                      )}
                    </button>
                    <p className="text-[10px] text-center text-gray-300 tracking-wide">
                      Secured with 256-bit SSL encryption
                    </p>
                  </motion.div>
                )}
              </div>

              <div className="lg:col-span-2">
                <div className="sticky top-8 border border-gray-100 rounded-sm p-6">
                  <img
                    src={artwork.image}
                    alt={artwork.title}
                    className="w-full h-48 object-contain mb-5 artwork-shadow"
                  />
                  <h3 className="text-sm font-medium text-gray-900">{artwork.title}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{artwork.series}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{artwork.medium} &middot; {artwork.year}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{artwork.dimensions}</p>
                  <p className="text-xs text-gray-500 leading-relaxed mt-3 font-light">{artwork.description}</p>
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-base font-light text-gray-900">{formatPrice(artwork.price)}</p>
                    <p className="text-[10px] text-gray-300 mt-1 uppercase tracking-[0.1em]">Complimentary shipping included</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
