export interface Post {
  id: string;
  artistId: string;
  artistName: string;
  artistHandle: string;
  artistAvatarUrl: string;
  type: "image" | "video";
  mediaUrl: string;
  thumbnailUrl?: string;
  mediaUrls?: string[];
  caption: string;
  tags: string[];
  filter?: string;
  musicTrackId?: string;
  createdAt: string;
  likes: number;
  comments: number;
  saves: number;
  patronOnly?: boolean;
  muxPlaybackId?: string;
}

export interface Draft {
  id: string;
  type: "image" | "video";
  mediaUrl: string;
  caption: string;
  technique: string;
  stage: string;
  tags: string[];
  seriesName: string;
  isDrop: boolean;
  dropPrice: string;
  dropDate: string;
  musicTrackId?: string;
  filter?: string;
  savedAt: string;
}

const KEY = "kiln_posts";
const DRAFT_KEY = "kiln_drafts";
const MAX_POSTS_STORED = 20;

function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Quota exceeded — free space and retry once
    try {
      localStorage.removeItem(KEY);
      localStorage.removeItem(DRAFT_KEY);
      localStorage.setItem(key, value);
    } catch {
      // Still failing (e.g. private browsing with no storage) — silently skip
    }
  }
}

export function getPosts(): Post[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as Post[];
  } catch {
    return [];
  }
}

export function addPost(post: Post): void {
  // For images, mediaUrl IS the display image — keep it even if it's a data URI
  // so the profile grid doesn't render blank. For videos, strip data URIs from
  // mediaUrl (the video file) since we rely on thumbnailUrl for the grid.
  const isImage = post.type === "image";
  const storable: Post = {
    ...post,
    mediaUrl: post.mediaUrl.startsWith("data:") && !isImage ? "" : post.mediaUrl,
    thumbnailUrl: post.thumbnailUrl?.startsWith("data:") ? undefined : post.thumbnailUrl,
    mediaUrls: post.mediaUrls?.map((u) => (u.startsWith("data:") && !isImage ? "" : u)),
  };
  const posts = getPosts();
  posts.unshift(storable);
  // Keep only the most recent N posts to prevent quota growth
  safeSetItem(KEY, JSON.stringify(posts.slice(0, MAX_POSTS_STORED)));
}

export function deletePost(id: string): void {
  const posts = getPosts().filter((p) => p.id !== id);
  safeSetItem(KEY, JSON.stringify(posts));
}

export function clearPosts(): void {
  localStorage.removeItem(KEY);
}

export function generateId(): string {
  return `post-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getDrafts(): Draft[] {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "[]") as Draft[];
  } catch {
    return [];
  }
}

export function saveDraft(draft: Omit<Draft, "id" | "savedAt">): Draft {
  const newDraft: Draft = {
    ...draft,
    // Don't store blob/data URLs — they expire and cause quota issues
    mediaUrl: draft.mediaUrl.startsWith("data:") || draft.mediaUrl.startsWith("blob:") ? "" : draft.mediaUrl,
    id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    savedAt: new Date().toISOString(),
  };
  const drafts = getDrafts();
  drafts.unshift(newDraft);
  // Keep at most 10 drafts
  safeSetItem(DRAFT_KEY, JSON.stringify(drafts.slice(0, 10)));
  return newDraft;
}

export function deleteDraft(id: string): void {
  const drafts = getDrafts().filter((d) => d.id !== id);
  safeSetItem(DRAFT_KEY, JSON.stringify(drafts));
}

export function publishDraft(id: string): void {
  deleteDraft(id);
}
