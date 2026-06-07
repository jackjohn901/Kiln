import { useEffect, useState } from "react";
import { GraduationCap } from "lucide-react";

type Mentor = {
  id: string;
  name: string;
  role: string | null;
  institution: string | null;
  years: string | null;
  note: string | null;
  imageUrl: string | null;
};

/**
 * Public, read-only display of the professors / teachers a user has credited
 * in their craft lineage. Renders nothing when the user has none, so it never
 * clutters a profile with an empty header.
 */
export default function LineageMentorsView({ userId }: { userId: string }) {
  const [mentors, setMentors] = useState<Mentor[]>([]);

  useEffect(() => {
    if (!userId) { setMentors([]); return; }
    const ac = new AbortController();
    fetch(`/api/lineage/mentors/${encodeURIComponent(userId)}`, { signal: ac.signal })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { mentors: Mentor[] }) => setMentors(d.mentors))
      .catch(() => { /* read-only: leave empty on failure or abort */ });
    return () => ac.abort();
  }, [userId]);

  if (mentors.length === 0) return null;

  return (
    <div>
      <h3 className="mb-3 font-serif text-lg text-amber-100">Professors &amp; Teachers</h3>
      <div className="space-y-2">
        {mentors.map(m => (
          <div key={m.id} className="flex items-start gap-3 rounded-xl border border-white/8 bg-stone-900/40 px-4 py-3">
            <div className="h-11 w-11 rounded-full bg-stone-700 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
              {m.imageUrl ? <img src={m.imageUrl} alt="" className="h-full w-full object-cover" /> : <GraduationCap size={16} className="text-stone-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-stone-200 truncate">{m.name}</p>
              {(m.role || m.institution) && (
                <p className="text-xs text-stone-500 truncate">{[m.role, m.institution].filter(Boolean).join(" · ")}</p>
              )}
              {m.years && <p className="text-[11px] text-stone-600">{m.years}</p>}
              {m.note && <p className="text-xs text-stone-400 mt-1 italic">{m.note}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
