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

export function getPosts(): Post[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as Post[];
  } catch {
    return [];
  }
}

export function addPost(post: Post): void {
  const posts = getPosts();
  posts.unshift(post);
  localStorage.setItem(KEY, JSON.stringify(posts));
}

export function deletePost(id: string): void {
  const posts = getPosts().filter((p) => p.id !== id);
  localStorage.setItem(KEY, JSON.stringify(posts));
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
    id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    savedAt: new Date().toISOString(),
  };
  const drafts = getDrafts();
  drafts.unshift(newDraft);
  localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
  return newDraft;
}

export function deleteDraft(id: string): void {
  const drafts = getDrafts().filter((d) => d.id !== id);
  localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
}

export function publishDraft(id: string): void {
  deleteDraft(id);
}
