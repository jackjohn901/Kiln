/**
 * Single source of truth for notification types and their icon/color presentation.
 *
 * Both the web NotificationPanel and the mobile notifications screen consume from
 * here. Adding a new notification type to `NotificationType` forces a compile
 * error in `NOTIFICATION_ICONS` (and in each platform's icon-name lookup) until
 * the new type is mapped — so the web and mobile icon sets can never silently
 * drift apart again.
 */

export type NotificationType =
  | "follow"
  | "like"
  | "comment"
  | "commission"
  | "tip"
  | "workshop"
  | "drop"
  | "auction"
  | "subscription"
  | "sale"
  | "workshop_booking"
  | "commission_payment"
  | "message"
  | "post_published"
  | "repost"
  | "shoutout"
  | "mention"

/**
 * Platform-agnostic, concept-based icon identifiers. Each platform maps these to
 * a glyph from its own icon library (lucide-react on web, Feather on mobile),
 * because the two libraries do not share an icon set. Keeping the identifier
 * concept-based (not glyph-based) means most new notification types can reuse an
 * existing icon and require zero per-platform changes.
 */
export type NotificationIconName =
  | "follow"
  | "like"
  | "comment"
  | "craft"
  | "money"
  | "calendar"
  | "purchase"
  | "drop"
  | "premium"
  | "auction"
  | "message"
  | "repost"
  | "shoutout"
  | "default";

export interface NotificationIconConfig {
  /** Concept-based icon identifier, mapped to a real glyph per platform. */
  icon: NotificationIconName;
  /** Hex accent color used for the glyph and (tinted) for its background circle. */
  color: string;
}

export const NOTIFICATION_ICONS: Record<NotificationType, NotificationIconConfig> = {
  follow: { icon: "follow", color: "#60a5fa" },
  like: { icon: "like", color: "#fb7185" },
  comment: { icon: "comment", color: "#c084fc" },
  commission: { icon: "craft", color: "#fbbf24" },
  commission_payment: { icon: "money", color: "#34d399" },
  tip: { icon: "money", color: "#34d399" },
  workshop: { icon: "calendar", color: "#38bdf8" },
  workshop_booking: { icon: "calendar", color: "#38bdf8" },
  sale: { icon: "purchase", color: "#4ade80" },
  drop: { icon: "drop", color: "#fb923c" },
  subscription: { icon: "premium", color: "#fcd34d" },
  auction: { icon: "auction", color: "#c084fc" },
  message: { icon: "message", color: "#94a3b8" },
  post_published: { icon: "drop", color: "#f59e0b" },
  repost: { icon: "repost", color: "#34d399" },
  shoutout: { icon: "shoutout", color: "#f59e0b" },
  mention: { icon: "comment", color: "#c084fc" },
};

/** Fallback used when a runtime notification type is not in `NotificationType`. */
export const DEFAULT_NOTIFICATION_ICON: NotificationIconConfig = {
  icon: "default",
  color: "#a8a29e",
};

/** Resolve the icon config for any (possibly unknown) runtime type string. */
export function getNotificationIcon(type: string): NotificationIconConfig {
  return (
    NOTIFICATION_ICONS[type as NotificationType] ?? DEFAULT_NOTIFICATION_ICON
  );
}
