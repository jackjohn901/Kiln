import { useEffect, useRef, useState } from "react";
import { X, Bell, Heart, MessageCircle, UserPlus, Hammer, DollarSign, Calendar, ShoppingBag, Zap, Star, BellOff } from "lucide-react";
import { useSocial, KilnNotification } from "@/contexts/SocialContext";
import { useSettings, PUSH_KEYS } from "@/contexts/SettingsContext";
import { useLocation } from "wouter";
import CommissionInlineActions from "@/components/CommissionInlineActions";
import RelativeTime, { relativeLabel } from "@/components/RelativeTime";


const PAUSED_BANNER_DISMISS_KEY = "kiln_notif_paused_banner_dismissed_v1";

const SALE_FALLBACK_LINK = "/earnings";

const TYPE_FALLBACK_LINKS: Partial<Record<KilnNotification["type"], string>> = {
  sale: SALE_FALLBACK_LINK,
  commission: "/commissions",
  commission_payment: "/commissions",
  workshop_booking: "/workshops",
  tip: "/earnings",
};

function NotifIcon({ type }: { type: KilnNotification["type"] }) {
  const cls = "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0";
  if (type === "follow") return <div className={`${cls} bg-blue-500/20`}><UserPlus size={13} className="text-blue-400" /></div>;
  if (type === "like") return <div className={`${cls} bg-rose-500/20`}><Heart size={13} className="text-rose-400" fill="currentColor" /></div>;
  if (type === "comment") return <div className={`${cls} bg-purple-500/20`}><MessageCircle size={13} className="text-purple-400" /></div>;
  if (type === "commission") return <div className={`${cls} bg-amber-500/20`}><Hammer size={13} className="text-amber-400" /></div>;
  if (type === "tip") return <div className={`${cls} bg-emerald-500/20`}><DollarSign size={13} className="text-emerald-400" /></div>;
  if (type === "workshop") return <div className={`${cls} bg-sky-500/20`}><Calendar size={13} className="text-sky-400" /></div>;
  if (type === "workshop_booking") return <div className={`${cls} bg-sky-500/20`}><Calendar size={13} className="text-sky-400" /></div>;
  if (type === "commission_payment") return <div className={`${cls} bg-emerald-500/20`}><DollarSign size={13} className="text-emerald-400" /></div>;
  if (type === "sale") return <div className={`${cls} bg-green-500/20`}><ShoppingBag size={13} className="text-green-400" /></div>;
  if (type === "drop") return <div className={`${cls} bg-orange-500/20`}><Zap size={13} className="text-orange-400" /></div>;
  if (type === "subscription") return <div className={`${cls} bg-amber-400/20`}><Star size={13} className="text-amber-300" /></div>;
  return <div className={`${cls} bg-stone-700`}><Bell size={13} className="text-stone-400" /></div>;
}

interface Props {
  onClose: () => void;
}

export default function NotificationPanel({ onClose }: Props) {
  const { notifications, markRead, markAllRead, unreadCount } = useSocial();
  const { settings } = useSettings();
  const [, navigate] = useLocation();
  const panelRef = useRef<HTMLDivElement>(null);

  const emailPaused = settings.notif_email_paused;
  const allPushOff = PUSH_KEYS.every((k) => !settings[k]);
  const pausedMessage = emailPaused && allPushOff
    ? "Notifications paused — push off, email paused"
    : emailPaused
      ? "Email notifications paused"
      : allPushOff
        ? "Push notifications are all off"
        : null;

  const [bannerDismissed, setBannerDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(PAUSED_BANNER_DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });

  function dismissBanner() {
    setBannerDismissed(true);
    try { sessionStorage.setItem(PAUSED_BANNER_DISMISS_KEY, "1"); } catch {}
  }

  function goToNotifSettings() {
    navigate("/settings?section=notifications");
    onClose();
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  function handleNotifClick(n: KilnNotification) {
    markRead(n.id);
    const dest = n.link || TYPE_FALLBACK_LINKS[n.type];
    if (dest) {
      navigate(dest);
    }
    onClose();
  }

  return (
    <div
      ref={panelRef}
      className="fixed top-14 right-4 z-50 w-80 bg-stone-900 border border-stone-700 rounded-2xl shadow-2xl overflow-hidden"
      style={{ animation: "popDown 0.2s ease-out", maxHeight: "70vh" }}
    >
      <style>{`@keyframes popDown{from{transform:translateY(-8px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>

      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800">
        <div className="flex items-center gap-2">
          <Bell size={15} className="text-amber-400" />
          <span className="text-sm font-semibold text-stone-100">Notifications</span>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-stone-950 text-xs font-bold">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-xs text-amber-400 hover:text-amber-300 transition-colors">
              Mark all read
            </button>
          )}
          <button onClick={onClose} className="text-stone-500 hover:text-stone-300">
            <X size={16} />
          </button>
        </div>
      </div>

      {pausedMessage && !bannerDismissed && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border-b border-amber-500/20">
          <BellOff size={13} className="text-amber-400 flex-shrink-0" />
          <div className="flex-1 min-w-0 text-xs text-amber-200/90 leading-snug">
            <span>{pausedMessage}</span>
            <span className="text-stone-500"> · </span>
            <button onClick={goToNotifSettings} className="text-amber-300 hover:text-amber-200 font-medium underline underline-offset-2">
              Go to Settings
            </button>
          </div>
          <button
            onClick={dismissBanner}
            aria-label="Dismiss"
            className="text-amber-400/60 hover:text-amber-300 flex-shrink-0"
          >
            <X size={13} />
          </button>
        </div>
      )}

      <div className="overflow-y-auto" style={{ maxHeight: "calc(70vh - 52px)" }}>
        {notifications.length === 0 ? (
          <div className="py-12 text-center">
            <Bell size={28} className="text-stone-700 mx-auto mb-2" />
            <p className="text-sm text-stone-500">No notifications yet</p>
          </div>
        ) : (
          notifications.map((n) => {
            const commissionId = n.commissionId ?? n.link?.match(/\/commissions\/([a-f0-9-]{36})/)?.[1];
            const isCommission = n.type === "commission" && !!commissionId;
            if (isCommission) {
              return (
                <div
                  key={n.id}
                  className={`w-full text-left flex items-start gap-3 px-4 py-3 border-b border-stone-800/50 ${!n.read ? "bg-amber-500/5" : ""}`}
                >
                  <NotifIcon type={n.type} />
                  <div className="flex-1 min-w-0">
                    <button
                      className="w-full text-left"
                      onClick={() => handleNotifClick(n)}
                    >
                      <p className={`text-xs leading-snug ${n.read ? "text-stone-400" : "text-stone-200"}`}>{n.text}</p>
                      <p className="text-xs text-stone-600 mt-0.5"><RelativeTime since={n.createdAt} className="" /></p>
                    </button>
                    <CommissionInlineActions commissionId={commissionId!} />
                  </div>
                  {!n.read && <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0 mt-1" />}
                </div>
              );
            }

            return (
              <button
                key={n.id}
                onClick={() => handleNotifClick(n)}
                className={`w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-stone-800 transition-colors border-b border-stone-800/50 ${!n.read ? "bg-amber-500/5" : ""}`}
              >
                <NotifIcon type={n.type} />
                <div className="flex-1 min-w-0">
                  <p className={`text-xs leading-snug ${n.read ? "text-stone-400" : "text-stone-200"}`}>{n.text}</p>
                  <p className="text-xs text-stone-600 mt-0.5"><RelativeTime since={n.createdAt} className="" /></p>
                </div>
                {!n.read && <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0 mt-1" />}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
