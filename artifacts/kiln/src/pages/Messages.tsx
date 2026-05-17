import { useState, useRef, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { MessageCircle, Send, ArrowLeft, Search, PenSquare, X } from "lucide-react";
import Nav from "@/components/Nav";
import { useSocial, type MessageThread } from "@/contexts/SocialContext";
import { useProfile } from "@/contexts/ProfileContext";
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
  unreadCount: number;
}
interface ApiMsg {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl: string | null;
  text: string;
  createdAt: string;
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
          src={thread.participantAvatar || `https://picsum.photos/seed/${thread.participantId}/60/60`}
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
          {lastMsg?.senderId === "__current_user__" ? "You: " : ""}{lastMsg?.text}
        </p>
      </div>
    </button>
  );
}

export default function Messages() {
  const [, navigate] = useLocation();
  const [composing, setComposing] = useState(false);
  const [composeSearch, setComposeSearch] = useState("");
  const params = useParams<{ participantId?: string }>();
  const { profile } = useProfile();
  const { threads, sendDirectMessage, markThreadRead } = useSocial();
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [newMsg, setNewMsg] = useState("");
  const [search, setSearch] = useState("");
  const [apiThreads, setApiThreads] = useState<ApiThread[]>([]);
  const [activeApiThreadId, setActiveApiThreadId] = useState<string | null>(null);
  const [apiMessages, setApiMessages] = useState<ApiMsg[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const activeThread = activeThreadId ? threads.find((t) => t.id === activeThreadId) : null;
  const activeApiThread = apiThreads.find(t => t.id === activeApiThreadId) ?? null;

  useEffect(() => {
    if (params.participantId) {
      const thread = threads.find((t) => t.participantId === params.participantId);
      if (thread) setActiveThreadId(thread.id);
    }
  }, [params.participantId, threads]);

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

  // Poll for new messages every 5 s when an API thread is active
  useEffect(() => {
    if (!activeApiThreadId) return;
    const interval = setInterval(async () => {
      try {
        const r = await fetch(`/api/messages/threads/${activeApiThreadId}`, { credentials: "include" });
        if (r.ok) {
          const d = await r.json() as { messages?: ApiMsg[] };
          const incoming = [...(d.messages ?? [])].reverse();
          setApiMessages(prev => {
            if (incoming.length !== prev.length || incoming[incoming.length - 1]?.id !== prev[prev.length - 1]?.id) {
              return incoming;
            }
            return prev;
          });
        }
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [activeApiThreadId]);

  const filtered = threads.filter((t) => t.participantName.toLowerCase().includes(search.toLowerCase()));

  function handleSend() {
    if (!newMsg.trim() || !activeThread) return;
    sendDirectMessage(activeThread.participantId, activeThread.participantName, activeThread.participantAvatar, newMsg.trim());
    setNewMsg("");
  }

  async function openApiThread(id: string) {
    setActiveApiThreadId(id);
    setActiveThreadId(null);
    try {
      const r = await fetch(`/api/messages/threads/${id}`, { credentials: "include" });
      if (r.ok) {
        const d = await r.json() as { messages?: ApiMsg[] };
        setApiMessages([...(d.messages ?? [])].reverse());
      }
    } catch {}
  }

  async function handleApiSend() {
    if (!newMsg.trim() || !activeApiThread) return;
    const text = newMsg.trim();
    setNewMsg("");
    try {
      const r = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ recipientId: activeApiThread.otherUserId, text }),
      });
      if (r.ok) {
        const msg = await r.json() as ApiMsg;
        setApiMessages(prev => [...prev, msg]);
        setApiThreads(prev => prev.map(t =>
          t.id === activeApiThread.id
            ? { ...t, lastMessageText: text, lastMessageAt: new Date().toISOString() }
            : t
        ));
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
      <div className="flex-1 flex mx-auto w-full max-w-4xl" style={{ height: "calc(100vh - 56px)" }}>
        {/* Thread list */}
        <div className={`w-full md:w-72 shrink-0 border-r border-white/10 flex flex-col ${(activeThread || activeApiThread) ? "hidden md:flex" : "flex"}`}>
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
                      const avatar = a.images?.[0]?.url ?? `https://picsum.photos/seed/${a.id}/80/80`;
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
                onClick={() => void openApiThread(t.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-white/5 ${
                  activeApiThreadId === t.id ? "bg-amber-500/10 border-l-2 border-l-amber-500" : "hover:bg-white/[0.03]"
                }`}
              >
                <div className="relative shrink-0">
                  <img
                    src={t.otherUserAvatar ?? `https://picsum.photos/seed/${t.otherUserId}/60/60`}
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
                  <p className={`text-xs truncate ${t.unreadCount > 0 ? "text-stone-400" : "text-stone-600"}`}>
                    {t.lastMessageText ?? "No messages yet"}
                  </p>
                </div>
              </button>
            ))}
            {filtered.map((thread) => (
              <ThreadItem
                key={thread.id}
                thread={thread}
                active={activeThreadId === thread.id}
                onClick={() => { setActiveThreadId(thread.id); setActiveApiThreadId(null); }}
              />
            ))}
          </div>
        </div>

        {/* Conversation panel */}
        <div className={`flex-1 flex flex-col ${(activeThread || activeApiThread) ? "flex" : "hidden md:flex"}`}>
          {!activeThread && !activeApiThread ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
              <MessageCircle size={32} className="text-stone-700" />
              <p className="text-stone-500 text-sm">Select a conversation or start one from an artist's profile.</p>
            </div>
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
                  src={activeApiThread.otherUserAvatar ?? `https://picsum.photos/seed/${activeApiThread.otherUserId}/60/60`}
                  alt={activeApiThread.otherUserName}
                  className="h-8 w-8 rounded-full object-cover"
                />
                <p className="text-sm font-medium text-amber-100">{activeApiThread.otherUserName}</p>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {apiMessages.length === 0 && (
                  <p className="text-center text-sm text-stone-600 py-8">No messages yet — say hello!</p>
                )}
                {apiMessages.map((msg) => (
                  <div key={msg.id} className="flex justify-start">
                    <img
                      src={msg.senderAvatarUrl ?? `https://picsum.photos/seed/${msg.senderId}/60/60`}
                      alt={msg.senderName}
                      className="h-7 w-7 rounded-full object-cover mr-2 mt-1 shrink-0"
                    />
                    <div className="max-w-[75%] rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm bg-stone-800 text-stone-200">
                      <p className="text-[9px] text-stone-500 mb-0.5">{msg.senderName}</p>
                      {msg.text}
                      <p className="text-[10px] mt-1 text-stone-600">{timeShort(msg.createdAt)}</p>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Compose */}
              <div className="px-4 py-3 border-t border-white/10">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Write a message…"
                    value={newMsg}
                    onChange={(e) => setNewMsg(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleApiSend(); } }}
                    className="flex-1 rounded-xl border border-white/10 bg-stone-800 px-4 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none"
                  />
                  <button
                    onClick={() => void handleApiSend()}
                    disabled={!newMsg.trim()}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-stone-950 hover:bg-amber-400 transition-colors disabled:opacity-40"
                  >
                    <Send size={15} />
                  </button>
                </div>
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
                  src={activeThread!.participantAvatar || `https://picsum.photos/seed/${activeThread!.participantId}/60/60`}
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

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {activeThread!.messages.map((msg) => {
                  const isMe = msg.senderId === "__current_user__";
                  return (
                    <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                      {!isMe && (
                        <img
                          src={msg.senderAvatar || `https://picsum.photos/seed/${msg.senderId}/60/60`}
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
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Write a message…"
                    value={newMsg}
                    onChange={(e) => setNewMsg(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    className="flex-1 rounded-xl border border-white/10 bg-stone-800 px-4 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!newMsg.trim()}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-stone-950 hover:bg-amber-400 transition-colors disabled:opacity-40"
                  >
                    <Send size={15} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
