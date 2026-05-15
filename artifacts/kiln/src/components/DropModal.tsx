import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { X, Clock, Users, Check, ExternalLink, Zap } from "lucide-react";
import { type Drop, getTimeUntilDrop } from "@/data/drops";
import { useSocial } from "@/contexts/SocialContext";
import { useProfile } from "@/contexts/ProfileContext";

function formatPrice(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default function DropModal({ drop, onClose }: { drop: Drop; onClose: () => void }) {
  const [, navigate] = useLocation();
  const { profile } = useProfile();
  const { isOnDropWaitlist, joinDropWaitlist, leaveDropWaitlist } = useSocial();
  const [countdown, setCountdown] = useState(getTimeUntilDrop(drop.dropDate));
  const [confirming, setConfirming] = useState(false);
  const onWaitlist = isOnDropWaitlist(drop.id);

  useEffect(() => {
    const iv = setInterval(() => setCountdown(getTimeUntilDrop(drop.dropDate)), 5000);
    return () => clearInterval(iv);
  }, [drop.dropDate]);

  function handleJoin() {
    if (!profile) { navigate("/setup"); onClose(); return; }
    joinDropWaitlist(drop.id, drop.title, drop.artistName);
    setConfirming(true);
    setTimeout(() => setConfirming(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-stone-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-[#1a1209] border border-white/10 rounded-t-3xl sm:rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-stone-900 text-stone-400 hover:text-amber-300 transition-colors z-10"
        >
          <X size={15} />
        </button>

        {/* Image */}
        <div className="relative aspect-video overflow-hidden">
          <img src={drop.imageUrl} alt={drop.title} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1a1209] via-transparent to-transparent" />
          {drop.status === "live" && (
            <div className="absolute top-4 left-4 flex items-center gap-1.5 rounded-full bg-green-500 px-3 py-1 text-xs font-bold text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              Live Now
            </div>
          )}
        </div>

        <div className="px-6 pb-8 pt-4 space-y-5">
          {/* Title + artist */}
          <div>
            <h2 className="font-serif text-2xl text-amber-100">{drop.title}</h2>
            <button
              onClick={() => { navigate(`/artists/${drop.artistId}`); onClose(); }}
              className="flex items-center gap-1.5 mt-1 text-sm text-stone-400 hover:text-amber-300 transition-colors"
            >
              <img
                src={drop.artistAvatarUrl}
                alt={drop.artistName}
                className="h-5 w-5 rounded-full object-cover"
              />
              {drop.artistName}
              <ExternalLink size={11} />
            </button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-stone-800/60 px-3 py-2.5 text-center">
              <p className="text-lg font-semibold text-amber-300">{formatPrice(drop.price)}</p>
              <p className="text-[10px] text-stone-500">
                {drop.spotsTotal === 1 ? "Unique piece" : `1 of ${drop.spotsTotal}`}
              </p>
            </div>
            {drop.status === "upcoming" && (
              <div className="rounded-xl bg-stone-800/60 px-3 py-2.5 text-center">
                <p className="flex items-center justify-center gap-1 text-sm font-semibold text-amber-300">
                  <Clock size={12} /> {countdown}
                </p>
                <p className="text-[10px] text-stone-500">Until drop</p>
              </div>
            )}
            {drop.status === "live" && (
              <div className="rounded-xl bg-green-500/10 border border-green-500/20 px-3 py-2.5 text-center">
                <p className="text-sm font-semibold text-green-400">{drop.spotsLeft} left</p>
                <p className="text-[10px] text-stone-500">Available now</p>
              </div>
            )}
            <div className="rounded-xl bg-stone-800/60 px-3 py-2.5 text-center">
              <p className="flex items-center justify-center gap-1 text-sm font-semibold text-stone-300">
                <Users size={12} /> {drop.waitlistCount}
              </p>
              <p className="text-[10px] text-stone-500">Waiting</p>
            </div>
          </div>

          {/* Description */}
          <div className="text-sm text-stone-300 leading-relaxed">{drop.description}</div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-stone-800/40 px-3 py-2">
              <p className="text-[10px] text-stone-500 mb-0.5">Medium</p>
              <p className="text-stone-200">{drop.medium}</p>
            </div>
            <div className="rounded-xl bg-stone-800/40 px-3 py-2">
              <p className="text-[10px] text-stone-500 mb-0.5">Technique</p>
              <p className="text-stone-200">{drop.technique}</p>
            </div>
            {drop.dimensions && (
              <div className="rounded-xl bg-stone-800/40 px-3 py-2 col-span-2">
                <p className="text-[10px] text-stone-500 mb-0.5">Dimensions</p>
                <p className="text-stone-200">{drop.dimensions}</p>
              </div>
            )}
          </div>

          {/* CTA */}
          {drop.status === "live" && (
            <div className="space-y-2">
              <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 py-3.5 font-semibold text-white hover:bg-green-400 transition-colors">
                <Zap size={16} />
                Buy Now · {formatPrice(drop.price)}
              </button>
              <p className="text-center text-xs text-stone-600">Purchases are processed through the artist directly. Kiln facilitates the introduction.</p>
            </div>
          )}

          {drop.status === "upcoming" && (
            <div className="space-y-2">
              {onWaitlist ? (
                <div className="space-y-2">
                  <div className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500/20 border border-amber-500/30 py-3.5 font-semibold text-amber-300">
                    <Check size={16} />
                    You're on the waitlist
                  </div>
                  {confirming && <p className="text-center text-xs text-green-400">You'll be notified when this drops.</p>}
                  <button
                    onClick={() => leaveDropWaitlist(drop.id)}
                    className="w-full rounded-xl border border-white/10 py-2 text-sm text-stone-500 hover:text-stone-300 transition-colors"
                  >
                    Leave waitlist
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={handleJoin}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3.5 font-semibold text-stone-950 hover:bg-amber-400 transition-colors"
                  >
                    <Users size={16} />
                    Join Waitlist — {countdown} away
                  </button>
                  {confirming && <p className="text-center text-xs text-green-400">Added to waitlist! You'll get a notification when it drops.</p>}
                  <p className="text-center text-xs text-stone-600">Waitlist members get notified first. No payment until you claim the piece.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
