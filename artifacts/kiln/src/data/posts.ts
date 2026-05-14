export interface Post {
  id: string;
  artistId: string;
  artistName: string;
  artistHandle: string;
  artistAvatarUrl: string;
  type: "image" | "video";
  mediaUrl: string;
  caption: string;
  tags: string[];
  filter?: string;
  musicTrackId?: string;
  createdAt: string;
  likes: number;
  comments: number;
  saves: number;
}

const KEY = "kiln_posts";

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
