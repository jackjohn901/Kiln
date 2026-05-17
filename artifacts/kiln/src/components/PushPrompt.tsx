import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";

const DISMISSED_KEY = "kiln_push_prompt_v1";

export default function PushPrompt() {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "default") return;
    if (localStorage.getItem(DISMISSED_KEY)) return;

    const t = setTimeout(() => setShow(true), 10000);
    return () => clearTimeout(t);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setShow(false);
  }

  async function enable() {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted" && "serviceWorker" in navigator) {
        try {
          const swUrl = `${import.meta.env.BASE_URL}sw.js`;
          const reg = await navigator.serviceWorker.register(swUrl, { scope: import.meta.env.BASE_URL });
          await navigator.serviceWorker.ready;

          const vapidRes = await fetch("/api/push/vapid-key", { credentials: "include" }).catch(() => null);
          const { publicKey } = vapidRes?.ok ? await vapidRes.json() as { publicKey: string } : { publicKey: "" };

          if (publicKey) {
            const sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: publicKey,
            }).catch(() => null);
            if (sub) {
              await fetch("/api/push/subscribe", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(sub.toJSON()),
              }).catch(() => {});
            }
          }
        } catch {
          // service worker push subscribe may fail in dev context — that's OK
        }
      }
    } catch {}
    dismiss();
    setLoading(false);
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-stone-900/95 backdrop-blur-sm px-4 py-3.5 shadow-2xl">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20">
          <Bell size={15} className="text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-stone-100 leading-snug">Stay in the loop</p>
          <p className="text-xs text-stone-500 mt-0.5 leading-snug">
            Get notified when someone likes, comments, or follows you.
          </p>
          <div className="flex gap-2 mt-2.5">
            <button
              onClick={enable}
              disabled={loading}
              className="rounded-full bg-amber-500 px-3.5 py-1 text-xs font-bold text-stone-950 hover:bg-amber-400 transition-colors disabled:opacity-60"
            >
              {loading ? "…" : "Enable"}
            </button>
            <button
              onClick={dismiss}
              className="rounded-full bg-stone-800 px-3.5 py-1 text-xs font-medium text-stone-400 hover:text-stone-200 transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
        <button
          onClick={dismiss}
          className="shrink-0 mt-0.5 text-stone-600 hover:text-stone-400 transition-colors"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
