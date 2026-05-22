import { useEffect, useRef } from "react";
import { X, Bell, Heart, MessageCircle, UserPlus, Hammer, DollarSign, Calendar } from "lucide-react";
import { useSocial, KilnNotification } from "@/contexts/SocialContext";
import { useLocation } from "wouter";
import CommissionInlineActions from "@/components/CommissionInlineActions";
import RelativeTime, { relativeLabel } from "@/components/RelativeTime";


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
  return <div className={`${cls} bg-stone-700`}><Bell size={13} className="text-stone-400" /></div>;
}

interface Props {
  onClose: () => void;
}

export default function NotificationPanel({ onClose }: Props) {
  const { notifications, markRead, markAllRead, unreadCount } = useSocial();
  const [, navigate] = useLocation();
  const panelRef = useRef<HTMLDivElement>(null);

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
    if (n.link) {
      navigate(n.link);
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

      <div className="overflow-y-auto" style={{ maxHeight: "calc(70vh - 52px)" }}>
        {notifications.length === 0 ? (
          <div className="py-12 text-center">
            <Bell size={28} className="text-stone-700 mx-auto mb-2" />
            <p className="text-sm text-stone-500">No notifications yet</p>
          </div>
        ) : (
          notifications.map((n) => {
            const isCommission = n.type === "commission" && !!n.commissionId;
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
                    <CommissionInlineActions commissionId={n.commissionId!} />
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
