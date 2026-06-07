import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GitBranch, Plus, ChevronRight, X, Check, Users, Award, ExternalLink, Pencil, Trash2, GraduationCap, Loader2, ImagePlus } from "lucide-react";
import { Link } from "wouter";
import { LINEAGE_NODES, getAncestors, getGeneration, type LineageNode } from "@/data/lineage";
import { useProfile } from "@/contexts/ProfileContext";
import { useAuth } from "@/contexts/AuthContext";
import { useUpload } from "@/hooks/useUpload";
import { toast } from "@/hooks/use-toast";

const GENERATION_COLORS = [
  "from-amber-600/20 to-amber-600/5 border-amber-600/30 text-amber-300",
  "from-orange-600/20 to-orange-600/5 border-orange-600/30 text-orange-300",
  "from-rose-600/20 to-rose-600/5 border-rose-600/30 text-rose-300",
  "from-purple-600/20 to-purple-600/5 border-purple-600/30 text-purple-300",
  "from-blue-600/20 to-blue-600/5 border-blue-600/30 text-blue-300",
];

function NodeCard({ node, depth, onSelect }: { node: LineageNode; depth: number; onSelect: (n: LineageNode) => void }) {
  const colorClass = GENERATION_COLORS[Math.min(depth, GENERATION_COLORS.length - 1)];
  const apprentices = LINEAGE_NODES.filter(n => node.apprenticeIds.includes(n.artistId));

  return (
    <div className="flex flex-col items-center">
      <button onClick={() => onSelect(node)}
        className={`w-[140px] rounded-2xl border bg-gradient-to-b p-3 text-center transition-all hover:scale-105 active:scale-95 ${colorClass}`}>
        <img src={node.avatarUrl} alt="" className="mx-auto h-10 w-10 rounded-full object-cover mb-2 border-2 border-white/20" />
        <p className="text-xs font-bold leading-tight">{node.name}</p>
        <p className="text-[9px] opacity-60 mt-0.5">{node.medium}</p>
        <p className="text-[9px] opacity-50">{node.era}</p>
        {node.isFounder && (
          <span className="mt-1.5 inline-block rounded-full bg-amber-500/20 px-2 py-0.5 text-[8px] font-bold text-amber-400 border border-amber-500/30">FOUNDER</span>
        )}
      </button>

      {apprentices.length > 0 && (
        <div className="flex flex-col items-center mt-2">
          <div className="w-px h-5 bg-white/15" />
          <div className="flex gap-3 items-start">
            {apprentices.map((apt, i) => (
              <div key={apt.artistId} className="flex flex-col items-center">
                {apprentices.length > 1 && (
                  <div className="w-px h-3 bg-white/15" />
                )}
                <NodeCard node={apt} depth={depth + 1} onSelect={onSelect} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

type Mentor = {
  id: string;
  userId: string;
  name: string;
  role: string | null;
  institution: string | null;
  years: string | null;
  note: string | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

type MentorForm = {
  name: string;
  role: string;
  institution: string;
  years: string;
  note: string;
  imageUrl: string;
};

const EMPTY_FORM: MentorForm = { name: "", role: "", institution: "", years: "", note: "", imageUrl: "" };

export default function LineageGraph() {
  const { profile } = useProfile();
  const { isAuthenticated } = useAuth();
  const { upload } = useUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedNode, setSelectedNode] = useState<LineageNode | null>(null);
  const [showClaim, setShowClaim] = useState(false);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [mentorsLoading, setMentorsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [claimForm, setClaimForm] = useState<MentorForm>(EMPTY_FORM);

  const roots = LINEAGE_NODES.filter(n => !n.mentorId);

  const [pathFromId, setPathFromId] = useState("");
  const [pathToId, setPathToId] = useState("");
  const [foundPath, setFoundPath] = useState<LineageNode[] | null>(null);
  const [noPath, setNoPath] = useState(false);

  function findPath(fromId: string, toId: string): LineageNode[] {
    if (!fromId || !toId || fromId === toId) return [];
    const queue: string[][] = [[fromId]];
    const visited = new Set<string>([fromId]);
    while (queue.length > 0) {
      const path = queue.shift()!;
      const current = path[path.length - 1];
      const node = LINEAGE_NODES.find(n => n.artistId === current);
      if (!node) continue;
      const neighbors = [...(node.mentorId ? [node.mentorId] : []), ...node.apprenticeIds];
      for (const neighbor of neighbors) {
        if (visited.has(neighbor)) continue;
        const newPath = [...path, neighbor];
        if (neighbor === toId) {
          return newPath.map(id => LINEAGE_NODES.find(n => n.artistId === id)!).filter(Boolean);
        }
        visited.add(neighbor);
        queue.push(newPath);
      }
    }
    return [];
  }

  function handleFindPath() {
    if (!pathFromId || !pathToId) return;
    const result = findPath(pathFromId, pathToId);
    if (result.length > 0) {
      setFoundPath(result);
      setNoPath(false);
    } else {
      setFoundPath(null);
      setNoPath(true);
    }
  }

  useEffect(() => {
    if (!isAuthenticated) { setMentors([]); return; }
    let cancelled = false;
    setMentorsLoading(true);
    fetch("/api/me/lineage/mentors", { credentials: "include" })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { mentors: Mentor[] }) => { if (!cancelled) setMentors(d.mentors); })
      .catch(() => { /* read-only load: leave the list empty on failure */ })
      .finally(() => { if (!cancelled) setMentorsLoading(false); });
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  function openAdd() {
    setEditingId(null);
    setClaimForm(EMPTY_FORM);
    setShowClaim(true);
  }

  function openEdit(m: Mentor) {
    setEditingId(m.id);
    setClaimForm({
      name: m.name,
      role: m.role ?? "",
      institution: m.institution ?? "",
      years: m.years ?? "",
      note: m.note ?? "",
      imageUrl: m.imageUrl ?? "",
    });
    setShowClaim(true);
  }

  async function handleImagePick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImageUploading(true);
    try {
      const { servingUrl } = await upload(file);
      setClaimForm(f => ({ ...f, imageUrl: servingUrl }));
    } catch {
      toast({ title: "Couldn't upload photo", description: "Please try a different image.", variant: "destructive" });
    } finally {
      setImageUploading(false);
    }
  }

  async function saveMentor() {
    if (!claimForm.name.trim()) {
      toast({ title: "Add a name", description: "Enter your professor or teacher's name.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const body = {
      name: claimForm.name.trim(),
      role: claimForm.role.trim() || null,
      institution: claimForm.institution.trim() || null,
      years: claimForm.years.trim() || null,
      note: claimForm.note.trim() || null,
      imageUrl: claimForm.imageUrl || null,
    };
    try {
      const url = editingId ? `/api/me/lineage/mentors/${editingId}` : "/api/me/lineage/mentors";
      const r = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => null);
        throw new Error(data?.error ?? "Save failed");
      }
      const { mentor } = (await r.json()) as { mentor: Mentor };
      setMentors(prev => (editingId ? prev.map(m => (m.id === mentor.id ? mentor : m)) : [...prev, mentor]));
      setShowClaim(false);
      setClaimForm(EMPTY_FORM);
      setEditingId(null);
      toast({ title: editingId ? "Professor updated" : "Professor added" });
    } catch (err) {
      toast({ title: "Couldn't save", description: err instanceof Error ? err.message : "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function deleteMentor(id: string) {
    const prev = mentors;
    setMentors(p => p.filter(m => m.id !== id));
    try {
      const r = await fetch(`/api/me/lineage/mentors/${id}`, { method: "DELETE", credentials: "include" });
      if (!r.ok) throw new Error(String(r.status));
    } catch {
      setMentors(prev);
      toast({ title: "Couldn't remove", description: "Please try again.", variant: "destructive" });
    }
  }

  const totalArtists = LINEAGE_NODES.length;
  const maxGen = Math.max(...LINEAGE_NODES.map(n => getGeneration(n.artistId)));

  return (
    <div className="min-h-screen bg-[#12100e] pb-32 pt-2">
      <div className="mx-auto max-w-2xl px-4">
        {/* Header */}
        <div className="pt-10 pb-5">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <GitBranch size={20} className="text-amber-400" />
            <h1 className="text-2xl font-bold text-amber-100">Craft Lineage</h1>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-stone-400">Curated reference</span>
          </div>
          <p className="text-xs text-stone-500">A curated family tree of craft knowledge — who taught whom, generation by generation.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Artists", value: totalArtists, icon: Users },
            { label: "Generations", value: maxGen + 1, icon: GitBranch },
            { label: "Lineages", value: roots.length, icon: Award },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-2xl bg-stone-900/60 border border-white/8 p-3 text-center">
              <Icon size={14} className="text-amber-400 mx-auto mb-1" />
              <p className="text-xl font-black text-amber-100">{value}</p>
              <p className="text-[10px] text-stone-500">{label}</p>
            </div>
          ))}
        </div>

        {/* Your professors & teachers */}
        <div className="mb-6 rounded-2xl bg-stone-900/60 border border-white/8 p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">Your Professors &amp; Teachers</p>
            {isAuthenticated && (
              <button onClick={openAdd} className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300">
                <Plus size={13} /> Add
              </button>
            )}
          </div>
          <p className="text-[11px] text-stone-600 mb-3">The people who shaped your craft — they don&apos;t need a Kiln account.</p>

          {!isAuthenticated ? (
            <div className="rounded-xl border border-dashed border-white/15 py-5 text-center">
              <GraduationCap size={20} className="text-stone-600 mx-auto mb-2" />
              <p className="text-xs text-stone-500">Sign in to add the professors and teachers who shaped your craft.</p>
            </div>
          ) : mentorsLoading ? (
            <div className="flex justify-center py-6"><Loader2 size={18} className="text-stone-600 animate-spin" /></div>
          ) : mentors.length === 0 ? (
            <button onClick={openAdd} className="w-full rounded-xl border border-dashed border-white/15 py-4 text-xs text-stone-500 hover:text-stone-400 hover:border-white/25 transition-colors">
              + Add a professor or teacher who shaped your craft
            </button>
          ) : (
            <div className="space-y-2">
              {mentors.map(m => (
                <div key={m.id} className="flex items-start gap-3 rounded-xl border border-white/8 bg-stone-800/40 p-3">
                  <div className="h-11 w-11 rounded-full bg-stone-700 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                    {m.imageUrl ? <img src={m.imageUrl} alt="" className="h-full w-full object-cover" /> : <GraduationCap size={16} className="text-stone-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-amber-100 truncate">{m.name}</p>
                    {(m.role || m.institution) && (
                      <p className="text-xs text-stone-400 truncate">{[m.role, m.institution].filter(Boolean).join(" · ")}</p>
                    )}
                    {m.years && <p className="text-[11px] text-stone-600">{m.years}</p>}
                    {m.note && <p className="text-xs text-stone-500 mt-1 italic line-clamp-3">{m.note}</p>}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button onClick={() => openEdit(m)} className="rounded-lg bg-stone-700/60 p-1.5 text-stone-300 hover:text-amber-300" aria-label="Edit professor"><Pencil size={12} /></button>
                    <button onClick={() => deleteMentor(m.id)} className="rounded-lg bg-stone-700/60 p-1.5 text-stone-400 hover:text-rose-400" aria-label="Remove professor"><Trash2 size={12} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Path Finder */}
        <div className="mb-6 rounded-2xl bg-stone-900/60 border border-white/8 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-3 flex items-center gap-2">
            <Check size={12} className="text-amber-500" /> Find the Connection
          </p>
          <p className="text-[11px] text-stone-600 mb-3">Select any two artists to find how they're linked through the lineage tree.</p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <label className="text-[10px] text-stone-600 mb-1 block">From artist</label>
              <select value={pathFromId} onChange={e => { setPathFromId(e.target.value); setFoundPath(null); setNoPath(false); }}
                className="w-full rounded-xl bg-stone-800 border border-white/10 px-3 py-2 text-xs text-amber-100 focus:outline-none focus:border-amber-500/40">
                <option value="">Select…</option>
                {LINEAGE_NODES.map(n => <option key={n.artistId} value={n.artistId}>{n.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-stone-600 mb-1 block">To artist</label>
              <select value={pathToId} onChange={e => { setPathToId(e.target.value); setFoundPath(null); setNoPath(false); }}
                className="w-full rounded-xl bg-stone-800 border border-white/10 px-3 py-2 text-xs text-amber-100 focus:outline-none focus:border-amber-500/40">
                <option value="">Select…</option>
                {LINEAGE_NODES.map(n => <option key={n.artistId} value={n.artistId}>{n.name}</option>)}
              </select>
            </div>
          </div>
          <button
            onClick={handleFindPath}
            disabled={!pathFromId || !pathToId || pathFromId === pathToId}
            className="w-full rounded-full bg-amber-500 py-2.5 text-xs font-bold text-stone-950 disabled:opacity-40 transition-opacity"
          >
            Find Connection
          </button>
          {noPath && (
            <p className="mt-3 text-center text-xs text-stone-500">No direct lineage connection found between these artists.</p>
          )}
          {foundPath && foundPath.length > 0 && (
            <div className="mt-4">
              <p className="text-[10px] text-stone-500 mb-2">{foundPath.length - 1} step{foundPath.length > 2 ? "s" : ""} apart</p>
              <div className="flex items-center flex-wrap gap-1.5">
                {foundPath.map((node, i) => (
                  <div key={node.artistId} className="flex items-center gap-1.5">
                    <button onClick={() => setSelectedNode(node)}
                      className="flex items-center gap-1.5 rounded-full border border-white/10 bg-stone-800 px-2.5 py-1.5 hover:border-amber-500/30 transition-colors">
                      <img src={node.avatarUrl} alt="" className="h-5 w-5 rounded-full object-cover" />
                      <span className="text-xs text-amber-200">{node.name}</span>
                    </button>
                    {i < foundPath.length - 1 && <ChevronRight size={12} className="text-stone-600 shrink-0" />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tree — scrollable horizontally */}
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-4">The American Studio Glass Lineage</p>
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-6 min-w-max">
              {roots.map((root) => (
                <NodeCard key={root.artistId} node={root} depth={0} onSelect={(n) => setSelectedNode(n)} />
              ))}
            </div>
          </div>
        </div>

        {/* Artists list */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-3">All Artists ({totalArtists})</p>
          <div className="space-y-2">
            {LINEAGE_NODES.map((node) => {
              const gen = getGeneration(node.artistId);
              const ancestors = getAncestors(node.artistId);
              const colorClass = GENERATION_COLORS[Math.min(gen, GENERATION_COLORS.length - 1)];
              return (
                <button key={node.artistId} onClick={() => setSelectedNode(node)}
                  className="w-full rounded-2xl border border-white/8 bg-stone-900/60 p-3 flex items-center gap-3 hover:border-amber-500/20 transition-colors text-left">
                  <img src={node.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-amber-100 truncate">{node.name}</p>
                      {node.isFounder && <Award size={11} className="text-amber-500 shrink-0" />}
                    </div>
                    <p className="text-xs text-stone-500 truncate">{node.medium} · {node.location}</p>
                    {ancestors.length > 0 && (
                      <p className="text-[10px] text-stone-600 mt-0.5">
                        {ancestors.map(a => a.name).join(" → ")} → {node.name}
                      </p>
                    )}
                  </div>
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold bg-gradient-to-r ${colorClass}`}>
                    Gen {gen + 1}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detail sheet */}
      <AnimatePresence>
        {selectedNode && (
          <>
            <motion.div className="fixed inset-0 z-[60] bg-black/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedNode(null)} />
            <motion.div className="fixed bottom-0 left-0 right-0 z-[61] max-h-[85vh] rounded-t-3xl bg-[#1a1714] border-t border-white/10 overflow-y-auto"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 300 }}>
              <div className="p-5">
                <div className="flex items-start gap-4 mb-5">
                  <img src={selectedNode.avatarUrl} alt="" className="h-16 w-16 rounded-2xl object-cover" />
                  <div className="flex-1">
                    <h2 className="text-lg font-bold text-amber-100">{selectedNode.name}</h2>
                    <p className="text-xs text-stone-500">{selectedNode.medium} · {selectedNode.era}</p>
                    <p className="text-xs text-stone-500">{selectedNode.location}</p>
                    {selectedNode.isFounder && (
                      <span className="mt-1.5 inline-block rounded-full bg-amber-500/15 border border-amber-500/25 px-2 py-0.5 text-[10px] font-bold text-amber-400">Movement Founder</span>
                    )}
                  </div>
                  <button onClick={() => setSelectedNode(null)} className="rounded-full bg-stone-800 p-2 text-stone-400"><X size={14} /></button>
                </div>
                <p className="text-sm text-stone-300 leading-relaxed mb-5">{selectedNode.bio}</p>

                <div className="space-y-3">
                  {selectedNode.mentorId && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-600 mb-1.5">Trained Under</p>
                      <div className="flex items-center gap-2">
                        {LINEAGE_NODES.filter(n => n.artistId === selectedNode.mentorId).map(m => (
                          <button key={m.artistId} onClick={() => setSelectedNode(m)} className="flex items-center gap-2 rounded-full bg-stone-800 border border-white/10 px-3 py-1.5 hover:border-white/20 transition-colors">
                            <img src={m.avatarUrl} alt="" className="h-5 w-5 rounded-full object-cover" />
                            <span className="text-xs text-amber-200">{m.name}</span>
                            <ChevronRight size={11} className="text-stone-500" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedNode.apprenticeIds.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-600 mb-1.5">Mentored ({selectedNode.apprenticeIds.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {LINEAGE_NODES.filter(n => selectedNode.apprenticeIds.includes(n.artistId)).map(a => (
                          <button key={a.artistId} onClick={() => setSelectedNode(a)} className="flex items-center gap-2 rounded-full bg-stone-800 border border-white/10 px-3 py-1.5 hover:border-white/20 transition-colors">
                            <img src={a.avatarUrl} alt="" className="h-5 w-5 rounded-full object-cover" />
                            <span className="text-xs text-amber-200">{a.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {LINEAGE_NODES.find(n => n.artistId === selectedNode.artistId) && (
                    <Link href={`/artists/${selectedNode.artistId}`}>
                      <button className="w-full mt-2 rounded-full bg-amber-500/10 border border-amber-500/20 py-3 text-xs font-semibold text-amber-400 flex items-center justify-center gap-2">
                        <ExternalLink size={12} /> View Artist Profile
                      </button>
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add / edit professor sheet */}
      <AnimatePresence>
        {showClaim && (
          <>
            <motion.div className="fixed inset-0 z-[62] bg-black/80" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { if (!saving) setShowClaim(false); }} />
            <motion.div className="fixed bottom-0 left-0 right-0 z-[63] max-h-[90vh] overflow-y-auto rounded-t-3xl bg-[#1a1714] border-t border-white/10 p-6"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 300 }}>
              <h2 className="text-lg font-bold text-amber-100 mb-1">{editingId ? "Edit professor" : "Add a professor"}</h2>
              <p className="text-xs text-stone-500 mb-4">They don&apos;t need a Kiln account — this is your record of who taught you.</p>

              {/* Portrait */}
              <div className="flex items-center gap-3 mb-4">
                <div className="h-16 w-16 rounded-full bg-stone-800 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                  {claimForm.imageUrl ? <img src={claimForm.imageUrl} alt="" className="h-full w-full object-cover" /> : <GraduationCap size={22} className="text-stone-500" />}
                </div>
                <div className="flex items-center flex-wrap gap-2">
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={imageUploading}
                    className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs text-stone-300 hover:border-amber-500/40 disabled:opacity-50">
                    {imageUploading ? <Loader2 size={12} className="animate-spin" /> : <ImagePlus size={12} />}
                    {claimForm.imageUrl ? "Change photo" : "Add photo"}
                  </button>
                  {claimForm.imageUrl && (
                    <button type="button" onClick={() => setClaimForm(f => ({ ...f, imageUrl: "" }))} className="text-xs text-stone-500 hover:text-rose-400">Remove</button>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-stone-500 mb-1.5 block">Name *</label>
                  <input value={claimForm.name} onChange={e => setClaimForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Harvey Littleton" className="w-full rounded-xl bg-stone-800/60 border border-white/10 px-4 py-3 text-sm text-amber-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/40" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-stone-500 mb-1.5 block">Role / title</label>
                    <input value={claimForm.role} onChange={e => setClaimForm(f => ({ ...f, role: e.target.value }))}
                      placeholder="MFA Advisor" className="w-full rounded-xl bg-stone-800/60 border border-white/10 px-4 py-3 text-sm text-amber-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/40" />
                  </div>
                  <div>
                    <label className="text-xs text-stone-500 mb-1.5 block">Years</label>
                    <input value={claimForm.years} onChange={e => setClaimForm(f => ({ ...f, years: e.target.value }))}
                      placeholder="2016–2019" className="w-full rounded-xl bg-stone-800/60 border border-white/10 px-4 py-3 text-sm text-amber-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/40" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-stone-500 mb-1.5 block">School / institution</label>
                  <input value={claimForm.institution} onChange={e => setClaimForm(f => ({ ...f, institution: e.target.value }))}
                    placeholder="Pilchuck Glass School" className="w-full rounded-xl bg-stone-800/60 border border-white/10 px-4 py-3 text-sm text-amber-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/40" />
                </div>
                {!editingId && (
                  <div>
                    <label className="text-xs text-stone-500 mb-1.5 block">Or pick a known Kiln artist's name</label>
                    <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                      {LINEAGE_NODES.map(n => (
                        <button key={n.artistId} type="button" onClick={() => setClaimForm(f => ({ ...f, name: n.name }))}
                          className="flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-stone-400 hover:border-amber-500/30">
                          <img src={n.avatarUrl} alt="" className="h-4 w-4 rounded-full object-cover" />
                          {n.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-xs text-stone-500 mb-1.5 block">How did they influence your craft?</label>
                  <textarea value={claimForm.note} onChange={e => setClaimForm(f => ({ ...f, note: e.target.value }))}
                    placeholder="Studied at Pilchuck in 2018…" rows={3}
                    className="w-full rounded-xl bg-stone-800/60 border border-white/10 px-4 py-3 text-sm text-amber-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/40 resize-none" />
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setShowClaim(false)} disabled={saving} className="flex-1 rounded-full border border-white/10 py-3 text-sm text-stone-400 disabled:opacity-50">Cancel</button>
                <button onClick={saveMentor} disabled={saving || imageUploading} className="flex-1 rounded-full bg-amber-500 py-3 text-sm font-semibold text-stone-950 disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving && <Loader2 size={14} className="animate-spin" />}{editingId ? "Save changes" : "Add professor"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
