import { useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Gift, CheckCircle, Flame, Send, Copy, Check } from "lucide-react";
import Nav from "@/components/Nav";

const DENOMINATIONS = [25, 50, 100, 250, 500, 1000];

const DESIGNS = [
  { id: "glasswork", label: "Glass Blowing", bg: "from-orange-900 to-amber-950", accent: "text-amber-300", emoji: "🔥" },
  { id: "ceramics", label: "Ceramics", bg: "from-stone-700 to-stone-900", accent: "text-stone-300", emoji: "🏺" },
  { id: "minimal", label: "Minimal", bg: "from-stone-900 to-stone-950", accent: "text-white", emoji: "✦" },
  { id: "botanical", label: "Botanical", bg: "from-emerald-950 to-stone-900", accent: "text-emerald-300", emoji: "🌿" },
];

const CODE_STORAGE_KEY = "kiln_gift_codes_v1";

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 4 }, () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
  ).join("-");
}

function loadCodes(): { code: string; amount: number; purchased: string; redeemed?: string }[] {
  try { return JSON.parse(localStorage.getItem(CODE_STORAGE_KEY) ?? "[]"); } catch { return []; }
}

function saveCode(entry: { code: string; amount: number; purchased: string }) {
  const existing = loadCodes();
  localStorage.setItem(CODE_STORAGE_KEY, JSON.stringify([...existing, entry]));
}

