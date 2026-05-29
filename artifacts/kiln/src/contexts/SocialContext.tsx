import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/useWebSocket";

export interface KilnComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string;
  text: string;
  likes: number;
  createdAt: string;
}

export interface KilnNotification {
  id: string;
  type: "follow" | "like" | "comment" | "commission" | "tip" | "workshop" | "drop" | "subscription" | "sale" | "workshop_booking" | "commission_payment" | "message";
  fromId: string;
  fromName: string;
  fromAvatarUrl: string;
  text: string;
  link?: string;
  commissionId?: string;
  imageUrl?: string;
  read: boolean;
  emailSkipped?: boolean;
  createdAt: string;
}

export interface CommissionInquiry {
  id: string;
  toArtistId: string;
  toArtistName: string;
  fromName: string;
  fromEmail: string;
  fromHandle?: string;
  fromArtistId?: string;
  type: "custom" | "series" | "workshop" | "reproduction";
  description: string;
  budget: string;
  timeline: string;
  dimensions?: string;
  status: "pending" | "accepted" | "declined" | "quoted";
  quote?: CommissionQuote;
  createdAt: string;
}

export interface TipRecord {
  id: string;
  toArtistId: string;
  toArtistName: string;
  amount: number;
  message?: string;
  createdAt: string;
}

export interface CommissionQuote {
  price: string;
  paymentSchedule: string;
  deliveryDate: string;
  terms: string;
  sentAt: string;
}

export interface ShopReview {
  id: string;
  listingId: string;
  fromName: string;
  fromAvatarUrl: string;
  rating: number;
  text: string;
  createdAt: string;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  attachmentUrl?: string;
  createdAt: string;
  read: boolean;
}

export interface MessageThread {
  id: string;
  participantId: string;
  participantName: string;
  participantAvatar: string;
  messages: DirectMessage[];
  lastMessageAt: string;
}

export type CommissionStatus = "open" | "waitlisted" | "closed";

const VERIFIED_ARTIST_IDS = [
  "alex-bernstein",
  "lino-tagliapietra",
  "william-morris",
  "dante-marioni",
  "richard-royal",
  "john-kiley",
  "caleb-siemon",
  "erica-rosenfeld",
  "laura-donefer",
  "michael-rogers",
];



interface RepostRecord {
  reelId: string;
  artistId: string;
  artistName: string;
  caption: string;
  thumbnailUrl: string;
  repostedAt: string;
}

interface ActivityItem {
  id: string;
  type: "like" | "save" | "follow" | "repost";
  actorId: string;
  actorName: string;
  actorAvatar: string;
  targetId: string;
  targetName: string;
  targetLink: string;
  thumbnailUrl?: string;
  createdAt: string;
}

interface StreakData {
  current: number;
  longest: number;
  lastPostDate: string | null;
}

interface SocialState {
  following: string[];
  notifications: KilnNotification[];
  comments: Record<string, KilnComment[]>;
  commissions: CommissionInquiry[];
  receivedInquiries: CommissionInquiry[];
  tips: TipRecord[];
  myCommissionStatus: CommissionStatus;
  artistCommissionStatuses: Record<string, CommissionStatus>;
  reelLikes: Record<string, boolean>;
  reelSaves: Record<string, boolean>;
  reelReposts: Record<string, boolean>;
  dropsWaitlisted: Record<string, boolean>;
  subscriptions: string[];
  threads: MessageThread[];
  verifiedArtists: string[];
  reviews: ShopReview[];
  blocked: string[];
  muted: string[];
  reposts: RepostRecord[];
  activityFeed: ActivityItem[];
  streak: StreakData;
  artistAlerts: string[];
}

