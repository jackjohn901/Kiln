import { createContext, useContext, useState, useCallback, ReactNode } from "react";

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
  type: "follow" | "like" | "comment" | "commission" | "tip" | "workshop";
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
  type: "custom" | "series" | "workshop" | "reproduction";
  description: string;
  budget: string;
  timeline: string;
  dimensions?: string;
  status: "pending" | "accepted" | "declined";
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

export type CommissionStatus = "open" | "waitlisted" | "closed";

interface SocialState {
  following: string[];
  notifications: KilnNotification[];
  comments: Record<string, KilnComment[]>;
  commissions: CommissionInquiry[];
  tips: TipRecord[];
  myCommissionStatus: CommissionStatus;
  artistCommissionStatuses: Record<string, CommissionStatus>;
  reelLikes: Record<string, boolean>;
  reelSaves: Record<string, boolean>;
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
  sendTip: (toArtistId: string, toArtistName: string, amount: number, message?: string) => void;
  toggleReelLike: (reelId: string) => void;
  toggleReelSave: (reelId: string) => void;
}

const SocialContext = createContext<SocialContextType>({} as SocialContextType);

const STORAGE_KEY = "kiln_social_v2";

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
    tips: [],
    myCommissionStatus: "open",
    artistCommissionStatuses: SEED_STATUSES,
    reelLikes: {},
    reelSaves: {},
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
      artistCommissionStatuses: {
        ...def.artistCommissionStatuses,
        ...(parsed.artistCommissionStatuses ?? {}),
      },
      comments: {
        ...def.comments,
        ...(parsed.comments ?? {}),
      },
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

  function update(updater: (prev: SocialState) => SocialState) {
    setState((prev) => {
      const next = updater(prev);
      writeState(next);
      return next;
    });
  }

  const followArtist = useCallback((artistId: string, artistName: string, avatarUrl: string) => {
    update((s) => ({
      ...s,
      following: s.following.includes(artistId) ? s.following : [...s.following, artistId],
      notifications: [
        {
          id: genId(),
          type: "follow" as const,
          fromId: "system",
          fromName: artistName,
          fromAvatarUrl: avatarUrl,
          text: `You are now following ${artistName}`,
          link: `/artists/${artistId}`,
          read: true,
          createdAt: new Date().toISOString(),
        },
        ...s.notifications,
      ],
    }));
  }, []);

  const unfollowArtist = useCallback((artistId: string) => {
    update((s) => ({ ...s, following: s.following.filter((id) => id !== artistId) }));
  }, []);

  const isFollowing = useCallback((artistId: string) => state.following.includes(artistId), [state.following]);

  const addComment = useCallback((postId: string, authorId: string, authorName: string, authorAvatar: string, text: string) => {
    const comment: KilnComment = {
      id: genId(),
      postId,
      authorId,
      authorName,
      authorAvatarUrl: authorAvatar,
      text,
      likes: 0,
      createdAt: new Date().toISOString(),
    };
    update((s) => ({
      ...s,
      comments: { ...s.comments, [postId]: [comment, ...(s.comments[postId] ?? [])] },
    }));
  }, []);

  const getComments = useCallback((postId: string) => state.comments[postId] ?? [], [state.comments]);

  const likeComment = useCallback((postId: string, commentId: string) => {
    update((s) => ({
      ...s,
      comments: {
        ...s.comments,
        [postId]: (s.comments[postId] ?? []).map((c) =>
          c.id === commentId ? { ...c, likes: c.likes + 1 } : c
        ),
      },
    }));
  }, []);

  const addNotification = useCallback((n: Omit<KilnNotification, "id" | "read" | "createdAt">) => {
    update((s) => ({
      ...s,
      notifications: [
        { ...n, id: genId(), read: false, createdAt: new Date().toISOString() },
        ...s.notifications.slice(0, 99),
      ],
    }));
  }, []);

  const markRead = useCallback((id: string) => {
    update((s) => ({
      ...s,
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }));
  }, []);

  const markAllRead = useCallback(() => {
    update((s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, read: true })) }));
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
  }, []);

  const sendTip = useCallback((toArtistId: string, toArtistName: string, amount: number, message?: string) => {
    const tip: TipRecord = { id: genId(), toArtistId, toArtistName, amount, message, createdAt: new Date().toISOString() };
    update((s) => ({ ...s, tips: [tip, ...s.tips] }));
  }, []);

  const toggleReelLike = useCallback((reelId: string) => {
    update((s) => ({ ...s, reelLikes: { ...s.reelLikes, [reelId]: !s.reelLikes[reelId] } }));
  }, []);

  const toggleReelSave = useCallback((reelId: string) => {
    update((s) => ({ ...s, reelSaves: { ...s.reelSaves, [reelId]: !s.reelSaves[reelId] } }));
  }, []);

  const unreadCount = state.notifications.filter((n) => !n.read).length;

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
        sendTip,
        toggleReelLike,
        toggleReelSave,
      }}
    >
      {children}
    </SocialContext.Provider>
  );
}

export function useSocial() {
  return useContext(SocialContext);
}
