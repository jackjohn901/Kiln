import { useEffect, useCallback, useState } from "react";
import { useLocation } from "wouter";
import { ShoppingBag } from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { toast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

function relativeLabel(since: Date): string {
  const diffMs = Date.now() - since.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin === 1) return "1 min ago";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr === 1) return "1 hr ago";
  return `${diffHr} hr ago`;
}

function RelativeTime({ since }: { since: Date }) {
  const [label, setLabel] = useState(() => relativeLabel(since));

  useEffect(() => {
    const id = setInterval(() => setLabel(relativeLabel(since)), 30_000);
    return () => clearInterval(id);
  }, [since]);

  return <span className="text-xs text-stone-500">{label}</span>;
}

export default function SaleNotificationListener() {
  const { subscribe } = useWebSocket();
  const [, navigate] = useLocation();

  const handleNotification = useCallback(
    (evt: Record<string, unknown>) => {
      const notifType = evt.notifType as string | undefined;
      if (notifType !== "sale") return;

      const text = (evt.text as string | undefined) ?? "You have a new sale!";
      const link = (evt.link as string | undefined) ?? "/earnings";
      const fromName = (evt.fromName as string | undefined) ?? "A buyer";
      const saleTime = new Date();

      toast({
        title: (
          <span className="flex items-center gap-2">
            <ShoppingBag size={15} className="text-green-400 shrink-0" />
            <span className="text-green-300 font-semibold">New Sale!</span>
          </span>
        ) as unknown as string,
        description: (
          <span className="flex flex-col gap-0.5">
            <span className="text-stone-300">
              <span className="font-medium text-stone-200">{fromName}</span>{" "}
              {text.replace(/^New sale:\s*/i, "")}
            </span>
            <RelativeTime since={saleTime} />
          </span>
        ) as unknown as string,
        action: (
          <ToastAction
            altText="View earnings"
            onClick={() => navigate(link)}
            className="border-green-500/40 text-green-300 hover:bg-green-500/10"
          >
            View
          </ToastAction>
        ),
      });
    },
    [navigate],
  );

  useEffect(() => {
    return subscribe("notification", handleNotification);
  }, [subscribe, handleNotification]);

  return null;
}