interface SocialContextType extends SocialState {
  followArtist: (artistId: string, artistName: string, avatarUrl: string) => void;
  unfollowArtist: (artistId: string) => void;
  isFollowing: (artistId: string) => boolean;
  addComment: (postId: string, authorId: string, authorName: string, authorAvatar: string, text: string) => void;
  getComments: (postId: string) => KilnComment[];
  likeComment: (postId: string, commentId: string) => void;
  addNotification: (n: Omit<KilnNotification, "id" | "read" | "createdAt">) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  markTypeRead: (type: KilnNotification["type"]) => void;
  markCommissionPaymentRead: (commissionId: string) => void;
  markLinkRead: (path: string) => void;
  unreadCount: number;
  unreadWorkshopCount: number;
  unreadCommissionPaymentCount: number;
  setMyCommissionStatus: (status: CommissionStatus) => void;
  getArtistCommissionStatus: (artistId: string) => CommissionStatus;
  sendCommissionInquiry: (inquiry: Omit<CommissionInquiry, "id" | "status" | "createdAt">) => void;
  acceptInquiry: (id: string) => void;
  declineInquiry: (id: string) => void;
  sendTip: (toArtistId: string, toArtistName: string, amount: number, message?: string) => void;
  toggleReelLike: (reelId: string) => void;
  toggleReelSave: (reelId: string) => void;
  toggleReelRepost: (reelId: string, reel: { artistId: string; artistName: string; caption: string; thumbnail: string }) => void;
  joinDropWaitlist: (dropId: string, dropTitle: string, artistName: string) => void;
  leaveDropWaitlist: (dropId: string) => void;
  isOnDropWaitlist: (dropId: string) => boolean;
  subscribe: (artistId: string, artistName: string, avatarUrl: string) => void;
  unsubscribe: (artistId: string) => void;
  isSubscribed: (artistId: string) => boolean;
  isVerified: (artistId: string) => boolean;
  sendDirectMessage: (toId: string, toName: string, toAvatar: string, text: string, attachmentUrl?: string) => void;
  getThread: (participantId: string) => MessageThread | undefined;
  unreadMessageCount: number;
  markThreadRead: (threadId: string) => void;
  refreshUnreadMessageCount: () => void;
  decrementUnreadMessageCount: (n: number) => void;
  lastNewMessagePing: { senderName: string; senderAvatarUrl: string | null; threadId: string } | null;
  clearNewMessagePing: () => void;
  setActiveMessageThreadId: (id: string | null) => void;
  quoteInquiry: (id: string, quote: CommissionQuote) => void;
  addReview: (review: Omit<ShopReview, "id" | "createdAt">) => void;
  getReviews: (listingId: string) => ShopReview[];
  blockArtist: (artistId: string) => void;
  unblockArtist: (artistId: string) => void;
  isBlocked: (artistId: string) => boolean;
  muteArtist: (artistId: string) => void;
  unmuteArtist: (artistId: string) => void;
  isMuted: (artistId: string) => boolean;
  recordPost: () => void;
  toggleArtistAlert: (artistId: string) => void;
  hasArtistAlert: (artistId: string) => boolean;
}

const SocialContext = createContext<SocialContextType>({} as SocialContextType);

const STORAGE_KEY = "kiln_social_v4";



function defaultState(): SocialState {
  return {
    following: [],
    notifications: [
      {
        id: "seed-notif-1",
        type: "follow",
        fromId: "system",
        fromName: "Kiln",
        fromAvatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=60&h=60&fit=crop&seed=kiln",
        text: "Welcome to Kiln — the home for craft artists. Start by following artists you love.",
        read: false,
        createdAt: new Date().toISOString(),
      },
    ],
    comments: {},
    commissions: [],
    receivedInquiries: [],
    tips: [],
    myCommissionStatus: "open",
    artistCommissionStatuses: {},
    reelLikes: {},
    reelSaves: {},
    reelReposts: {},
    dropsWaitlisted: {},
    subscriptions: [],
    threads: [],
    verifiedArtists: VERIFIED_ARTIST_IDS,
    reviews: [],
    blocked: [],
    muted: [],
    reposts: [],
    activityFeed: [],
    streak: { current: 0, longest: 0, lastPostDate: null },
    artistAlerts: [],
  };
}

