import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useLocation, useParams } from "wouter";
import { MessageCircle, Send, ArrowLeft, Search, PenSquare, X, ImagePlus, Loader2, ShoppingBag } from "lucide-react";
import Nav from "@/components/Nav";
import { useSocial, type MessageThread } from "@/contexts/SocialContext";
import { useProfile } from "@/contexts/ProfileContext";
import { useWebSocket } from "@/hooks/useWebSocket";
import { artists } from "@/data/artists";
import { seedArtists } from "@/data/seedArtists";

const ALL_ARTISTS = [...artists, ...seedArtists];

interface ApiThread {
  id: string;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar: string | null;
  lastMessageAt: string;
  lastMessageText: string | null;
  lastMessageAttachmentUrl: string | null;
  unreadCount: number;
}
interface ApiMsg {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl: string | null;
  text: string;
  attachmentUrl: string | null;
  read: boolean;
  createdAt: string;
}

interface PendingAttachment {
  file: File;
  previewUrl: string;
  objectPath: string | null;
}

function timeShort(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function ThreadItem({ thread, active, onClick }: { thread: MessageThread; active: boolean; onClick: () => void }) {
  const lastMsg = thread.messages[thread.messages.length - 1];
  const unread = thread.messages.filter((m) => !m.read && m.senderId !== "__current_user__").length;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-white/5 ${
        active ? "bg-amber-500/10 border-l-2 border-l-amber-500" : "hover:bg-white/[0.03]"
      }`}
    >
      <div className="relative shrink-0">
        <img
          src={thread.participantAvatar || `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=60&h=60&fit=crop&seed=${thread.participantId}`}
          alt={thread.participantName}
          className="h-10 w-10 rounded-full object-cover"
        />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[9px] font-bold text-white">
            {unread}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className={`text-sm font-medium truncate ${unread > 0 ? "text-amber-100" : "text-stone-300"}`}>
            {thread.participantName}
          </span>
          <span className="text-[10px] text-stone-600 shrink-0 ml-2">{timeShort(thread.lastMessageAt)}</span>
        </div>
        <p className={`text-xs truncate ${unread > 0 ? "text-stone-400" : "text-stone-600"}`}>
          {lastMsg?.senderId === "__current_user__" ? "You: " : ""}{lastMsg?.text || (lastMsg?.attachmentUrl ? "📎 Image" : "")}
        </p>
      </div>
    </button>
  );
}

interface PendingRecipient {
  id: string;
  name: string;
  avatar: string | null;
}

const STORAGE_PATH_RE = /^\/api\/storage\/objects\/[a-zA-Z0-9_\-/.]+$/;

function AttachmentImage({ url }: { url: string }) {
  const [errored, setErrored] = useState(false);

  // Only render same-origin storage paths — reject javascript:, data:, external URLs, etc.
  if (!STORAGE_PATH_RE.test(url)) return null;
  if (errored) return null;

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block mt-1.5">
      <img
        src={url}
        alt="Attachment"
        className="max-w-[220px] max-h-[180px] rounded-xl object-cover border border-white/10 cursor-pointer hover:opacity-90 transition-opacity"
        onError={() => setErrored(true)}
      />
    </a>
  );
}

function ComposeBar({
  value,
  onChange,
  onSend,
  onKeyDown,
  onAttach,
  attachment,
  onRemoveAttachment,
  isUploading,
  attachError,
  disabled,
  placeholder,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onAttach: () => void;
  attachment: PendingAttachment | null;
  onRemoveAttachment: () => void;
  isUploading: boolean;
  attachError?: string | null;
  disabled?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const canSend = !isUploading && (value.trim().length > 0 || (attachment !== null && attachment.objectPath !== null));
  return (
    <div className="space-y-2">
      {attachment && (
        <div className="relative inline-block">
          <img
            src={attachment.previewUrl}
            alt="Attachment preview"
            className="h-16 w-16 rounded-lg object-cover border border-white/20"
          />
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50">
              <Loader2 size={14} className="animate-spin text-white" />
            </div>
          )}
          {!isUploading && (
            <button
              onClick={onRemoveAttachment}
              className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-stone-700 hover:bg-stone-600 text-stone-300"
            >
              <X size={9} />
            </button>
          )}
        </div>
      )}
      {attachError && (
        <p className="text-xs text-red-400 pl-1">{attachError}</p>
      )}
      <div className="flex gap-2 items-center">
        <button
          type="button"
          onClick={onAttach}
          disabled={isUploading}
          title="Attach image"
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-stone-800 transition-colors disabled:opacity-40 ${
            attachError
              ? "border-red-500/50 text-red-400 hover:text-red-300 hover:border-red-400/60"
              : "border-white/10 text-stone-500 hover:text-amber-300 hover:border-amber-500/30"
          }`}
        >
          <ImagePlus size={16} />
        </button>
        <input
          autoFocus={autoFocus}
          type="text"
          placeholder={placeholder ?? "Write a message…"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={disabled}
          className="flex-1 rounded-xl border border-white/10 bg-stone-800 px-4 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none disabled:opacity-50"
        />
        <button
          onClick={onSend}
          disabled={!canSend}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-stone-950 hover:bg-amber-400 transition-colors disabled:opacity-40"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}

export default function Messages() {
  const [location, navigate] = useLocation();
  const [composing, setComposing] = useState(false);
  const [composeSearch, setComposeSearch] = useState("");
  const params = useParams<{ participantId?: string }>();
  const { profile } = useProfile();
  const { threads, sendDirectMessage, markThreadRead, refreshUnreadMessageCount, decrementUnreadMessageCount, clearNewMessagePing, setActiveMessageThreadId } = useSocial();
  const { subscribe } = useWebSocket();
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [newMsg, setNewMsg] = useState("");
  const [search, setSearch] = useState("");
  const [apiThreads, setApiThreads] = useState<ApiThread[]>([]);
  const [activeApiThreadId, setActiveApiThreadId] = useState<string | null>(null);
  const [apiMessages, setApiMessages] = useState<ApiMsg[]>([]);
  const [pendingRecipient, setPendingRecipient] = useState<PendingRecipient | null>(null);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const typingDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentRef = useRef<number>(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [linkedOrderId, setLinkedOrderId] = useState<string | null>(null);

  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeThread = activeThreadId ? threads.find((t) => t.id === activeThreadId) : null;
  const activeApiThread = apiThreads.find(t => t.id === activeApiThreadId) ?? null;

  // Keep a ref so WS handlers always see the latest value without needing re-subscription
  const activeApiThreadIdRef = useRef<string | null>(null);
  useEffect(() => { activeApiThreadIdRef.current = activeApiThreadId; }, [activeApiThreadId]);

  // Ref for the scrollable messages container — used by IntersectionObserver
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Tell SocialContext which thread is currently open so it can suppress pings for it
  useEffect(() => {
    setActiveMessageThreadId(activeApiThreadId);
    return () => { setActiveMessageThreadId(null); };
  }, [activeApiThreadId, setActiveMessageThreadId]);

  useEffect(() => {
    if (!params.participantId) {
      setLinkedOrderId(null);
      return;
    }

    const qs = new URLSearchParams(window.location.search);
    const prefill = qs.get("prefill");
    if (prefill) setNewMsg(prefill);
    setLinkedOrderId(qs.get("orderId"));

    const staticThread = threads.find((t) => t.participantId === params.participantId);
    if (staticThread) {
      setActiveThreadId(staticThread.id);
      setActiveApiThreadId(null);
      setPendingRecipient(null);
      return;
    }

    const apiThread = apiThreads.find((t) => t.otherUserId === params.participantId);
    if (apiThread) {
      void openApiThread(apiThread.id);
      setPendingRecipient(null);
      return;
    }

    const knownArtist = ALL_ARTISTS.find((a) => a.id === params.participantId);
    setPendingRecipient({
      id: params.participantId,
      name: knownArtist?.name ?? params.participantId,
      avatar: knownArtist?.images?.[0]?.url ?? null,
    });
    setActiveThreadId(null);
    setActiveApiThreadId(null);
  }, [params.participantId, threads, apiThreads, location]);

  useEffect(() => {
    if (activeThread) {
      markThreadRead(activeThread.id);
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeThread, activeThread?.messages.length, markThreadRead]);

  useEffect(() => {
    fetch("/api/messages/threads", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then((d: { threads?: ApiThread[] } | null) => { if (Array.isArray(d?.threads)) setApiThreads(d.threads); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (activeApiThread) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeApiThread, apiMessages.length]);

  // Refresh thread list helper
  const refreshThreads = useCallback(async () => {
    try {
      const r = await fetch("/api/messages/threads", { credentials: "include" });
      if (r.ok) {
        const d = await r.json() as { threads?: ApiThread[] };
        if (Array.isArray(d?.threads)) setApiThreads(d.threads);
      }
    } catch {}
  }, []);

  // Subscribe to incoming message WS events to keep thread list + open thread in sync
  useEffect(() => {
    const unsub = subscribe("message", (evt) => {
      const e = evt as { threadId?: string; senderId?: string };
      const { threadId } = e;
      if (!threadId) return;

      const openThreadId = activeApiThreadIdRef.current;

      if (threadId === openThreadId) {
        // Message arrived in the currently open thread — fetch latest and mark read
        Promise.all([
          fetch(`/api/messages/threads/${threadId}`, { credentials: "include" }),
          fetch(`/api/messages/threads/${threadId}/read`, { method: "POST", credentials: "include" }),
        ])
          .then(([r]) => (r.ok ? r.json() : null))
          .then((d: { messages?: ApiMsg[] } | null) => {
            if (Array.isArray(d?.messages)) {
              setApiMessages([...d.messages].reverse());
            }
            // Zero out unread count and sync preview (text + attachment thumbnail) from the latest message
            const newest = d?.messages?.[0];
            setApiThreads(prev =>
              prev.map(t => t.id === threadId ? {
                ...t,
                unreadCount: 0,
                ...(newest && {
                  lastMessageText: newest.text ?? null,
                  lastMessageAttachmentUrl: newest.attachmentUrl ?? null,
                  lastMessageAt: newest.createdAt,
                }),
              } : t)
            );
            refreshUnreadMessageCount();
          })
          .catch(() => {});
      } else {
        // Message arrived in a different thread — refresh thread list and nav badge
        void refreshThreads();
        refreshUnreadMessageCount();
      }
    });
    return unsub;
  }, [subscribe, refreshThreads, refreshUnreadMessageCount]);

  useEffect(() => {
    if (!activeApiThreadId) return;
    const unsub = subscribe("typing", (evt) => {
      const e = evt as { threadId?: string; userId?: string };
      if (e.threadId !== activeApiThreadId) return;
      setOtherUserTyping(true);
      if (typingDismissRef.current) clearTimeout(typingDismissRef.current);
      typingDismissRef.current = setTimeout(() => setOtherUserTyping(false), 3000);
    });
    return () => {
      unsub();
      setOtherUserTyping(false);
      if (typingDismissRef.current) clearTimeout(typingDismissRef.current);
    };
  }, [activeApiThreadId, subscribe]);

  const sendTypingSignal = useCallback((threadId: string) => {
    const now = Date.now();
    if (now - lastTypingSentRef.current < 1000) return;
    lastTypingSentRef.current = now;
    void fetch("/api/messages/typing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ threadId }),
    }).catch(() => {});
  }, []);

  // IntersectionObserver: call /read as soon as any unread message from the other
  // user scrolls into the viewport — gives instant badge clearance instead of
  // waiting for the next 5-second poll tick.
  useEffect(() => {
    if (!activeApiThreadId || !profile) return;
    const container = messagesContainerRef.current;
    if (!container) return;

    const unreadEls = Array.from(container.querySelectorAll<HTMLElement>("[data-unread-msg]"));
    if (unreadEls.length === 0) return;

    const threadId = activeApiThreadId;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();

        // Optimistically clear the thread badge only — do NOT touch
        // apiMessages.read here because that field also drives the "Seen"
        // receipt on sent messages.  The poll will update read states once the
        // server confirms them.
        setApiThreads((prev) =>
          prev.map((t) => (t.id === threadId ? { ...t, unreadCount: 0 } : t))
        );

        fetch(`/api/messages/threads/${threadId}/read`, {
          method: "POST",
          credentials: "include",
        })
          .then(() => refreshUnreadMessageCount())
          .catch(() => {});
      },
      { threshold: 0.1, root: container }
    );

    unreadEls.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [activeApiThreadId, apiMessages, profile, refreshUnreadMessageCount]);

  useEffect(() => {
    if (!activeApiThreadId) return;
    const interval = setInterval(async () => {
      try {
        const threadId = activeApiThreadId;
        const [r] = await Promise.all([
          fetch(`/api/messages/threads/${threadId}`, { credentials: "include" }),
          fetch(`/api/messages/threads/${threadId}/read`, { method: "POST", credentials: "include" }),
        ]);
        if (r.ok) {
          const d = await r.json() as { messages?: ApiMsg[] };
          const incoming = [...(d.messages ?? [])].reverse();
          setApiMessages(prev => {
            const readChanged = incoming.some((m, i) => prev[i]?.id === m.id && prev[i].read !== m.read);
            if (
              incoming.length !== prev.length ||
              incoming[incoming.length - 1]?.id !== prev[prev.length - 1]?.id ||
              readChanged
            ) {
              refreshUnreadMessageCount();
              return incoming;
            }
            return prev;
          });
          setApiThreads(prev =>
            prev.map(t => t.id === threadId ? { ...t, unreadCount: 0 } : t)
          );
        }
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [activeApiThreadId, refreshUnreadMessageCount]);

  const filtered = threads.filter((t) => t.participantName.toLowerCase().includes(search.toLowerCase()));

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (!file.type.startsWith("image/")) {
      setAttachError("Only image files can be attached.");
      return;
    }
    const MAX_BYTES = 10 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      setAttachError("Image must be 10 MB or smaller.");
      return;
    }
    setAttachError(null);

    const previewUrl = URL.createObjectURL(file);
    setPendingAttachment({ file, previewUrl, objectPath: null });
    setIsUploading(true);

    try {
      const urlRes = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type || "image/jpeg" }),
      });
      if (!urlRes.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = await urlRes.json() as { uploadURL: string; objectPath: string };

      const putRes = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "image/jpeg" },
      });
      if (!putRes.ok) throw new Error("Upload failed");

      await fetch("/api/storage/uploads/make-public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ objectPath }),
      });

      setPendingAttachment({ file, previewUrl, objectPath });
    } catch {
      setPendingAttachment(null);
      URL.revokeObjectURL(previewUrl);
    } finally {
      setIsUploading(false);
    }
  }

  function clearAttachment() {
    if (pendingAttachment) URL.revokeObjectURL(pendingAttachment.previewUrl);
    setPendingAttachment(null);
  }

  function getAttachmentServingUrl(objectPath: string): string {
    return `/api/storage${objectPath}`;
  }

  function handleSend() {
    const text = newMsg.trim();
    const attachmentUrl = pendingAttachment?.objectPath ? getAttachmentServingUrl(pendingAttachment.objectPath) : undefined;
    if ((!text && !attachmentUrl) || !activeThread) return;
    sendDirectMessage(activeThread.participantId, activeThread.participantName, activeThread.participantAvatar, text, attachmentUrl);
    setNewMsg("");
    clearAttachment();
  }

  async function openApiThread(id: string) {
    setActiveApiThreadId(id);
    setActiveThreadId(null);

    // Optimistically clear the nav badge immediately — don't wait for the server round-trip
    const currentUnread = apiThreads.find(t => t.id === id)?.unreadCount ?? 0;
    if (currentUnread > 0) {
      decrementUnreadMessageCount(currentUnread);
      setApiThreads(prev => prev.map(t => t.id === id ? { ...t, unreadCount: 0 } : t));
    }

    try {
      const [r] = await Promise.all([
        fetch(`/api/messages/threads/${id}`, { credentials: "include" }),
        fetch(`/api/messages/threads/${id}/read`, { method: "POST", credentials: "include" }),
      ]);
      if (r.ok) {
        const d = await r.json() as { messages?: ApiMsg[] };
        setApiMessages([...(d.messages ?? [])].reverse());
        setApiThreads(prev => prev.map(t => t.id === id ? { ...t, unreadCount: 0 } : t));
        refreshUnreadMessageCount();
      }
    } catch {}
  }

  async function handleApiSend() {
    const text = newMsg.trim();
    const attachmentUrl = pendingAttachment?.objectPath ? getAttachmentServingUrl(pendingAttachment.objectPath) : undefined;
    if ((!text && !attachmentUrl) || !activeApiThread) return;
    setNewMsg("");
    clearAttachment();
    try {
      const r = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ recipientId: activeApiThread.otherUserId, text: text || undefined, attachmentUrl }),
      });
      if (r.ok) {
        const msg = await r.json() as ApiMsg;
        setApiMessages(prev => [...prev, msg]);
        setApiThreads(prev => prev.map(t =>
          t.id === activeApiThread.id
            ? { ...t, lastMessageText: text || "📎 Image", lastMessageAttachmentUrl: attachmentUrl ?? null, lastMessageAt: new Date().toISOString() }
            : t
        ));
      }
    } catch {}
  }

  async function handlePendingSend() {
    const text = newMsg.trim();
    const attachmentUrl = pendingAttachment?.objectPath ? getAttachmentServingUrl(pendingAttachment.objectPath) : undefined;
    if ((!text && !attachmentUrl) || !pendingRecipient) return;
    setNewMsg("");
    clearAttachment();
    try {
      const r = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ recipientId: pendingRecipient.id, text: text || undefined, attachmentUrl }),
      });
      if (r.ok) {
        const msg = await r.json() as ApiMsg;
        const threadsRes = await fetch("/api/messages/threads", { credentials: "include" });
        if (threadsRes.ok) {
          const d = await threadsRes.json() as { threads?: ApiThread[] };
          if (Array.isArray(d?.threads)) {
            setApiThreads(d.threads);
            const newThread = d.threads.find((t) => t.otherUserId === pendingRecipient.id);
            if (newThread) {
              setActiveApiThreadId(newThread.id);
              setApiMessages([msg]);
              setPendingRecipient(null);
              return;
            }
          }
        }
        setApiMessages([msg]);
        setPendingRecipient(null);
      }
    } catch {}
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#12100e]">
        <Nav />
        <div className="flex flex-col items-center justify-center gap-4 p-16 text-center">
          <MessageCircle size={36} className="text-stone-600" />
          <h2 className="font-serif text-2xl text-amber-100">Messages</h2>
          <p className="text-stone-500">Set up your profile to message artists.</p>
          <button onClick={() => navigate("/setup")} className="rounded-full bg-amber-500 px-6 py-2.5 font-semibold text-stone-950 hover:bg-amber-400 transition-colors">
            Create Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#12100e] flex flex-col">
      <Nav />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void handleImageSelect(e)}
      />
      <div className="flex-1 flex mx-auto w-full max-w-4xl" style={{ height: "calc(100vh - 56px)" }}>
        {/* Thread list */}
        <div className={`w-full md:w-72 shrink-0 border-r border-white/10 flex flex-col ${(activeThread || activeApiThread || pendingRecipient) ? "hidden md:flex" : "flex"}`}>
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-serif text-lg text-amber-100">Messages</h2>
              <button
                onClick={() => { setComposing((v) => !v); setComposeSearch(""); }}
                className={`rounded-full p-1.5 transition-colors ${composing ? "bg-amber-500/20 text-amber-300" : "text-stone-500 hover:text-amber-300"}`}
                title="New message"
              >
                {composing ? <X size={16} /> : <PenSquare size={16} />}
              </button>
            </div>

            {composing ? (
              <div>
                <div className="relative mb-2">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-600" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search artists…"
                    value={composeSearch}
                    onChange={(e) => setComposeSearch(e.target.value)}
                    className="w-full rounded-lg border border-amber-500/30 bg-stone-800 py-2 pl-8 pr-3 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/60 focus:outline-none"
                  />
                </div>
                <div className="max-h-52 overflow-y-auto space-y-0.5">
                  {ALL_ARTISTS
                    .filter((a) => !composeSearch || a.name.toLowerCase().includes(composeSearch.toLowerCase()))
                    .slice(0, 12)
                    .map((a) => {
                      const avatar = a.images?.[0]?.url ?? `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=${a.id}`;
                      return (
                        <button
                          key={a.id}
                          onClick={() => { setComposing(false); navigate(`/messages/${a.id}`); }}
                          className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-white/5 transition-colors text-left"
                        >
                          <img src={avatar} alt={a.name} className="h-8 w-8 rounded-full object-cover shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm text-stone-200 truncate">{a.name}</p>
                            <p className="text-[10px] text-stone-600 truncate">{a.medium.split(",")[0]}</p>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>
            ) : (
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-600" />
                <input
                  type="text"
                  placeholder="Search conversations"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-stone-800 py-2 pl-8 pr-3 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none"
                />
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 && apiThreads.length === 0 && (
              <div className="p-8 text-center">
                <MessageCircle size={24} className="mx-auto mb-2 text-stone-700" />
                <p className="text-sm text-stone-600">No conversations yet</p>
              </div>
            )}
            {apiThreads.map((t) => (
              <button
                key={`api-${t.id}`}
                onClick={() => { setLinkedOrderId(null); void openApiThread(t.id); }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-white/5 ${
                  activeApiThreadId === t.id ? "bg-amber-500/10 border-l-2 border-l-amber-500" : "hover:bg-white/[0.03]"
                }`}
              >
                <div className="relative shrink-0">
                  <img
                    src={t.otherUserAvatar ?? `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=60&h=60&fit=crop&seed=${t.otherUserId}`}
                    alt={t.otherUserName}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                  {t.unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[9px] font-bold text-white">
                      {t.unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={`text-sm font-medium truncate ${t.unreadCount > 0 ? "text-amber-100" : "text-stone-300"}`}>
                      {t.otherUserName}
                    </span>
                    <span className="text-[10px] text-stone-600 shrink-0 ml-2">{timeShort(t.lastMessageAt)}</span>
                  </div>
                  <div className={`flex items-center gap-1.5 text-xs truncate ${t.unreadCount > 0 ? "text-stone-400" : "text-stone-600"}`}>
                    {t.lastMessageAttachmentUrl && (
                      <img
                        src={t.lastMessageAttachmentUrl}
                        alt="attachment"
                        className="h-5 w-5 rounded object-cover shrink-0 border border-white/10"
                      />
                    )}
                    <span className="truncate">{t.lastMessageText ?? "No messages yet"}</span>
                  </div>
                </div>
              </button>
            ))}
            {filtered.map((thread) => (
              <ThreadItem
                key={thread.id}
                thread={thread}
                active={activeThreadId === thread.id}
                onClick={() => { setLinkedOrderId(null); setActiveThreadId(thread.id); setActiveApiThreadId(null); }}
              />
            ))}
          </div>
        </div>

        {/* Conversation panel */}
        <div className={`flex-1 flex flex-col ${(activeThread || activeApiThread || pendingRecipient) ? "flex" : "hidden md:flex"}`}>
          {!activeThread && !activeApiThread && !pendingRecipient ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
              <MessageCircle size={32} className="text-stone-700" />
              <p className="text-stone-500 text-sm">Select a conversation or start one from an artist's profile.</p>
            </div>
          ) : pendingRecipient ? (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
                <button
                  onClick={() => { setPendingRecipient(null); navigate("/messages"); }}
                  className="md:hidden text-stone-500 hover:text-amber-300 transition-colors"
                >
                  <ArrowLeft size={18} />
                </button>
                <img
                  src={pendingRecipient.avatar ?? `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=60&h=60&fit=crop&seed=${pendingRecipient.id}`}
                  alt={pendingRecipient.name}
                  className="h-8 w-8 rounded-full object-cover"
                />
                <p className="text-sm font-medium text-amber-100">{pendingRecipient.name}</p>
              </div>
              {linkedOrderId && (
                <Link href={`/orders/${linkedOrderId}`}>
                  <div className="flex items-center gap-2 px-4 py-2 border-b border-amber-500/20 bg-amber-500/8 hover:bg-amber-500/15 transition-colors cursor-pointer">
                    <ShoppingBag size={12} className="text-amber-400 shrink-0" />
                    <span className="text-xs text-amber-300">
                      Order <span className="font-mono font-medium">{"KLN-" + linkedOrderId.slice(0, 8).toUpperCase()}</span>
                    </span>
                    <span className="text-xs text-stone-500 ml-auto">View order →</span>
                  </div>
                </Link>
              )}

              {/* Empty state */}
              <div className="flex-1 flex flex-col items-center justify-center gap-2 p-8 text-center">
                <MessageCircle size={28} className="text-stone-700" />
                <p className="text-stone-500 text-sm">Send a message to start the conversation.</p>
              </div>

              {/* Compose */}
              <div className="px-4 py-3 border-t border-white/10">
                <ComposeBar
                  autoFocus
                  value={newMsg}
                  onChange={setNewMsg}
                  onSend={() => void handlePendingSend()}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handlePendingSend(); } }}
                  onAttach={() => { setAttachError(null); fileInputRef.current?.click(); }}
                  attachment={pendingAttachment}
                  onRemoveAttachment={clearAttachment}
                  isUploading={isUploading}
                  attachError={attachError}
                />
              </div>
            </>
          ) : activeApiThread ? (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
                <button
                  onClick={() => setActiveApiThreadId(null)}
                  className="md:hidden text-stone-500 hover:text-amber-300 transition-colors"
                >
                  <ArrowLeft size={18} />
                </button>
                <img
                  src={activeApiThread.otherUserAvatar ?? `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=60&h=60&fit=crop&seed=${activeApiThread.otherUserId}`}
                  alt={activeApiThread.otherUserName}
                  className="h-8 w-8 rounded-full object-cover"
                />
                <p className="text-sm font-medium text-amber-100">{activeApiThread.otherUserName}</p>
              </div>
              {linkedOrderId && (
                <Link href={`/orders/${linkedOrderId}`}>
                  <div className="flex items-center gap-2 px-4 py-2 border-b border-amber-500/20 bg-amber-500/8 hover:bg-amber-500/15 transition-colors cursor-pointer">
                    <ShoppingBag size={12} className="text-amber-400 shrink-0" />
                    <span className="text-xs text-amber-300">
                      Order <span className="font-mono font-medium">{"KLN-" + linkedOrderId.slice(0, 8).toUpperCase()}</span>
                    </span>
                    <span className="text-xs text-stone-500 ml-auto">View order →</span>
                  </div>
                </Link>
              )}

              {/* Messages */}
              <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {apiMessages.length === 0 && (
                  <p className="text-center text-sm text-stone-600 py-8">No messages yet — say hello!</p>
                )}
                {(() => {
                  const lastReadSentId = [...apiMessages].reverse().find(
                    (m) => m.senderId === profile.id && m.read
                  )?.id ?? null;
                  return apiMessages.map((msg) => {
                    const isMe = msg.senderId === profile.id;
                    const isUnread = !isMe && !msg.read;
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                        {...(isUnread ? { "data-unread-msg": "" } : {})}
                      >
                        <div className={`flex ${isMe ? "justify-end" : "justify-start"} w-full`}>
                          {!isMe && (
                            <img
                              src={msg.senderAvatarUrl ?? `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=60&h=60&fit=crop&seed=${msg.senderId}`}
                              alt={msg.senderName}
                              className="h-7 w-7 rounded-full object-cover mr-2 mt-1 shrink-0"
                            />
                          )}
                          <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                            isMe
                              ? "bg-amber-500/20 text-amber-100 rounded-br-sm"
                              : "bg-stone-800 text-stone-200 rounded-bl-sm"
                          }`}>
                            {!isMe && <p className="text-[9px] text-stone-500 mb-0.5">{msg.senderName}</p>}
                            {msg.text && <p>{msg.text}</p>}
                            {msg.attachmentUrl && <AttachmentImage url={msg.attachmentUrl} />}
                            <p className={`text-[10px] mt-1 ${isMe ? "text-amber-400/60 text-right" : "text-stone-600"}`}>
                              {timeShort(msg.createdAt)}
                            </p>
                          </div>
                        </div>
                        {isMe && msg.id === lastReadSentId && (
                          <p className="text-[10px] text-stone-500 mt-0.5 mr-0.5">Seen</p>
                        )}
                      </div>
                    );
                  });
                })()}
                {otherUserTyping && (
                  <div className="flex items-end gap-2">
                    <img
                      src={activeApiThread.otherUserAvatar ?? `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=60&h=60&fit=crop&seed=${activeApiThread.otherUserId}`}
                      alt={activeApiThread.otherUserName}
                      className="h-7 w-7 rounded-full object-cover shrink-0"
                    />
                    <div className="bg-stone-800 rounded-2xl rounded-bl-sm px-4 py-2.5 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-stone-400 animate-bounce [animation-delay:0ms]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-stone-400 animate-bounce [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-stone-400 animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Compose */}
              <div className="px-4 py-3 border-t border-white/10">
                <ComposeBar
                  value={newMsg}
                  onChange={(v) => { setNewMsg(v); if (v) sendTypingSignal(activeApiThread.id); }}
                  onSend={() => void handleApiSend()}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleApiSend(); } }}
                  onAttach={() => { setAttachError(null); fileInputRef.current?.click(); }}
                  attachment={pendingAttachment}
                  onRemoveAttachment={clearAttachment}
                  isUploading={isUploading}
                  attachError={attachError}
                />
              </div>
            </>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
                <button
                  onClick={() => setActiveThreadId(null)}
                  className="md:hidden text-stone-500 hover:text-amber-300 transition-colors"
                >
                  <ArrowLeft size={18} />
                </button>
                <img
                  src={activeThread!.participantAvatar || `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=60&h=60&fit=crop&seed=${activeThread!.participantId}`}
                  alt={activeThread!.participantName}
                  className="h-8 w-8 rounded-full object-cover"
                />
                <div>
                  <p className="text-sm font-medium text-amber-100">{activeThread!.participantName}</p>
                  <button
                    onClick={() => navigate(`/artists/${activeThread!.participantId}`)}
                    className="text-xs text-stone-500 hover:text-amber-300 transition-colors"
                  >
                    View profile
                  </button>
                </div>
              </div>
              {linkedOrderId && (
                <Link href={`/orders/${linkedOrderId}`}>
                  <div className="flex items-center gap-2 px-4 py-2 border-b border-amber-500/20 bg-amber-500/8 hover:bg-amber-500/15 transition-colors cursor-pointer">
                    <ShoppingBag size={12} className="text-amber-400 shrink-0" />
                    <span className="text-xs text-amber-300">
                      Order <span className="font-mono font-medium">{"KLN-" + linkedOrderId.slice(0, 8).toUpperCase()}</span>
                    </span>
                    <span className="text-xs text-stone-500 ml-auto">View order →</span>
                  </div>
                </Link>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {activeThread!.messages.map((msg) => {
                  const isMe = msg.senderId === "__current_user__";
                  return (
                    <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                      {!isMe && (
                        <img
                          src={msg.senderAvatar || `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=60&h=60&fit=crop&seed=${msg.senderId}`}
                          alt={msg.senderName}
                          className="h-7 w-7 rounded-full object-cover mr-2 mt-1 shrink-0"
                        />
                      )}
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                        isMe
                          ? "bg-amber-500/20 text-amber-100 rounded-br-sm"
                          : "bg-stone-800 text-stone-200 rounded-bl-sm"
                      }`}>
                        {msg.text}
                        {msg.attachmentUrl && <AttachmentImage url={msg.attachmentUrl} />}
                        <p className={`text-[10px] mt-1 ${isMe ? "text-amber-400/60 text-right" : "text-stone-600"}`}>
                          {timeShort(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Compose */}
              <div className="px-4 py-3 border-t border-white/10">
                <ComposeBar
                  value={newMsg}
                  onChange={setNewMsg}
                  onSend={handleSend}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  onAttach={() => { setAttachError(null); fileInputRef.current?.click(); }}
                  attachment={pendingAttachment}
                  onRemoveAttachment={clearAttachment}
                  isUploading={isUploading}
                  attachError={attachError}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
