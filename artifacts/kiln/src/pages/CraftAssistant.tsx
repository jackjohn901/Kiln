import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Send, Flame, Sparkles, RefreshCw, Copy, Check } from "lucide-react";
import Nav from "@/components/Nav";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const SUGGESTED_QUESTIONS = [
  "What temperature should I fire cone 6 stoneware?",
  "Why does cobalt glass go green instead of blue?",
  "How do I prevent S-cracks in wheel-thrown pieces?",
  "What's the difference between soda and salt firing?",
  "How long should I anneal blown glass?",
  "What causes crawling in a glaze?",
  "How do I mix a good iron red glaze?",
  "What's the Orton cone temperature chart?",
];

const AI_UNAVAILABLE_MESSAGE = "Kiln AI is unavailable right now — please try again in a moment. In the meantime, fellow artists in the Guilds section are a great place to ask technique questions.";

export default function CraftAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hey! I'm Kiln AI — your craft technique assistant. Ask me anything about glass blowing, ceramics, glazes, firing schedules, studio setup, or any other craft question. What are you working on?",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput("");

    const userMsg: Message = { id: Date.now().toString(), role: "user", content, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    const history = [...messages, { role: "user" as const, content }]
      .filter(m => m.role !== "assistant" || m.id !== "welcome")
      .map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch("/api/craft-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      if (!res.ok) throw new Error("AI service unavailable");
      const data = await res.json() as { reply: string };
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.reply,
        timestamp: new Date(),
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: AI_UNAVAILABLE_MESSAGE,
        timestamp: new Date(),
      }]);
    }
    setLoading(false);
  }

  function copyMessage(id: string, content: string) {
    navigator.clipboard.writeText(content).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="min-h-screen bg-[#12100e] flex flex-col">
      <Nav />

      {/* Header */}
      <div className="sticky top-14 z-40 border-b border-white/8 bg-[#12100e]/95 backdrop-blur-md px-4 py-3">
        <div className="mx-auto max-w-2xl flex items-center gap-3">
          <Link href="/" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-stone-500 hover:text-stone-300 transition-colors">
            <ChevronLeft size={16} />
          </Link>
          <div className="flex items-center gap-2 flex-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/15 border border-amber-500/25">
              <Flame size={14} className="text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-100">Kiln AI</p>
              <p className="text-[10px] text-stone-600">Craft technique assistant</p>
            </div>
          </div>
          <button
            onClick={() => setMessages([{
              id: "welcome",
              role: "assistant",
              content: "Hey! I'm Kiln AI — your craft technique assistant. Ask me anything about glass blowing, ceramics, glazes, firing schedules, studio setup, or any other craft question. What are you working on?",
              timestamp: new Date(),
            }])}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-stone-500 hover:text-stone-300 transition-colors"
            title="New conversation"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="mx-auto max-w-2xl space-y-4 py-4">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                {msg.role === "assistant" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/15 border border-amber-500/25 mt-0.5">
                    <Flame size={12} className="text-amber-400" />
                  </div>
                )}
                <div className={`group relative max-w-[85%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
                  <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-amber-500/15 border border-amber-500/20 text-amber-100 rounded-tr-sm"
                      : "bg-stone-900/80 border border-white/8 text-stone-300 rounded-tl-sm"
                  }`}>
                    {msg.content}
                  </div>
                  {msg.role === "assistant" && (
                    <button
                      onClick={() => copyMessage(msg.id, msg.content)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] text-stone-600 hover:text-stone-400 ml-1"
                    >
                      {copied === msg.id ? <Check size={9} className="text-green-400" /> : <Copy size={9} />}
                      {copied === msg.id ? "Copied" : "Copy"}
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/15 border border-amber-500/25">
                <Flame size={12} className="text-amber-400 animate-pulse" />
              </div>
              <div className="bg-stone-900/80 border border-white/8 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-stone-600 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-stone-600 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-stone-600 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </motion.div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Suggestions (show when conversation is fresh) */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2">
          <div className="mx-auto max-w-2xl">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-600 mb-2 flex items-center gap-1">
              <Sparkles size={9} /> Try asking
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.slice(0, 4).map(q => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="rounded-full border border-white/10 bg-stone-900/60 px-3 py-1.5 text-xs text-stone-400 hover:border-amber-500/30 hover:text-amber-400 transition-colors text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="sticky bottom-0 border-t border-white/8 bg-[#12100e]/95 backdrop-blur-md px-4 py-3 pb-safe">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-end gap-3 rounded-2xl border border-white/10 bg-stone-900/80 px-4 py-2.5 focus-within:border-amber-500/30 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about techniques, glazes, temperatures, tools..."
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm text-stone-200 placeholder-stone-600 focus:outline-none max-h-32"
              style={{ lineHeight: "1.5" }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-stone-950 hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send size={13} />
            </button>
          </div>
          <p className="mt-1.5 text-center text-[10px] text-stone-700">Powered by Kiln AI · For technique questions only</p>
        </div>
      </div>
    </div>
  );
}
