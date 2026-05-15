import { useState } from "react";
import { X, Heart, CheckCircle } from "lucide-react";
import { useSocial } from "@/contexts/SocialContext";
import { useProfile } from "@/contexts/ProfileContext";

const AMOUNTS = [5, 10, 25, 50, 100];

interface Props {
  artistId: string;
  artistName: string;
  artistAvatarUrl: string;
  onClose: () => void;
}

export default function TipModal({ artistId, artistName, artistAvatarUrl, onClose }: Props) {
  const { sendTip, addNotification } = useSocial();
  const { profile } = useProfile();
  const [amount, setAmount] = useState<number | null>(null);
  const [custom, setCustom] = useState("");
  const [message, setMessage] = useState("");
  const [step, setStep] = useState<"choose" | "confirm" | "success">("choose");

  const finalAmount = amount ?? (custom ? parseFloat(custom) : null);

  function handleContinue() {
    if (!finalAmount || finalAmount <= 0) return;
    setStep("confirm");
  }

  function handleSend() {
    if (!finalAmount) return;
    sendTip(artistId, artistName, finalAmount, message || undefined);
    addNotification({
      type: "tip",
      fromId: "system",
      fromName: artistName,
      fromAvatarUrl: artistAvatarUrl,
      text: `You supported ${artistName} with $${finalAmount}. Thank you for supporting craft artists.`,
      link: `/artists/${artistId}`,
    });
    setStep("success");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={onClose}>
      <div
        className="relative w-full max-w-sm bg-stone-900 rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "popIn 0.2s ease-out" }}
      >
        <style>{`@keyframes popIn{from{transform:scale(0.95);opacity:0}to{transform:scale(1);opacity:1}}`}</style>

        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <img src={artistAvatarUrl} alt={artistName} className="w-9 h-9 rounded-full object-cover" />
            <div>
              <p className="text-sm font-semibold text-stone-100">Support {artistName}</p>
              <p className="text-xs text-stone-500">100% goes to the artist</p>
            </div>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-200">
            <X size={20} />
          </button>
        </div>

        {step === "success" ? (
          <div className="flex flex-col items-center py-12 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-rose-500/20 flex items-center justify-center mb-4">
              <Heart className="text-rose-400" size={32} fill="currentColor" />
            </div>
            <h3 className="text-lg font-semibold text-stone-100 mb-1">Thank you!</h3>
            <p className="text-sm text-stone-400">
              ${finalAmount} sent to {artistName}. Your support keeps craft alive.
            </p>
            <button onClick={onClose} className="mt-6 px-6 py-2.5 rounded-full bg-amber-500 text-stone-950 font-semibold text-sm hover:bg-amber-400 transition-colors">
              Done
            </button>
          </div>
        ) : step === "confirm" ? (
          <div className="px-5 py-6 space-y-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-amber-400">${finalAmount}</p>
              <p className="text-sm text-stone-400 mt-1">to {artistName}</p>
            </div>
            {message && (
              <div className="bg-stone-800 rounded-xl px-4 py-3 text-sm text-stone-300 italic">"{message}"</div>
            )}
            <p className="text-xs text-stone-500 text-center">
              This is a simulated tip for demo purposes. In production, this would process via Stripe.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setStep("choose")} className="flex-1 py-2.5 rounded-full border border-stone-700 text-stone-300 text-sm hover:border-stone-500 transition-colors">
                Back
              </button>
              <button onClick={handleSend} className="flex-1 py-2.5 rounded-full bg-amber-500 text-stone-950 font-semibold text-sm hover:bg-amber-400 transition-colors">
                Send ${finalAmount}
              </button>
            </div>
          </div>
        ) : (
          <div className="px-5 py-5 space-y-4">
            {!profile && (
              <div className="text-xs text-stone-500 text-center bg-stone-800 rounded-xl p-3">
                <a href="/setup" className="text-amber-400 hover:text-amber-300">Create a profile</a> to tip artists
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">Choose amount</p>
              <div className="grid grid-cols-5 gap-2">
                {AMOUNTS.map((a) => (
                  <button
                    key={a}
                    onClick={() => { setAmount(a); setCustom(""); }}
                    className={`py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                      amount === a && !custom
                        ? "border-amber-500 bg-amber-500/10 text-amber-300"
                        : "border-stone-700 text-stone-300 hover:border-stone-500"
                    }`}
                  >
                    ${a}
                  </button>
                ))}
              </div>
              <div className="mt-2 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">$</span>
                <input
                  type="number"
                  value={custom}
                  onChange={(e) => { setCustom(e.target.value); setAmount(null); }}
                  placeholder="Custom amount"
                  className="w-full bg-stone-800 rounded-xl pl-7 pr-4 py-2.5 text-sm text-stone-100 placeholder-stone-500 outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider block mb-1.5">
                Message <span className="text-stone-600 normal-case font-normal">(optional)</span>
              </label>
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Your work inspires me…"
                className="w-full bg-stone-800 rounded-xl px-4 py-2.5 text-sm text-stone-100 placeholder-stone-500 outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <button
              onClick={handleContinue}
              disabled={!finalAmount || finalAmount <= 0}
              className="w-full py-3 rounded-full bg-amber-500 disabled:bg-stone-700 disabled:text-stone-500 text-stone-950 font-semibold text-sm hover:bg-amber-400 transition-colors flex items-center justify-center gap-2"
            >
              <Heart size={14} fill="currentColor" />
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