function readState(): SocialState {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (!s) return defaultState();
    const parsed = JSON.parse(s) as Partial<SocialState>;
    const def = defaultState();
    return {
      ...def,
      ...parsed,
      artistCommissionStatuses: { ...def.artistCommissionStatuses, ...(parsed.artistCommissionStatuses ?? {}) },
      comments: { ...def.comments, ...(parsed.comments ?? {}) },
      receivedInquiries: def.receivedInquiries,
      threads: parsed.threads?.length ? parsed.threads : def.threads,
      verifiedArtists: def.verifiedArtists,
      reviews: parsed.reviews ?? [],
    blocked: parsed.blocked ?? [],
    muted: parsed.muted ?? [],
    reposts: parsed.reposts ?? [],
    activityFeed: parsed.activityFeed ?? [],
    reelReposts: parsed.reelReposts ?? {},
    streak: parsed.streak ?? { current: 0, longest: 0, lastPostDate: null },
    artistAlerts: parsed.artistAlerts ?? [],
    };
  } catch {
    return defaultState();
  }
}

function writeState(state: SocialState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function SocialProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SocialState>(readState);
  const [apiUnreadMessageCount, setApiUnreadMessageCount] = useState<number | null>(null);
  const { isAuthenticated } = useAuth();
  const { subscribe: wsSubscribe } = useWebSocket();

  const fetchUnreadMessageCount = useCallback(() => {
    fetch("/api/messages/unread-count", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { unreadCount?: number } | null) => {
        if (data && typeof data.unreadCount === "number") {
          setApiUnreadMessageCount(data.unreadCount);
        }
      })
      .catch(() => {});
  }, []);

  function update(updater: (prev: SocialState) => SocialState) {
    setState((prev) => {
      const next = updater(prev);
      writeState(next);
      return next;
    });
  }

  // Fetch real unread message count on login
  useEffect(() => {
    if (!isAuthenticated) {
      setApiUnreadMessageCount(null);
      return;
    }
    fetchUnreadMessageCount();
  }, [isAuthenticated, fetchUnreadMessageCount]);

  // Track new-message pings for the nav toast
  const [lastNewMessagePing, setLastNewMessagePing] = useState<{
    senderName: string;
    senderAvatarUrl: string | null;
    threadId: string;
  } | null>(null);

  // Ref so WS handler always sees the latest active thread without needing re-subscription
  const activeMessageThreadIdRef = useRef<string | null>(null);

  const clearNewMessagePing = useCallback(() => setLastNewMessagePing(null), []);

  const setActiveMessageThreadId = useCallback((id: string | null) => {
    activeMessageThreadIdRef.current = id;
    // Clear any stale ping for the thread being opened
    if (id !== null) setLastNewMessagePing(prev => (prev?.threadId === id ? null : prev));
  }, []);

  // Update unread message count when an incoming message WebSocket event arrives,
  // and set a ping so Nav can show a toast.
  // Skip both when the message belongs to the thread the user is currently viewing —
  // Messages.tsx handles marking it read and refreshing the count for that case.
  useEffect(() => {
    const unsub = wsSubscribe("message", (evt) => {
      const e = evt as { threadId?: string; senderId?: string; senderName?: string; senderAvatarUrl?: string | null };
      if (e.threadId && e.threadId !== activeMessageThreadIdRef.current) {
        // Optimistically increment so the badge updates instantly, then reconcile
        // with the server count (handles rapid multi-message bursts correctly).
        setApiUnreadMessageCount((prev) => (prev ?? 0) + 1);
        fetchUnreadMessageCount();
        if (e.senderName) {
          setLastNewMessagePing({
            senderName: e.senderName,
            senderAvatarUrl: e.senderAvatarUrl ?? null,
            threadId: e.threadId,
          });
        }
      }
    });
    return unsub;
  }, [wsSubscribe, fetchUnreadMessageCount]);

  // Sync from server on login: load real following IDs + notifications
  useEffect(() => {
    if (!isAuthenticated) return;

    fetch("/api/me/following", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { followingIds?: string[] } | null) => {
        if (data?.followingIds?.length) {
          update((s) => ({
            ...s,
            following: Array.from(new Set([...s.following, ...data.followingIds!])),
          }));
        }
      })
      .catch(() => {});

    fetch("/api/me/subscriptions", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { subscriptions?: Array<{ artistId: string }> } | null) => {
        if (!data?.subscriptions?.length) return;
        const artistIds = data.subscriptions.map((s) => s.artistId);
        update((s) => ({
          ...s,
          subscriptions: Array.from(new Set([...s.subscriptions, ...artistIds])),
        }));
      })
      .catch(() => {});

    fetch("/api/notifications", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { notifications?: Array<{ id: string; type: string; fromId: string; fromName: string; fromAvatarUrl: string | null; text: string; link?: string | null; imageUrl?: string | null; read: boolean; emailSkipped?: boolean; createdAt: string }> } | null) => {
        if (!data?.notifications?.length) return;
        const apiNotifs: KilnNotification[] = data.notifications.map((n) => {
          const link = n.link ?? undefined;
          const commissionMatch = link?.match(/\/commissions\/([a-f0-9-]{36})/);
          return {
            id: n.id,
            type: n.type as KilnNotification["type"],
            fromId: n.fromId,
            fromName: n.fromName,
            fromAvatarUrl: n.fromAvatarUrl ?? "",
            text: n.text,
            link,
            commissionId: commissionMatch?.[1],
            imageUrl: n.imageUrl ?? undefined,
            read: n.read,
            emailSkipped: n.emailSkipped ?? false,
            createdAt: n.createdAt,
          };
        });
        update((s) => {
          const apiIds = new Set(apiNotifs.map((n) => n.id));
          const localOnly = s.notifications.filter((n) => !apiIds.has(n.id));
          return { ...s, notifications: [...apiNotifs, ...localOnly] };
        });
      })
      .catch(() => {});
  }, [isAuthenticated]);

  const followArtist = useCallback((artistId: string, artistName: string, avatarUrl: string) => {
    update((s) => ({
      ...s,
      following: s.following.includes(artistId) ? s.following : [...s.following, artistId],
      notifications: [
        { id: genId(), type: "follow" as const, fromId: "system", fromName: artistName, fromAvatarUrl: avatarUrl, text: `You are now following ${artistName}`, link: `/artists/${artistId}`, read: true, createdAt: new Date().toISOString() },
        ...s.notifications,
      ],
    }));
    fetch(`/api/users/${artistId}/follow`, { method: "POST", credentials: "include" }).catch(() => {});
  }, []);

  const unfollowArtist = useCallback((artistId: string) => {
    update((s) => ({ ...s, following: s.following.filter((id) => id !== artistId) }));
    fetch(`/api/users/${artistId}/follow`, { method: "POST", credentials: "include" }).catch(() => {});
  }, []);

  const isFollowing = useCallback((artistId: string) => state.following.includes(artistId), [state.following]);

  const addComment = useCallback((postId: string, authorId: string, authorName: string, authorAvatar: string, text: string) => {
    const comment: KilnComment = { id: genId(), postId, authorId, authorName, authorAvatarUrl: authorAvatar, text, likes: 0, createdAt: new Date().toISOString() };
    update((s) => ({ ...s, comments: { ...s.comments, [postId]: [comment, ...(s.comments[postId] ?? [])] } }));
    if (postId.startsWith("db-")) {
      fetch(`/api/posts/${postId.slice(3)}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text }),
      })
        .then((r) => { if (!r.ok) throw new Error(); })
        .catch(() => {
          update((s) => ({ ...s, comments: { ...s.comments, [postId]: (s.comments[postId] ?? []).filter((c) => c.id !== comment.id) } }));
          toast({ title: "Couldn\u2019t post comment", description: "Please try again.", variant: "destructive" });
        });
    }
  }, []);

  const getComments = useCallback((postId: string) => state.comments[postId] ?? [], [state.comments]);

  const likeComment = useCallback((postId: string, commentId: string) => {
    update((s) => ({
      ...s,
      comments: { ...s.comments, [postId]: (s.comments[postId] ?? []).map((c) => c.id === commentId ? { ...c, likes: c.likes + 1 } : c) },
    }));
  }, []);

  const addNotification = useCallback((n: Omit<KilnNotification, "id" | "read" | "createdAt">) => {
    update((s) => ({
      ...s,
      notifications: [{ ...n, id: genId(), read: false, createdAt: new Date().toISOString() }, ...s.notifications.slice(0, 99)],
    }));
  }, []);

  // Subscribe to server-pushed notification events so the bell badge and
  // notification list update in real time without a page refresh.
  useEffect(() => {
    const unsub = wsSubscribe("notification", (evt) => {
      const e = evt as { text?: string; link?: string; notifType?: string; fromName?: string; fromId?: string; fromAvatarUrl?: string };
      addNotification({
        type: (e.notifType as KilnNotification["type"]) ?? "follow",
        fromId: e.fromId ?? "",
        fromName: e.fromName ?? "",
        fromAvatarUrl: e.fromAvatarUrl ?? "",
        text: e.text ?? "You have a new notification",
        link: e.link ?? undefined,
      });
    });
    return unsub;
  }, [wsSubscribe, addNotification]);

  const markRead = useCallback((id: string) => {
    fetch(`/api/notifications/${id}/read`, { method: "PATCH", credentials: "include" }).catch(() => {});
    update((s) => ({ ...s, notifications: s.notifications.map((n) => n.id === id ? { ...n, read: true } : n) }));
  }, []);

  const markAllRead = useCallback(() => {
    update((s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, read: true })) }));
    fetch("/api/notifications/read-all", { method: "POST", credentials: "include" }).catch(() => {});
  }, []);

  const markTypeRead = useCallback((type: KilnNotification["type"]) => {
    update((s) => ({
      ...s,
      notifications: s.notifications.map((n) =>
        n.type === type && !n.read ? { ...n, read: true } : n
      ),
    }));
  }, []);

  const markCommissionPaymentRead = useCallback((commissionId: string) => {
    update((s) => {
      const toMark = s.notifications.filter(
        (n) => n.type === "commission_payment" && n.commissionId === commissionId && !n.read
      );
      toMark.forEach((n) => {
        fetch(`/api/notifications/${n.id}/read`, { method: "PATCH", credentials: "include" }).catch(() => {});
      });
      return {
        ...s,
        notifications: s.notifications.map((n) =>
          n.type === "commission_payment" && n.commissionId === commissionId && !n.read
            ? { ...n, read: true }
            : n
        ),
      };
    });
  }, []);

  const markLinkRead = useCallback((path: string) => {
    update((s) => {
      const toMark = s.notifications.filter((n) => !n.read && n.link === path);
      toMark.forEach((n) => {
        fetch(`/api/notifications/${n.id}/read`, { method: "PATCH", credentials: "include" }).catch(() => {});
      });
      if (toMark.length === 0) return s;
      return {
        ...s,
        notifications: s.notifications.map((n) =>
          !n.read && n.link === path ? { ...n, read: true } : n
        ),
      };
    });
  }, []);

  const setMyCommissionStatus = useCallback((status: CommissionStatus) => {
    update((s) => ({ ...s, myCommissionStatus: status }));
  }, []);

  const getArtistCommissionStatus = useCallback(
    (artistId: string): CommissionStatus => state.artistCommissionStatuses[artistId] ?? "open",
    [state.artistCommissionStatuses]
  );

  const sendCommissionInquiry = useCallback((inquiry: Omit<CommissionInquiry, "id" | "status" | "createdAt">) => {
    const newInquiry: CommissionInquiry = { ...inquiry, id: genId(), status: "pending", createdAt: new Date().toISOString() };
    update((s) => ({ ...s, commissions: [newInquiry, ...s.commissions] }));
    fetch("/api/commissions", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        artistId: inquiry.toArtistId,
        description: inquiry.description,
        budget: inquiry.budget ?? null,
        timeline: inquiry.timeline ?? null,
      }),
    })
      .then((r) => { if (!r.ok) throw new Error(); })
      .catch(() => {
        update((s) => ({ ...s, commissions: s.commissions.filter((c) => c.id !== newInquiry.id) }));
        toast({ title: "Couldn\u2019t send your request", description: "Please try again.", variant: "destructive" });
      });
  }, []);

  const acceptInquiry = useCallback((id: string) => {
    update((s) => ({
      ...s,
      receivedInquiries: s.receivedInquiries.map((i) => i.id === id ? { ...i, status: "accepted" as const } : i),
    }));
  }, []);

  const declineInquiry = useCallback((id: string) => {
    update((s) => ({
      ...s,
      receivedInquiries: s.receivedInquiries.map((i) => i.id === id ? { ...i, status: "declined" as const } : i),
    }));
  }, []);

  const sendTip = useCallback((toArtistId: string, toArtistName: string, amount: number, message?: string) => {
    const tip: TipRecord = { id: genId(), toArtistId, toArtistName, amount, message, createdAt: new Date().toISOString() };
    update((s) => ({ ...s, tips: [tip, ...s.tips] }));
  }, []);

  const toggleReelLike = useCallback((reelId: string) => {
    update((s) => ({ ...s, reelLikes: { ...s.reelLikes, [reelId]: !s.reelLikes[reelId] } }));
    if (reelId.startsWith("db-")) {
      fetch(`/api/posts/${reelId.slice(3)}/like`, { method: "POST", credentials: "include" }).catch(() => {});
    }
  }, []);

  const toggleReelSave = useCallback((reelId: string) => {
    update((s) => ({ ...s, reelSaves: { ...s.reelSaves, [reelId]: !s.reelSaves[reelId] } }));
    if (reelId.startsWith("db-")) {
      fetch(`/api/posts/${reelId.slice(3)}/save`, { method: "POST", credentials: "include" }).catch(() => {});
    }
  }, []);

  const toggleReelRepost = useCallback((reelId: string, reel: { artistId: string; artistName: string; caption: string; thumbnail: string }) => {
    update((s) => {
      const alreadyReposted = !!s.reelReposts[reelId];
      const newReposts = alreadyReposted
        ? s.reposts.filter((r) => r.reelId !== reelId)
        : [{ reelId, artistId: reel.artistId, artistName: reel.artistName, caption: reel.caption, thumbnailUrl: reel.thumbnail, repostedAt: new Date().toISOString() }, ...s.reposts];
      const newActivity: ActivityItem[] = alreadyReposted ? s.activityFeed : [
        { id: genId(), type: "repost", actorId: "__current_user__", actorName: "You", actorAvatar: "", targetId: reelId, targetName: `${reel.artistName}'s reel`, targetLink: "/", thumbnailUrl: reel.thumbnail, createdAt: new Date().toISOString() },
        ...s.activityFeed,
      ];
      return { ...s, reelReposts: { ...s.reelReposts, [reelId]: !alreadyReposted }, reposts: newReposts, activityFeed: newActivity };
    });
  }, []);

  const blockArtist = useCallback((artistId: string) => {
    update((s) => ({
      ...s,
      blocked: s.blocked.includes(artistId) ? s.blocked : [...s.blocked, artistId],
      following: s.following.filter((id) => id !== artistId),
    }));
  }, []);

  const unblockArtist = useCallback((artistId: string) => {
    update((s) => ({ ...s, blocked: s.blocked.filter((id) => id !== artistId) }));
  }, []);

  const isBlocked = useCallback((artistId: string) => state.blocked.includes(artistId), [state.blocked]);

  const muteArtist = useCallback((artistId: string) => {
    update((s) => ({ ...s, muted: s.muted.includes(artistId) ? s.muted : [...s.muted, artistId] }));
  }, []);

  const unmuteArtist = useCallback((artistId: string) => {
    update((s) => ({ ...s, muted: s.muted.filter((id) => id !== artistId) }));
  }, []);

  const isMuted = useCallback((artistId: string) => state.muted.includes(artistId), [state.muted]);

  const toggleArtistAlert = useCallback((artistId: string) => {
    update((s) => ({
      ...s,
      artistAlerts: s.artistAlerts.includes(artistId)
        ? s.artistAlerts.filter((id) => id !== artistId)
        : [...s.artistAlerts, artistId],
    }));
  }, []);

  const hasArtistAlert = useCallback((artistId: string) => state.artistAlerts.includes(artistId), [state.artistAlerts]);

  const recordPost = useCallback(() => {
    update((s) => {
      const today = new Date().toDateString();
      const lastDate = s.streak.lastPostDate;
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      let current = s.streak.current;
      if (lastDate === today) return s;
      if (lastDate === yesterday) current += 1;
      else current = 1;
      const longest = Math.max(current, s.streak.longest);
      return { ...s, streak: { current, longest, lastPostDate: today } };
    });
  }, []);

  const joinDropWaitlist = useCallback((dropId: string, dropTitle: string, artistName: string) => {
    update((s) => ({
      ...s,
      dropsWaitlisted: { ...s.dropsWaitlisted, [dropId]: true },
      notifications: [
        { id: genId(), type: "drop" as const, fromId: "system", fromName: artistName, fromAvatarUrl: "", text: `You're on the waitlist for "${dropTitle}"`, link: "/drops", read: false, createdAt: new Date().toISOString() },
        ...s.notifications,
      ],
    }));
  }, []);

  const leaveDropWaitlist = useCallback((dropId: string) => {
    update((s) => ({ ...s, dropsWaitlisted: { ...s.dropsWaitlisted, [dropId]: false } }));
  }, []);

  const isOnDropWaitlist = useCallback((dropId: string) => !!state.dropsWaitlisted[dropId], [state.dropsWaitlisted]);

  const subscribe = useCallback((artistId: string, artistName: string, avatarUrl: string) => {
    update((s) => ({
      ...s,
      subscriptions: s.subscriptions.includes(artistId) ? s.subscriptions : [...s.subscriptions, artistId],
      notifications: [
        { id: genId(), type: "subscription" as const, fromId: "system", fromName: artistName, fromAvatarUrl: avatarUrl, text: `You're now a Studio Supporter of ${artistName}`, link: `/artists/${artistId}`, read: false, createdAt: new Date().toISOString() },
        ...s.notifications,
      ],
    }));
  }, []);

  const unsubscribe = useCallback((artistId: string) => {
    update((s) => ({ ...s, subscriptions: s.subscriptions.filter((id) => id !== artistId) }));
  }, []);

  const isSubscribed = useCallback((artistId: string) => state.subscriptions.includes(artistId), [state.subscriptions]);

  const isVerified = useCallback((artistId: string) => state.verifiedArtists.includes(artistId), [state.verifiedArtists]);

  const sendDirectMessage = useCallback((toId: string, toName: string, toAvatar: string, text: string, attachmentUrl?: string) => {
    const msg: DirectMessage = {
      id: genId(),
      senderId: "__current_user__",
      senderName: "You",
      senderAvatar: "",
      text,
      attachmentUrl,
      createdAt: new Date().toISOString(),
      read: true,
    };
    update((s) => {
      const existingIdx = s.threads.findIndex((t) => t.participantId === toId);
      if (existingIdx >= 0) {
        const updated = [...s.threads];
        updated[existingIdx] = { ...updated[existingIdx], messages: [...updated[existingIdx].messages, msg], lastMessageAt: msg.createdAt };
        return { ...s, threads: updated };
      } else {
        const newThread: MessageThread = {
          id: genId(),
          participantId: toId,
          participantName: toName,
          participantAvatar: toAvatar,
          messages: [msg],
          lastMessageAt: msg.createdAt,
        };
        return { ...s, threads: [newThread, ...s.threads] };
      }
    });
  }, []);

  const getThread = useCallback((participantId: string) => state.threads.find((t) => t.participantId === participantId), [state.threads]);

  const markThreadRead = useCallback((threadId: string) => {
    update((s) => ({
      ...s,
      threads: s.threads.map((t) =>
        t.id === threadId ? { ...t, messages: t.messages.map((m) => ({ ...m, read: true })) } : t
      ),
    }));
    // Refresh API count so the nav badge reflects the change immediately
    fetchUnreadMessageCount();
  }, [fetchUnreadMessageCount]);

  const decrementUnreadMessageCount = useCallback((n: number) => {
    if (n <= 0) return;
    setApiUnreadMessageCount((prev) => Math.max(0, (prev ?? 0) - n));
    // Reconcile with server asynchronously
    fetchUnreadMessageCount();
  }, [fetchUnreadMessageCount]);

  const quoteInquiry = useCallback((id: string, quote: CommissionQuote) => {
    let prevInquiry: CommissionInquiry | undefined;
    update((s) => {
      prevInquiry = s.receivedInquiries.find((i) => i.id === id);
      return {
        ...s,
        receivedInquiries: s.receivedInquiries.map((i) =>
          i.id === id ? { ...i, status: "quoted" as const, quote } : i
        ),
      };
    });
    fetch(`/api/commissions/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "quoted",
        quotedPrice: quote.price,
        artistNotes: quote.terms,
        estimatedDelivery: quote.deliveryDate || null,
      }),
    })
      .then((r) => { if (!r.ok) throw new Error(); })
      .catch(() => {
        if (prevInquiry) {
          const restored = prevInquiry;
          update((s) => ({
            ...s,
            receivedInquiries: s.receivedInquiries.map((i) =>
              i.id === id ? restored : i
            ),
          }));
        }
        toast({ title: "Couldn\u2019t send your quote", description: "Please try again.", variant: "destructive" });
      });
  }, []);

  const addReview = useCallback((review: Omit<ShopReview, "id" | "createdAt">) => {
    const newReview: ShopReview = { ...review, id: genId(), createdAt: new Date().toISOString() };
    update((s) => ({ ...s, reviews: [newReview, ...s.reviews] }));
  }, []);

  const getReviews = useCallback(
    (listingId: string) => state.reviews.filter((r) => r.listingId === listingId),
    [state.reviews]
  );

  const unreadCount = state.notifications.filter((n) => !n.read).length;
  const unreadWorkshopCount = state.notifications.filter((n) => !n.read && n.type === "workshop_booking").length;
  const unreadCommissionPaymentCount = state.notifications.filter((n) => !n.read && n.type === "commission_payment").length;
  // Prefer the server-sourced count when authenticated; fall back to local seed thread count otherwise
  const localUnreadMessageCount = state.threads.reduce(
    (sum, t) => sum + t.messages.filter((m) => !m.read && m.senderId !== "__current_user__").length,
    0
  );
  const unreadMessageCount = apiUnreadMessageCount !== null ? apiUnreadMessageCount : localUnreadMessageCount;

  return (
    <SocialContext.Provider
      value={{
        ...state,
        followArtist,
        unfollowArtist,
        isFollowing,
        addComment,
        getComments,
        likeComment,
        addNotification,
        markRead,
        markAllRead,
        markTypeRead,
        markCommissionPaymentRead,
        markLinkRead,
        unreadCount,
        unreadWorkshopCount,
        unreadCommissionPaymentCount,
        setMyCommissionStatus,
        getArtistCommissionStatus,
        sendCommissionInquiry,
        acceptInquiry,
        declineInquiry,
        sendTip,
        toggleReelLike,
        toggleReelSave,
        toggleReelRepost,
        joinDropWaitlist,
        leaveDropWaitlist,
        isOnDropWaitlist,
        subscribe,
        unsubscribe,
        isSubscribed,
        isVerified,
        sendDirectMessage,
        getThread,
        unreadMessageCount,
        markThreadRead,
        refreshUnreadMessageCount: fetchUnreadMessageCount,
        decrementUnreadMessageCount,
        lastNewMessagePing,
        clearNewMessagePing,
        setActiveMessageThreadId,
        quoteInquiry,
        addReview,
        getReviews,
        blockArtist,
        unblockArtist,
        isBlocked,
        muteArtist,
        unmuteArtist,
        isMuted,
        recordPost,
        toggleArtistAlert,
        hasArtistAlert,
      }}
    >
      {children}
    </SocialContext.Provider>
  );
}

export function useSocial() {
  return useContext(SocialContext);
}
