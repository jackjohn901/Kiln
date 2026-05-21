import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
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
  type: "follow" | "like" | "comment" | "commission" | "tip" | "workshop" | "drop" | "subscription" | "sale" | "workshop_booking" | "commission_payment";
  fromId: string;
  fromName: string;
  fromAvatarUrl: string;
  text: string;
  link?: string;
  read: boolean;
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

const SEED_RECEIVED_INQUIRIES: CommissionInquiry[] = [
  {
    id: "recv-001",
    toArtistId: "__current_user__",
    toArtistName: "You",
    fromName: "Rachel Osei",
    fromEmail: "rachel@collectorsclub.com",
    fromHandle: "rachel-osei",
    type: "custom",
    description: "I've been following your work for two years and would love to commission a custom piece for our new dining room. We're looking for something in your signature style, approximately 18\" tall, in warm amber tones to complement natural wood furniture.",
    budget: "$3,000–$5,000",
    timeline: "3–4 months",
    dimensions: "~18\" H × 10\" W",
    status: "pending",
    createdAt: "2026-05-14T09:30:00Z",
  },
  {
    id: "recv-002",
    toArtistId: "__current_user__",
    toArtistName: "You",
    fromName: "James Whitfield",
    fromEmail: "james@whitfieldgallery.com",
    fromHandle: "whitfield-gallery",
    type: "series",
    description: "We're curating a group show on craft and materiality opening in October. We'd love to discuss including 2–3 pieces from your recent series. We handle shipping and insurance, and we take 40%.",
    budget: "Gallery terms",
    timeline: "By September 1, 2026",
    status: "pending",
    createdAt: "2026-05-13T14:15:00Z",
  },
  {
    id: "recv-003",
    toArtistId: "__current_user__",
    toArtistName: "You",
    fromName: "Mei Lin",
    fromEmail: "mei@designstudio.co",
    fromHandle: "mei-lin",
    type: "custom",
    description: "We're designing a hotel lobby in Portland and are looking for a statement art piece for the entrance. Your work was recommended by two of our other artist partners. Budget is flexible for the right piece.",
    budget: "$8,000–$15,000",
    timeline: "6 months",
    dimensions: "Large-scale, 3'–5' in some dimension",
    status: "accepted",
    createdAt: "2026-05-08T11:00:00Z",
  },
];

