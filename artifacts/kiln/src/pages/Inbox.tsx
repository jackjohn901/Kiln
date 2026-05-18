import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Inbox as InboxIcon, Check, X, Clock, ChevronRight, MessageCircle, DollarSign, Layers, RefreshCw } from "lucide-react";
import Nav from "@/components/Nav";
import { useSocial } from "@/contexts/SocialContext";
import { useProfile } from "@/contexts/ProfileContext";

const TYPE_LABELS: Record<string, string> = {
  custom: "Custom Commission",
  series: "Series / Gallery",
  workshop: "Workshop",
  reproduction: "Reproduction",
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  custom: <Layers size={13} />,
  series: <Layers size={13} />,
  workshop: <Clock size={13} />,
  reproduction: <RefreshCw size={13} />,
};

const STATUS_COLORS: Record<string, string> = {
  pending: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  accepted: "text-green-400 bg-green-500/10 border-green-500/20",
  declined: "text-red-400 bg-red-500/10 border-red-500/20",
  quoted: "text-sky-400 bg-sky-500/10 border-sky-500/20",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor(diff / 60000);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return `${mins}m ago`;
}

export default function Inbox() {
  const [, navigate] = useLocation();
  const { profile } = useProfile();
  const { receivedInquiries: socialReceived, commissions: socialSent, acceptInquiry: socialAccept, declineInquiry: socialDecline, quoteInquiry } = useSocial();
  const [tab, setTab] = useState<"received" | "sent">("received");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [quotingId, setQuotingId] = useState<string | null>(null);
  const [quoteForm, setQuoteForm] = useState({ price: "", paymentSchedule: "", deliveryDate: "", terms: "" });
  const [apiReceived, setApiReceived] = useState<typeof socialReceived>([]);
  const [apiSent, setApiSent] = useState<typeof socialSent>([]);

  useEffect(() => {
    fetch("/api/me/commissions/received", { credentials: "include" })
      .then(r => r.ok ? r.json() as Promise<{ commissions: typeof socialReceived }> : null)
      .then(data => { if (data?.commissions?.length) setApiReceived(data.commissions); })
      .catch(() => {});
    fetch("/api/me/commissions", { credentials: "include" })
      .then(r => r.ok ? r.json() as Promise<{ commissions: typeof socialSent }> : null)
      .then(data => { if (data?.commissions?.length) setApiSent(data.commissions); })
      .catch(() => {});
  }, []);

  const receivedInquiries = apiReceived.length ? apiReceived : socialReceived;
  const commissions = apiSent.length ? apiSent : socialSent;

  async function acceptInquiry(id: string) {
    socialAccept(id);
    await fetch(`/api/commissions/${id}`, {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "accepted" }),
    }).catch(() => {});
    setApiReceived(prev => prev.map(i => i.id === id ? { ...i, status: "accepted" as const } : i));
  }

  async function declineInquiry(id: string) {
    socialDecline(id);
    await fetch(`/api/commissions/${id}`, {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "declined" }),
    }).catch(() => {});
    setApiReceived(prev => prev.map(i => i.id === id ? { ...i, status: "declined" as const } : i));
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#12100e]">
        <Nav />
        <div className="flex flex-col items-center justify-center gap-4 p-16 text-center">
          <InboxIcon size={36} className="text-stone-600" />
          <h2 className="font-serif text-2xl text-amber-100">Commission Inbox</h2>
          <p className="text-stone-500 max-w-xs">Set up your artist profile to see your commission inquiries.</p>
          <button onClick={() => navigate("/setup")} className="rounded-full bg-amber-500 px-6 py-2.5 font-semibold text-stone-950 hover:bg-amber-400 transition-colors">
            Create Profile
          </button>
        </div>
      </div>
    );
  }

  const pending = receivedInquiries.filter((i) => i.status === "pending").length;

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6">
          <h1 className="font-serif text-2xl text-amber-100">Commission Inbox</h1>
          <p className="text-sm text-stone-500 mt-1">Manage your incoming commission requests</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-xl border border-white/10 bg-stone-900/60 p-1">
          <button
            onClick={() => setTab("received")}
            className={`relative flex-1 rounded-lg py-2 text-sm font-medium transition-all ${tab === "received" ? "bg-stone-800 text-amber-200" : "text-stone-500 hover:text-stone-300"}`}
          >
            Received
            {pending > 0 && (
              <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-stone-950">
                {pending}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("sent")}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${tab === "sent" ? "bg-stone-800 text-amber-200" : "text-stone-500 hover:text-stone-300"}`}
          >
            Sent
            {commissions.length > 0 && (
              <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-stone-700 px-1.5 text-[10px] font-medium text-stone-300">
                {commissions.length}
              </span>
            )}
          </button>
        </div>

        {/* Received */}
        {tab === "received" && (
          <div className="space-y-3">
            {receivedInquiries.length === 0 && (
              <div className="rounded-2xl border border-white/8 bg-stone-900/40 p-12 text-center">
                <InboxIcon size={28} className="mx-auto mb-3 text-stone-600" />
                <p className="text-stone-500">No inquiries yet. Share your work and set commissions to open.</p>
              </div>
            )}
            {receivedInquiries.map((inquiry) => (
              <div
                key={inquiry.id}
                className="rounded-2xl border border-white/8 bg-stone-900/40 overflow-hidden"
              >
                {/* Header */}
                <button
                  onClick={() => setExpanded(expanded === inquiry.id ? null : inquiry.id)}
                  className="w-full flex items-start gap-3 p-4 text-left hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-800 text-xs font-bold text-stone-300">
                    {inquiry.fromName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-amber-100 text-sm">{inquiry.fromName}</span>
                      <span className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[inquiry.status]}`}>
                        {inquiry.status.charAt(0).toUpperCase() + inquiry.status.slice(1)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-stone-500">
                      <span className="flex items-center gap-1">{TYPE_ICONS[inquiry.type]}{TYPE_LABELS[inquiry.type]}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1"><DollarSign size={11} />{inquiry.budget}</span>
                      <span>·</span>
                      <span>{timeAgo(inquiry.createdAt)}</span>
                    </div>
                    <p className="mt-1.5 text-xs text-stone-400 line-clamp-2">{inquiry.description}</p>
                  </div>
                  <ChevronRight
                    size={14}
                    className={`shrink-0 text-stone-600 transition-transform mt-1 ${expanded === inquiry.id ? "rotate-90" : ""}`}
                  />
                </button>

                {/* Expanded detail */}
                {expanded === inquiry.id && (
                  <div className="border-t border-white/8 px-4 pb-4 pt-3 space-y-3">
                    <div className="text-sm text-stone-300 leading-relaxed">{inquiry.description}</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-stone-800/60 px-3 py-2">
                        <p className="text-[10px] text-stone-500 mb-0.5">Budget</p>
                        <p className="text-sm text-amber-200 font-medium">{inquiry.budget}</p>
                      </div>
                      <div className="rounded-lg bg-stone-800/60 px-3 py-2">
                        <p className="text-[10px] text-stone-500 mb-0.5">Timeline</p>
                        <p className="text-sm text-stone-200">{inquiry.timeline}</p>
                      </div>
                      {inquiry.dimensions && (
                        <div className="rounded-lg bg-stone-800/60 px-3 py-2 col-span-2">
                          <p className="text-[10px] text-stone-500 mb-0.5">Dimensions</p>
                          <p className="text-sm text-stone-200">{inquiry.dimensions}</p>
                        </div>
                      )}
                      <div className="rounded-lg bg-stone-800/60 px-3 py-2">
                        <p className="text-[10px] text-stone-500 mb-0.5">Contact</p>
                        <p className="text-sm text-stone-200">{inquiry.fromEmail}</p>
                      </div>
                    </div>

                    {inquiry.status === "pending" && (
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => acceptInquiry(inquiry.id)}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-green-600/20 border border-green-500/30 py-2.5 text-sm font-medium text-green-400 hover:bg-green-600/30 transition-colors"
                        >
                          <Check size={14} /> Accept
                        </button>
                        <button
                          onClick={() => declineInquiry(inquiry.id)}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-600/10 border border-red-500/20 py-2.5 text-sm font-medium text-red-400 hover:bg-red-600/20 transition-colors"
                        >
                          <X size={14} /> Decline
                        </button>
                        <button
                          onClick={() => navigate(`/messages`)}
                          className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-stone-800 px-3 py-2.5 text-sm text-stone-400 hover:text-amber-300 transition-colors"
                          title="Message"
                        >
                          <MessageCircle size={14} />
                        </button>
                      </div>
                    )}
                    {inquiry.status === "accepted" && quotingId !== inquiry.id && (
                      <div className="space-y-2">
                        <div className={`rounded-xl border px-4 py-3 text-sm font-medium text-center ${STATUS_COLORS[inquiry.status]}`}>
                          Accepted — send a formal quote to move forward.
                        </div>
                        <button
                          onClick={() => { setQuotingId(inquiry.id); setQuoteForm({ price: "", paymentSchedule: "50% up front, 50% on delivery", deliveryDate: "", terms: "Payment via bank transfer or Venmo. No refunds after work begins." }); }}
                          className="flex w-full items-center justify-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 py-2.5 text-sm font-medium text-sky-300 hover:bg-sky-500/20 transition-colors"
                        >
                          <DollarSign size={14} /> Send Quote
                        </button>
                      </div>
                    )}
                    {inquiry.status === "accepted" && quotingId === inquiry.id && (
                      <div className="space-y-3 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
                        <p className="text-xs font-semibold text-sky-400 uppercase tracking-wide">Formal Quote</p>
                        <div>
                          <label className="block text-[11px] text-stone-500 mb-1">Price *</label>
                          <input value={quoteForm.price} onChange={(e) => setQuoteForm((f) => ({ ...f, price: e.target.value }))} placeholder="e.g. $1,200" className="w-full rounded-lg border border-white/10 bg-stone-800 px-3 py-2 text-sm text-stone-200 placeholder-stone-600 focus:border-sky-500/40 focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-[11px] text-stone-500 mb-1">Payment Schedule *</label>
                          <input value={quoteForm.paymentSchedule} onChange={(e) => setQuoteForm((f) => ({ ...f, paymentSchedule: e.target.value }))} placeholder="50% up front, 50% on delivery" className="w-full rounded-lg border border-white/10 bg-stone-800 px-3 py-2 text-sm text-stone-200 placeholder-stone-600 focus:border-sky-500/40 focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-[11px] text-stone-500 mb-1">Expected Delivery Date *</label>
                          <input type="date" value={quoteForm.deliveryDate} onChange={(e) => setQuoteForm((f) => ({ ...f, deliveryDate: e.target.value }))} className="w-full rounded-lg border border-white/10 bg-stone-800 px-3 py-2 text-sm text-stone-200 focus:border-sky-500/40 focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-[11px] text-stone-500 mb-1">Terms & Conditions</label>
                          <textarea value={quoteForm.terms} onChange={(e) => setQuoteForm((f) => ({ ...f, terms: e.target.value }))} rows={3} placeholder="Cancellation policy, revisions included, etc." className="w-full rounded-lg border border-white/10 bg-stone-800 px-3 py-2 text-sm text-stone-200 placeholder-stone-600 focus:border-sky-500/40 focus:outline-none resize-none" />
                        </div>
                        <div className="flex gap-2">
                          <button
                            disabled={!quoteForm.price || !quoteForm.paymentSchedule || !quoteForm.deliveryDate}
                            onClick={() => {
                              const quote = { ...quoteForm, sentAt: new Date().toISOString() };
                              quoteInquiry(inquiry.id, quote);
                              setApiReceived(prev => prev.map(i => i.id === inquiry.id ? { ...i, status: "quoted" as const, quote } : i));
                              setQuotingId(null);
                            }}
                            className="flex-1 rounded-xl bg-sky-600 py-2.5 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            Send Quote
                          </button>
                          <button onClick={() => setQuotingId(null)} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-stone-400 hover:text-stone-200 transition-colors">
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                    {inquiry.status === "quoted" && inquiry.quote && (
                      <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 space-y-2">
                        <p className="text-xs font-semibold text-sky-400 uppercase tracking-wide">Quote Sent</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div><p className="text-stone-500">Price</p><p className="text-stone-200 font-semibold">{inquiry.quote.price}</p></div>
                          <div><p className="text-stone-500">Delivery</p><p className="text-stone-200">{inquiry.quote.deliveryDate}</p></div>
                          <div className="col-span-2"><p className="text-stone-500">Payment</p><p className="text-stone-200">{inquiry.quote.paymentSchedule}</p></div>
                        </div>
                      </div>
                    )}
                    {inquiry.status === "declined" && (
                      <div className={`rounded-xl border px-4 py-3 text-sm font-medium text-center ${STATUS_COLORS[inquiry.status]}`}>
                        You declined this inquiry.
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Sent */}
        {tab === "sent" && (
          <div className="space-y-3">
            {commissions.length === 0 && (
              <div className="rounded-2xl border border-white/8 bg-stone-900/40 p-12 text-center">
                <p className="text-stone-500">You haven't sent any commission inquiries yet. Visit an artist's profile to request a commission.</p>
              </div>
            )}
            {commissions.map((inquiry) => (
              <div key={inquiry.id} className="rounded-2xl border border-white/8 bg-stone-900/40 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-800 text-xs font-bold text-amber-300">
                    {inquiry.toArtistName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-amber-100 text-sm">To: {inquiry.toArtistName}</span>
                      <span className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[inquiry.status]}`}>
                        {inquiry.status.charAt(0).toUpperCase() + inquiry.status.slice(1)}
                      </span>
                    </div>
                    <div className="text-xs text-stone-500 mb-2">
                      {TYPE_LABELS[inquiry.type]} · {inquiry.budget} · {timeAgo(inquiry.createdAt)}
                    </div>
                    <p className="text-xs text-stone-400 line-clamp-2">{inquiry.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
