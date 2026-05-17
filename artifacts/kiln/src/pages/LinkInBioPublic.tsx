import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { ExternalLink, Loader2 } from "lucide-react";

interface Block { type: string; label: string; url: string; icon?: string; }
interface BioPage { userId: string; pageTitle: string | null; bio: string | null; avatarUrl: string | null; theme: string; blocks: string; isPublished: boolean; }

const THEME_STYLES: Record<string, { bg: string; card: string; text: string; sub: string; btn: string; btnText: string; }> = {
  dark:   { bg: "bg-stone-950",  card: "bg-stone-900",    text: "text-stone-100", sub: "text-stone-400",  btn: "bg-amber-500",  btnText: "text-stone-950" },
  light:  { bg: "bg-amber-50",   card: "bg-white",         text: "text-stone-900", sub: "text-stone-500",  btn: "bg-stone-900",  btnText: "text-white" },
  forest: { bg: "bg-emerald-950", card: "bg-emerald-900",  text: "text-emerald-50", sub: "text-emerald-300/60", btn: "bg-amber-400", btnText: "text-stone-950" },
  slate:  { bg: "bg-slate-900",  card: "bg-slate-800",     text: "text-slate-100", sub: "text-slate-400",  btn: "bg-indigo-400", btnText: "text-white" },
};

export default function LinkInBioPublic() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<BioPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/link-in-bio/${slug}`).then(r => r.json()).then(d => {
      if (d.page) setPage(d.page);
      else setNotFound(true);
      setLoading(false);
    }).catch(() => { setNotFound(true); setLoading(false); });
  }, [slug]);

  if (loading) return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center">
      <Loader2 className="animate-spin text-amber-500" size={32} />
    </div>
  );
  if (notFound || !page) return (
    <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center text-stone-400 gap-4">
      <p className="text-lg">Page not found</p>
      <Link href="/" className="text-amber-400 hover:text-amber-300 text-sm">Back to Kiln</Link>
    </div>
  );

  const theme = THEME_STYLES[page.theme ?? "dark"] ?? THEME_STYLES.dark;
  let blocks: Block[] = [];
  try { blocks = JSON.parse(page.blocks); } catch {}

  return (
    <div className={`min-h-screen ${theme.bg} py-12 px-4`}>
      <div className="max-w-sm mx-auto">
        <div className="text-center mb-8">
          {page.avatarUrl && <img src={page.avatarUrl} alt={page.pageTitle ?? ""} className="w-24 h-24 rounded-full object-cover mx-auto mb-4 border-2 border-white/10" />}
          <h1 className={`text-2xl font-bold mb-1 ${theme.text}`}>{page.pageTitle}</h1>
          {page.bio && <p className={`text-sm leading-relaxed ${theme.sub}`}>{page.bio}</p>}
        </div>

        <div className="space-y-3">
          {blocks.map((b, i) => {
            if (b.type === "text") {
              return (
                <div key={i} className={`rounded-2xl px-5 py-4 ${theme.card} text-center`}>
                  <p className={`text-sm ${theme.sub}`}>{b.label}</p>
                </div>
              );
            }
            const href = b.url || (b.type === "shop" ? `/shop` : b.type === "workshop" ? `/workshops` : b.type === "campaign" ? `/campaigns` : "#");
            return (
              <a key={i} href={href} className={`block w-full px-5 py-3.5 rounded-2xl ${theme.btn} ${theme.btnText} font-semibold text-sm text-center flex items-center justify-center gap-2 hover:opacity-90 transition-opacity`}>
                {b.icon && <span>{b.icon}</span>}
                {b.label}
                {b.url && <ExternalLink size={12} className="opacity-60" />}
              </a>
            );
          })}
        </div>

        <div className={`mt-10 text-center text-xs ${theme.sub} opacity-40`}>
          <a href="/" className="hover:opacity-70 transition-opacity">Powered by Kiln</a>
        </div>
      </div>
    </div>
  );
}