export default function GiftCards() {
  const [amount, setAmount] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState("");
  const [design, setDesign] = useState(DESIGNS[0]);
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [senderName, setSenderName] = useState("");
  const [message, setMessage] = useState("");
  const [step, setStep] = useState<"configure" | "confirm" | "done">("configure");
  const [generatedCode, setGeneratedCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemResult, setRedeemResult] = useState<"success" | "invalid" | null>(null);
  const [activeTab, setActiveTab] = useState<"buy" | "redeem" | "mine">("buy");

  const finalAmount = customAmount ? parseInt(customAmount, 10) || 0 : amount;

  function handlePurchase() {
    const code = generateCode();
    setGeneratedCode(code);
    saveCode({ code, amount: finalAmount, purchased: new Date().toISOString() });
    setStep("done");
  }

  function handleRedeem() {
    const codes = loadCodes();
    const match = codes.find((c) => c.code === redeemCode.toUpperCase() && !c.redeemed);
    if (match) {
      const updated = codes.map((c) => c.code === match.code ? { ...c, redeemed: new Date().toISOString() } : c);
      localStorage.setItem(CODE_STORAGE_KEY, JSON.stringify(updated));
      setRedeemResult("success");
    } else {
      setRedeemResult("invalid");
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(generatedCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  const myCodes = loadCodes();

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200 pb-24">
      <Nav />
      <div className="mx-auto max-w-lg px-4 pt-4">
        <Link href="/shop" className="mb-4 flex items-center gap-1 text-sm text-stone-400 hover:text-stone-200 transition-colors">
          <ChevronLeft size={16} /> Shop
        </Link>

        <div className="mb-5 flex items-center gap-2">
          <Gift size={22} className="text-amber-400" />
          <h1 className="text-xl font-bold text-white">Gift Cards</h1>
        </div>
        <p className="mb-5 text-sm text-stone-500">
          Give the gift of craft. Kiln gift cards can be used toward any artwork, workshop, or digital download on the platform.
        </p>

        {/* Tabs */}
        <div className="mb-5 flex gap-1 rounded-xl bg-stone-900 p-1">
          {(["buy", "redeem", "mine"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold capitalize transition-all ${
                activeTab === tab ? "bg-amber-500 text-stone-950" : "text-stone-500 hover:text-stone-300"
              }`}
            >
              {tab === "mine" ? "My codes" : tab}
            </button>
          ))}
        </div>

        {/* Buy tab */}
        {activeTab === "buy" && step === "configure" && (
          <div className="space-y-5">
            {/* Card design preview */}
            <div className={`relative h-40 rounded-2xl bg-gradient-to-br ${design.bg} p-5 overflow-hidden border border-white/5 shadow-xl`}>
              <div className="absolute top-4 right-4 text-3xl">{design.emoji}</div>
              <div className="flex items-center gap-2 mb-3">
                <Flame size={14} className="text-amber-400" />
                <span className="text-xs font-bold tracking-widest text-amber-400/80">KILN</span>
              </div>
              <p className={`text-3xl font-bold ${design.accent}`}>${finalAmount || "—"}</p>
              <p className="mt-1 text-xs text-stone-500">Gift Card</p>
              {recipientName && (
                <p className="mt-2 text-xs text-stone-400">For {recipientName}</p>
              )}
            </div>

            {/* Design picker */}
            <div>
              <label className="mb-2 block text-xs font-medium text-stone-400">Card design</label>
              <div className="grid grid-cols-4 gap-2">
                {DESIGNS.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setDesign(d)}
                    className={`h-12 rounded-xl bg-gradient-to-br ${d.bg} border-2 transition-all ${
                      design.id === d.id ? "border-amber-400 scale-105" : "border-transparent"
                    }`}
                    title={d.label}
                  />
                ))}
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="mb-2 block text-xs font-medium text-stone-400">Amount</label>
              <div className="grid grid-cols-3 gap-2">
                {DENOMINATIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => { setAmount(d); setCustomAmount(""); }}
                    className={`rounded-xl border py-2.5 text-sm font-semibold transition-all ${
                      amount === d && !customAmount
                        ? "border-amber-500 bg-amber-500/15 text-amber-300"
                        : "border-white/8 bg-stone-800 text-stone-400 hover:text-stone-200"
                    }`}
                  >
                    ${d}
                  </button>
                ))}
              </div>
              <div className="mt-2">
                <input
                  type="number"
                  placeholder="Custom amount (min $10)"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  min={10}
                  className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none"
                />
              </div>
            </div>

            {/* Recipient */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-stone-400">Recipient (optional)</label>
              <input
                type="text"
                placeholder="Their name"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none"
              />
              <input
                type="email"
                placeholder="Their email (for digital delivery)"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none"
              />
            </div>

            {/* Sender + message */}
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Your name"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none"
              />
              <textarea
                rows={3}
                placeholder="Personal message (optional)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none resize-none"
              />
            </div>

            <button
              disabled={finalAmount < 10}
              onClick={() => setStep("confirm")}
              className="w-full rounded-full bg-amber-500 py-3 font-semibold text-stone-950 hover:bg-amber-400 transition-colors disabled:opacity-40"
            >
              Continue — ${finalAmount || 0}
            </button>
          </div>
        )}

        {activeTab === "buy" && step === "confirm" && (
          <div className="space-y-4">
            <div className={`relative h-40 rounded-2xl bg-gradient-to-br ${design.bg} p-5 overflow-hidden border border-white/5`}>
              <div className="absolute top-4 right-4 text-3xl">{design.emoji}</div>
              <div className="flex items-center gap-2 mb-3">
                <Flame size={14} className="text-amber-400" />
                <span className="text-xs font-bold tracking-widest text-amber-400/80">KILN</span>
              </div>
              <p className={`text-3xl font-bold ${design.accent}`}>${finalAmount}</p>
              {recipientName && <p className="mt-1 text-xs text-stone-400">For {recipientName}</p>}
            </div>

            <div className="rounded-2xl bg-stone-900 border border-white/5 p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-stone-400">Gift card value</span>
                <span className="font-semibold text-white">${finalAmount}</span>
              </div>
              {recipientEmail && (
                <div className="flex justify-between text-sm">
                  <span className="text-stone-400">Deliver to</span>
                  <span className="text-stone-300">{recipientEmail}</span>
                </div>
              )}
              <div className="border-t border-white/5 pt-3 flex justify-between">
                <span className="font-semibold text-white">Total</span>
                <span className="font-bold text-amber-400">${finalAmount}</span>
              </div>
            </div>

            <button onClick={handlePurchase} className="w-full rounded-full bg-amber-500 py-3 font-semibold text-stone-950 hover:bg-amber-400 transition-colors">
              Purchase gift card
            </button>
            <button onClick={() => setStep("configure")} className="w-full rounded-full border border-white/10 py-2.5 text-sm text-stone-400 hover:text-stone-200 transition-colors">
              ← Edit
            </button>
          </div>
        )}

        {activeTab === "buy" && step === "done" && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-4"
            >
              <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/30">
                <CheckCircle size={28} className="text-emerald-400" />
              </div>
              <h2 className="text-lg font-bold text-white">Gift card purchased!</h2>
              <p className="text-sm text-stone-400">
                {recipientEmail ? `A code has been sent to ${recipientEmail}.` : "Share this code with your recipient."}
              </p>

              <div className="rounded-2xl bg-stone-900 border border-amber-500/30 p-5">
                <p className="text-[10px] font-bold tracking-widest text-stone-600 mb-2">GIFT CODE</p>
                <p className="font-mono text-2xl font-bold tracking-widest text-amber-300">{generatedCode}</p>
                <p className="mt-1 text-xs text-stone-500">Value: ${finalAmount}</p>
              </div>

              <button
                onClick={handleCopy}
                className="flex mx-auto items-center gap-2 rounded-full border border-white/10 px-5 py-2 text-sm text-stone-300 hover:text-white transition-colors"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                {copied ? "Copied!" : "Copy code"}
              </button>

              {recipientEmail && (
                <button className="flex mx-auto items-center gap-2 rounded-full bg-amber-500 px-5 py-2 text-sm font-semibold text-stone-950 hover:bg-amber-400 transition-colors">
                  <Send size={14} /> Send via email
                </button>
              )}

              <button
                onClick={() => { setStep("configure"); setGeneratedCode(""); setRecipientName(""); setRecipientEmail(""); setMessage(""); setSenderName(""); }}
                className="block w-full rounded-full border border-white/10 py-2.5 text-sm text-stone-500 hover:text-stone-300 transition-colors"
              >
                Buy another gift card
              </button>
            </motion.div>
          </AnimatePresence>
        )}

        {/* Redeem tab */}
        {activeTab === "redeem" && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-dashed border-amber-500/20 bg-amber-500/5 p-6 text-center">
              <Gift size={32} className="mx-auto mb-3 text-amber-400" />
              <p className="text-sm text-stone-400 mb-1">Enter your gift card code</p>
              <p className="text-xs text-stone-600">Credit will be applied to your account immediately.</p>
            </div>

            <div>
              <input
                type="text"
                placeholder="XXXX-XXXX-XXXX-XXXX"
                value={redeemCode}
                onChange={(e) => { setRedeemCode(e.target.value); setRedeemResult(null); }}
                className="w-full rounded-xl border border-white/10 bg-stone-900 px-4 py-3 text-center font-mono text-lg tracking-widest text-amber-300 placeholder-stone-700 focus:border-amber-500/50 focus:outline-none uppercase"
              />
            </div>

            {redeemResult === "success" && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3">
                <CheckCircle size={16} className="text-emerald-400 shrink-0" />
                <p className="text-sm text-emerald-300">Code redeemed successfully! Credit added to your account.</p>
              </div>
            )}
            {redeemResult === "invalid" && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3">
                <p className="text-sm text-red-300">Code not found or already redeemed. Check the code and try again.</p>
              </div>
            )}

            <button
              onClick={handleRedeem}
              disabled={redeemCode.length < 4}
              className="w-full rounded-full bg-amber-500 py-3 font-semibold text-stone-950 hover:bg-amber-400 transition-colors disabled:opacity-40"
            >
              Redeem gift card
            </button>
          </div>
        )}

        {/* My codes tab */}
        {activeTab === "mine" && (
          <div className="space-y-3">
            {myCodes.length === 0 && (
              <div className="rounded-2xl border border-dashed border-stone-800 p-8 text-center">
                <Gift size={28} className="mx-auto mb-2 text-stone-700" />
                <p className="text-sm text-stone-500">No gift cards purchased yet.</p>
              </div>
            )}
            {myCodes.map((code) => (
              <div key={code.code} className="rounded-2xl bg-stone-900 border border-white/5 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-sm font-bold text-amber-300 tracking-wider">{code.code}</p>
                    <p className="text-xs text-stone-500 mt-0.5">
                      ${code.amount} · Purchased {new Date(code.purchased).toLocaleDateString()}
                    </p>
                  </div>
                  {code.redeemed ? (
                    <span className="rounded-full bg-stone-800 px-2 py-0.5 text-[10px] font-bold text-stone-500">Redeemed</span>
                  ) : (
                    <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">Active</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
