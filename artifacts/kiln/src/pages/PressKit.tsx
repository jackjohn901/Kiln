import { useState, useRef } from "react";
import { Link, useParams } from "wouter";
import { ChevronLeft, Download, Printer, Copy, Check, ExternalLink, Globe, MapPin, Mail } from "lucide-react";
import Nav from "@/components/Nav";
import { getArtistById } from "@/data/artists";
import { seedArtists } from "@/data/seedArtists";

export default function PressKit() {
  const { artistId } = useParams<{ artistId: string }>();
  const artist = getArtistById(artistId ?? "") ?? seedArtists.find(a => a.id === artistId);
  const [copied, setCopied] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  if (!artist) {
    return (
      <div className="min-h-screen bg-[#12100e]">
        <Nav />
        <div className="flex items-center justify-center p-24 text-stone-600">Artist not found.</div>
      </div>
    );
  }

  const avatarUrl = artist.images[0]?.url ?? `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&h=400&fit=crop&seed=${artist.id}`;
  const selectedImages = artist.images.slice(0, 6);

  function handlePrint() {
    window.print();
  }

  function handleCopyBio() {
    if (!artist) return;
    navigator.clipboard.writeText(artist.bio + (artist.artistStatement ? "\n\n" + artist.artistStatement : "")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-[#12100e]">
      {/* Screen UI */}
      <div className="print:hidden">
        <Nav />
        <div className="mx-auto max-w-3xl px-4 pb-12 pt-6">
          <div className="mb-6 flex items-center gap-3">
            <Link href={`/artists/${artist.id}`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-stone-500 hover:text-stone-300 transition-colors">
              <ChevronLeft size={16} />
            </Link>
            <div className="flex-1">
              <h1 className="font-serif text-2xl text-amber-100">Press Kit</h1>
              <p className="text-xs text-stone-500 mt-0.5">{artist.name} · {currentYear}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyBio}
                className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-2 text-xs font-semibold text-stone-400 hover:text-stone-200 transition-colors"
              >
                {copied ? <><Check size={12} className="text-emerald-400" /> Copied</> : <><Copy size={12} /> Copy bio</>}
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors"
              >
                <Printer size={14} /> Print / PDF
              </button>
            </div>
          </div>

          {/* Preview note */}
          <div className="mb-6 rounded-xl border border-sky-500/20 bg-sky-500/5 px-4 py-3 text-xs text-stone-400">
            This is your printable press kit. Use <strong className="text-stone-200">Print / PDF</strong> to save as a PDF for gallery submissions, grant applications, and press inquiries. Content is pulled from your public profile.
          </div>

          {/* Press kit preview (screen view) */}
          <div ref={printRef} className="rounded-2xl border border-white/10 bg-stone-950 overflow-hidden">
            <PressKitDocument artist={artist} avatarUrl={avatarUrl} selectedImages={selectedImages} currentYear={currentYear} />
          </div>
        </div>
      </div>

      {/* Print view */}
      <div className="hidden print:block">
        <PressKitDocument artist={artist} avatarUrl={avatarUrl} selectedImages={selectedImages} currentYear={currentYear} />
      </div>
    </div>
  );
}

function PressKitDocument({ artist, avatarUrl, selectedImages, currentYear }: {
  artist: ReturnType<typeof getArtistById>;
  avatarUrl: string;
  selectedImages: { url: string; caption?: string }[];
  currentYear: number;
}) {
  if (!artist) return null;

  return (
    <div className="press-kit bg-white text-stone-900 print:text-black" style={{ fontFamily: "Georgia, serif" }}>
      {/* Header strip */}
      <div className="bg-stone-900 print:bg-black px-10 py-8 flex items-start gap-6">
        <img
          src={avatarUrl}
          alt={artist.name}
          className="h-24 w-24 rounded-full object-cover border-2 border-stone-700 shrink-0"
          onError={e => { (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=200&h=200&fit=crop&seed=${artist.id}`; }}
        />
        <div className="flex-1">
          <p className="text-stone-500 text-xs tracking-widest uppercase mb-1">Press Kit · {currentYear}</p>
          <h1 className="text-3xl font-bold text-white mb-1">{artist.name}</h1>
          <p className="text-amber-400 text-sm font-semibold mb-3">{artist.medium}</p>
          <div className="flex flex-wrap items-center gap-4 text-xs text-stone-400">
            <span className="flex items-center gap-1.5"><MapPin size={11} /> {artist.location}</span>
            {artist.website && <span className="flex items-center gap-1.5"><Globe size={11} /> {artist.website}</span>}
            <span className="flex items-center gap-1.5"><Mail size={11} /> press@{artist.id}.art</span>
          </div>
        </div>
        <div className="text-right text-xs text-stone-500 shrink-0">
          <p className="text-amber-400 text-sm font-bold mb-1">kiln.art/{artist.id}</p>
          <p>For press & curatorial inquiries</p>
        </div>
      </div>

      <div className="px-10 py-8 space-y-8">
        {/* Bio */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-3 print:text-stone-700">Artist Biography</h2>
          <p className="text-sm leading-relaxed text-stone-700 print:text-stone-800">{artist.bio}</p>
          {artist.artistStatement && (
            <blockquote className="mt-4 border-l-4 border-stone-800 pl-4 italic text-sm text-stone-600 leading-relaxed print:border-stone-900">
              "{artist.artistStatement}"
            </blockquote>
          )}
        </section>

        {/* Image grid */}
        {selectedImages.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-3 print:text-stone-700">Selected Works</h2>
            <div className="grid grid-cols-3 gap-2">
              {selectedImages.map((img, i) => (
                <div key={i} className="aspect-square overflow-hidden rounded bg-stone-100">
                  <img
                    src={img.url}
                    alt={img.caption ?? `Work ${i + 1}`}
                    className="h-full w-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&h=400&fit=crop&seed=${artist!.id}-pk-${i}`; }}
                  />
                </div>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-stone-400">High-resolution images available on request. All images © {artist.name} {currentYear}.</p>
          </section>
        )}

        {/* Collections */}
        {artist.collections.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-3 print:text-stone-700">Collections & Exhibitions</h2>
            <ul className="space-y-1">
              {artist.collections.map((c, i) => (
                <li key={i} className="text-sm text-stone-700 flex items-start gap-2 print:text-stone-800">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-stone-800" />
                  {c}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Collections */}
        {artist.collections.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-3 print:text-stone-700">Collections & Exhibitions</h2>
            <ul className="space-y-1">
              {artist.collections.map((c, i) => (
                <li key={i} className="text-sm text-stone-700 flex items-start gap-2 print:text-stone-800">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-stone-800" />
                  {c}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Contact */}
        <section className="border-t border-stone-200 pt-6 print:border-stone-300">
          <h2 className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-3 print:text-stone-700">Contact & Representation</h2>
          <div className="grid grid-cols-2 gap-4 text-sm text-stone-700 print:text-stone-800">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-stone-400 mb-1">For press inquiries</p>
              <p>press@{artist.id}.art</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-stone-400 mb-1">For gallery & curatorial</p>
              <p>gallery@{artist.id}.art</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-stone-400 mb-1">Artist website</p>
              <p>{artist.website ?? `kiln.art/${artist.id}`}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-stone-400 mb-1">Commission inquiries</p>
              <p>kiln.art/{artist.id}</p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="border-t border-stone-200 pt-4 flex items-center justify-between print:border-stone-300">
          <p className="text-[10px] text-stone-400">Generated via Kiln · kiln.art · {currentYear}</p>
          <p className="text-[10px] text-stone-400">© {artist.name} {currentYear}. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