const SEED_MESSAGE_THREADS: MessageThread[] = [
  {
    id: "thread-001",
    participantId: "alex-bernstein",
    participantName: "Alex Bernstein",
    participantAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
    lastMessageAt: "2026-05-14T16:20:00Z",
    messages: [
      {
        id: "msg-001",
        senderId: "alex-bernstein",
        senderName: "Alex Bernstein",
        senderAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
        text: "Hey — saw your post from the hot shop yesterday. What temperature are you working at for that blue color? Mine always goes greenish.",
        createdAt: "2026-05-14T14:30:00Z",
        read: true,
      },
      {
        id: "msg-002",
        senderId: "__current_user__",
        senderName: "You",
        senderAvatar: "",
        text: "I'm hitting the cobalt at around 2,100°F and keeping the gather cooler on the outside before I add it. The greenish shift usually means it's picking up iron from the batch — what furnace glass are you using?",
        createdAt: "2026-05-14T15:05:00Z",
        read: true,
      },
      {
        id: "msg-003",
        senderId: "alex-bernstein",
        senderName: "Alex Bernstein",
        senderAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
        text: "Gaffer. Maybe I need a fresher batch. Thanks — that helps.",
        createdAt: "2026-05-14T16:20:00Z",
        read: false,
      },
    ],
  },
  {
    id: "thread-002",
    participantId: "maya-chen",
    participantName: "Maya Chen",
    participantAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80",
    lastMessageAt: "2026-05-12T10:45:00Z",
    messages: [
      {
        id: "msg-004",
        senderId: "maya-chen",
        senderName: "Maya Chen",
        senderAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80",
        text: "Just reserved a spot in your workshop. So excited — I've been wanting to understand reduction firing properly for years.",
        createdAt: "2026-05-12T10:45:00Z",
        read: true,
      },
    ],
  },
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
  unreadCount: number;
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
  sendDirectMessage: (toId: string, toName: string, toAvatar: string, text: string) => void;
  getThread: (participantId: string) => MessageThread | undefined;
  unreadMessageCount: number;
  markThreadRead: (threadId: string) => void;
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

const STORAGE_KEY = "kiln_social_v3";

const SEED_STATUSES: Record<string, CommissionStatus> = {
  "alex-bernstein": "waitlisted",
  "lino-tagliapietra": "closed",
  "william-morris": "closed",
  "dante-marioni": "open",
  "richard-royal": "open",
  "john-kiley": "open",
  "caleb-siemon": "waitlisted",
  "erica-rosenfeld": "open",
  "laura-donefer": "open",
  "michael-rogers": "open",
  "maya-chen": "open",
  "james-okafor": "open",
  "elena-vasquez": "waitlisted",
  "takeshi-mori": "open",
  "sarah-thornton": "open",
  "marcus-williams": "open",
  "ingrid-larsson": "closed",
  "priya-patel": "open",
  "rafael-santos": "waitlisted",
  "anna-kowalski": "open",
  "david-park": "open",
  "yuki-nakamura": "closed",
  "amara-diallo": "open",
  "ben-torres": "open",
  "mateo-garcia": "open",
  "freya-lindqvist": "waitlisted",
  "sonja-berg": "open",
  "kwame-asante": "open",
  "leila-nouri": "open",
  "riku-sato": "closed",
  "celia-moss": "open",
  "tomas-novak": "waitlisted",
  "hana-kim": "open",
  "felix-braun": "open",
  "ines-costa": "open",
  "petra-vance": "open",
};

const SEED_COMMENTS: Record<string, KilnComment[]> = {
  "maya-chen-dQhKVFbpZoQ": [
    { id: "sc1", postId: "maya-chen-dQhKVFbpZoQ", authorId: "visitor1", authorName: "Clara H.", authorAvatarUrl: "https://picsum.photos/seed/clara/60/60", text: "The way the celadon pools in those textures — absolutely stunning.", likes: 7, createdAt: "2026-05-10T14:22:00Z" },
    { id: "sc2", postId: "maya-chen-dQhKVFbpZoQ", authorId: "visitor2", authorName: "Erik L.", authorAvatarUrl: "https://picsum.photos/seed/erik/60/60", text: "How long does the reduction firing take?", likes: 2, createdAt: "2026-05-11T09:40:00Z" },
  ],
  "james-okafor-8P8U8PzFHV8": [
    { id: "sc3", postId: "james-okafor-8P8U8PzFHV8", authorId: "visitor3", authorName: "Mia T.", authorAvatarUrl: "https://picsum.photos/seed/mia/60/60", text: "I want this in my living room. Is this available?", likes: 4, createdAt: "2026-05-09T18:00:00Z" },
  ],
};

function defaultState(): SocialState {
  return {
    following: [],
    notifications: [
      {
        id: "seed-notif-1",
        type: "follow",
        fromId: "system",
        fromName: "Kiln",
        fromAvatarUrl: "https://picsum.photos/seed/kiln/60/60",
        text: "Welcome to Kiln — the home for craft artists. Start by following artists you love.",
        read: false,
        createdAt: new Date().toISOString(),
      },
    ],
    comments: SEED_COMMENTS,
    commissions: [],
    receivedInquiries: SEED_RECEIVED_INQUIRIES,
    tips: [],
    myCommissionStatus: "open",
    artistCommissionStatuses: SEED_STATUSES,
    reelLikes: {},
    reelSaves: {},
    reelReposts: {},
    dropsWaitlisted: {},
    subscriptions: [],
    threads: SEED_MESSAGE_THREADS,
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
  const { isAuthenticated } = useAuth();
  const { subscribe: wsSubscribe } = useWebSocket();

  function update(updater: (prev: SocialState) => SocialState) {
    setState((prev) => {
      const next = updater(prev);
      writeState(next);
      return next;
    });
  }

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
      .then((data: { notifications?: Array<{ id: string; type: string; fromId: string; fromName: string; fromAvatarUrl: string | null; text: string; link?: string | null; read: boolean; createdAt: string }> } | null) => {
        if (!data?.notifications?.length) return;
        const apiNotifs: KilnNotification[] = data.notifications.map((n) => ({
          id: n.id,
          type: n.type as KilnNotification["type"],
          fromId: n.fromId,
          fromName: n.fromName,
          fromAvatarUrl: n.fromAvatarUrl ?? "",
          text: n.text,
          link: n.link ?? undefined,
          read: n.read,
          createdAt: n.createdAt,
        }));
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
      }).catch(() => {});
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

  const setMyCommissionStatus = useCallback((status: CommissionStatus) => {
    update((s) => ({ ...s, myCommissionStatus: status }));
  }, []);

  const getArtistCommissionStatus = useCallback(
    (artistId: string): CommissionStatus => state.artistCommissionStatuses[artistId] ?? "open",
    [state.artistCommissionStatuses]
  );

  const sendCommissionInquiry = useCallback((inquiry: Omit<CommissionInquiry, "id" | "status" | "createdAt">) => {
    const newInquiry: CommissionInquiry = { ...inquiry, id: genId(), status: "pending", createdAt: new Date().toISOString() };
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
    }).catch(() => {});
    update((s) => ({ ...s, commissions: [newInquiry, ...s.commissions] }));
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

  const sendDirectMessage = useCallback((toId: string, toName: string, toAvatar: string, text: string) => {
    const msg: DirectMessage = {
      id: genId(),
      senderId: "__current_user__",
      senderName: "You",
      senderAvatar: "",
      text,
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
  }, []);

  const quoteInquiry = useCallback((id: string, quote: CommissionQuote) => {
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
    }).catch(() => {});
    update((s) => ({
      ...s,
      receivedInquiries: s.receivedInquiries.map((i) =>
        i.id === id ? { ...i, status: "quoted" as const, quote } : i
      ),
    }));
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
  const unreadMessageCount = state.threads.reduce(
    (sum, t) => sum + t.messages.filter((m) => !m.read && m.senderId !== "__current_user__").length,
    0
  );

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
        unreadCount,
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
