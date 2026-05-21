import { useState } from "react";
import { X, Copy, Check, Twitter, Instagram, Linkedin, Link2, Download, Share2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type ShareMode = "profile" | "sale";

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  mode: ShareMode;
  artistName: string;
  medium?: string;
  location?: string;
  profileUrl: string;
  saleItem?: string;
  saleAmount?: string;
}

function useCopy(timeout = 2000) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), timeout);
  };
  return { copied, copy };
}

export default function ShareModal({
  open, onClose, mode,
  artistName, medium, location, profileUrl,
  saleItem, saleAmount,
}: ShareModalProps) {
  const { copied, copy } = useCopy();

  const twitterText = mode === "sale"
    ? `Just sold "${saleItem ?? "a piece"}"${saleAmount ? ` for ${saleAmount}` : ""} on @KilnFire 🔥 The craft artist platform built different. ${profileUrl}`
    : `My work is on @KilnFire — the creator platform built exclusively for craft artists 🏺🔥 ${profileUrl}`;

  const instagramText = mode === "sale"
    ? `${saleItem ? `"${saleItem}" just found a new home! 🎉` : "Just made a sale! 🎉"} You can shop my work through the link in my bio — I'm on Kiln, a platform built for craft artists. #CraftArt #Handmade #KilnFire #MakerCommunity ${medium ? `#${medium.replace(/\s+/g, "")}` : ""}`
    : `You can now shop my work, book workshops, and support me directly on Kiln — a platform built exclusively for craft artists. Link in bio 🏺🔥 #CraftArt #Handmade #KilnFire #MakerCommunity ${medium ? `#${medium.replace(/\s+/g, "")}` : ""} ${location ? `#${location.replace(/[^a-zA-Z]/g, "")}` : ""}`;

  const linkedinText = mode === "sale"
    ? `Excited to share that my work is selling through Kiln — a creator platform built specifically for craft artists. If you're interested in original handmade work, my shop is now live. ${profileUrl}`
    : `I've joined Kiln, a platform built specifically for craft artists. It combines a social feed, shop, workshops, patron tiers, and commissions in one place. If you work in ceramics, glass, weaving, or any craft discipline — worth checking out. ${profileUrl}`;

  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterText)}`;
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}&summary=${encodeURIComponent(linkedinText)}`;

  const title = mode === "sale" ? "Share this sale 🎉" : "Share your profile";

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            className="relative w-full max-w-md rounded-2xl border border-white/10 bg-stone-950 shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
              <div className="flex items-center gap-2">
                <Share2 size={16} className="text-amber-400" />
                <h2 className="font-semibold text-sm">{title}</h2>
              </div>
              <button onClick={onClose} className="rounded-full p-1.5 text-stone-500 hover:text-stone-300 hover:bg-white/5 transition-colors">
                <X size={15} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Quick post buttons */}
              <div className="grid grid-cols-3 gap-2">
                <a
                  href={xUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-stone-900 py-3 px-2 hover:border-white/20 hover:bg-stone-800 transition-all group"
                >
                  <Twitter size={18} className="text-sky-400 group-hover:scale-110 transition-transform" />
                  <span className="text-[11px] text-stone-400">X / Twitter</span>
                </a>
                <a
                  href={linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-stone-900 py-3 px-2 hover:border-white/20 hover:bg-stone-800 transition-all group"
                >
                  <Linkedin size={18} className="text-blue-400 group-hover:scale-110 transition-transform" />
                  <span className="text-[11px] text-stone-400">LinkedIn</span>
                </a>
                <button
                  onClick={() => copy(profileUrl, "link")}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-stone-900 py-3 px-2 hover:border-white/20 hover:bg-stone-800 transition-all group"
                >
                  {copied === "link"
                    ? <Check size={18} className="text-green-400" />
                    : <Link2 size={18} className="text-stone-400 group-hover:scale-110 transition-transform" />}
                  <span className="text-[11px] text-stone-400">{copied === "link" ? "Copied!" : "Copy link"}</span>
                </button>
              </div>

              {/* Instagram caption */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Instagram size={13} className="text-pink-400" />
                    <span className="text-xs font-medium text-stone-400">Instagram caption</span>
                  </div>
                  <button
                    onClick={() => copy(instagramText, "instagram")}
                    className={`flex items-center gap-1 text-xs rounded-lg px-2.5 py-1 transition-all ${
                      copied === "instagram"
                        ? "bg-green-500/15 text-green-400"
                        : "bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-200"
                    }`}
                  >
                    {copied === "instagram" ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
                  </button>
                </div>
                <div
                  className="rounded-xl bg-stone-900 border border-white/6 p-3 text-xs text-stone-300 leading-relaxed max-h-24 overflow-y-auto cursor-text select-text"
                  onClick={() => copy(instagramText, "instagram")}
                >
                  {instagramText}
                </div>
              </div>

              {/* X/Twitter preview */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Twitter size={13} className="text-sky-400" />
                    <span className="text-xs font-medium text-stone-400">X / Twitter post</span>
                  </div>
                  <button
                    onClick={() => copy(twitterText, "twitter")}
                    className={`flex items-center gap-1 text-xs rounded-lg px-2.5 py-1 transition-all ${
                      copied === "twitter"
                        ? "bg-green-500/15 text-green-400"
                        : "bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-200"
                    }`}
                  >
                    {copied === "twitter" ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
                  </button>
                </div>
                <div
                  className="rounded-xl bg-stone-900 border border-white/6 p-3 text-xs text-stone-300 leading-relaxed cursor-text select-text"
                  onClick={() => copy(twitterText, "twitter")}
                >
                  {twitterText}
                </div>
                <p className="text-[10px] text-stone-600 text-right">{twitterText.length} / 280 chars</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
