import { useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { ShoppingBag } from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { toast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

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
            <span className="text-xs text-stone-500">just now</span>
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
