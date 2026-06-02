import { useEffect, useRef } from "react";
import { Link } from "wouter";
import { MessageCircle, X } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";

interface MessageToastProps {
  senderName: string;
  senderAvatarUrl: string | null;
  threadId: string;
  onDismiss: () => void;
}

function playPingSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
    osc.onended = () => ctx.close();
  } catch {
    /* audio unavailable */
  }
}

export default function MessageToast({ senderName, senderAvatarUrl, onDismiss }: MessageToastProps) {
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;
  const { settings } = useSettings();

  useEffect(() => {
    if (settings.notif_msg_sound) playPingSound();
    const t = setTimeout(() => dismissRef.current(), 4500);
    return () => clearTimeout(t);
  }, [settings.notif_msg_sound]);

  return (
    <div
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[200] md:bottom-6 md:left-auto md:right-6 md:translate-x-0"
      style={{ animation: "msgToastIn 0.3s cubic-bezier(0.34,1.56,0.64,1) both" }}
    >
      <style>{`
        @keyframes msgToastIn {
          from { opacity: 0; transform: translateY(12px) scale(0.92); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
      `}</style>
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#1e1810]/95 backdrop-blur-md shadow-2xl px-4 py-3 max-w-xs">
        <div className="relative shrink-0">
          {senderAvatarUrl ? (
            <img
              src={senderAvatarUrl}
              alt={senderName}
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : (
            <div className="h-9 w-9 rounded-full bg-stone-700 flex items-center justify-center text-sm font-bold text-amber-300">
              {senderName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500">
            <MessageCircle size={9} className="text-white" />
          </span>
        </div>

        <Link
          href="/messages"
          onClick={onDismiss}
          className="flex-1 min-w-0"
        >
          <p className="text-xs font-semibold text-amber-100 truncate">{senderName}</p>
          <p className="text-[11px] text-stone-400">sent you a message</p>
        </Link>

        <button
          onClick={onDismiss}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-stone-500 hover:text-stone-300 hover:bg-white/10 transition-colors"
          aria-label="Dismiss"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}
