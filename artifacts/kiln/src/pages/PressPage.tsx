import { useEffect, useState } from "react";
import { ExternalLink, FileText, Mail, ArrowRight } from "lucide-react";

interface PressRelease {
  id: string;
  title: string;
  slug: string;
  summary: string;
  generatedAt: string;
  autoPostedTo: string | null;
}

export default function PressPage() {
  const [releases, setReleases] = useState<PressRelease[]>([]);

  useEffect(() => {
    fetch("/api/press/releases", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setReleases(d.releases ?? []))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 pb-28 md:pb-8">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-1">Press &amp; Media</h1>
        <p className="text-stone-400 mb-8">
          Official Kiln press resources for journalists, bloggers, and publications.
        </p>

        {/* Quick links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10">
          <a
            href="/kiln/press.html"
            target="_blank"
            rel="noopener"
            className="flex items-center gap-3 bg-stone-900 hover:bg-stone-800 rounded-xl p-4 transition-colors"
          >
            <FileText size={20} className="text-amber-400 shrink-0" />
            <div>
              <div className="font-semibold text-sm">Press Kit</div>
              <div className="text-xs text-stone-500">Descriptions, facts &amp; quotes</div>
            </div>
            <ExternalLink size={14} className="ml-auto text-stone-600" />
          </a>
          <a
            href="/kiln/press-outreach-kit.html"
            target="_blank"
            rel="noopener"
            className="flex items-center gap-3 bg-stone-900 hover:bg-stone-800 rounded-xl p-4 transition-colors"
          >
            <ArrowRight size={20} className="text-amber-400 shrink-0" />
            <div>
              <div className="font-semibold text-sm">Outreach Kit</div>
              <div className="text-xs text-stone-500">25+ free PR sites &amp; templates</div>
            </div>
            <ExternalLink size={14} className="ml-auto text-stone-600" />
          </a>
          <a
            href="mailto:press@kilnfire.com"
            className="flex items-center gap-3 bg-stone-900 hover:bg-stone-800 rounded-xl p-4 transition-colors"
          >
            <Mail size={20} className="text-amber-400 shrink-0" />
            <div>
              <div className="font-semibold text-sm">Press Contact</div>
              <div className="text-xs text-stone-500">press@kilnfire.com</div>
            </div>
          </a>
        </div>

        {/* Static launch release */}
        <h2 className="text-lg font-semibold mb-3">Press Releases</h2>
        <div className="space-y-3">
          <a
            href="/kiln/press/kiln-craft-platform-launch-2025.html"
            target="_blank"
            rel="noopener"
            className="block bg-stone-900 hover:bg-stone-800 rounded-xl p-4 transition-colors"
          >
            <div className="text-xs text-stone-500 mb-1">May 21, 2025 · Launch</div>
            <div className="font-semibold leading-snug mb-1">
              Kiln Launches Creator Platform Built Exclusively for Craft Artists
            </div>
            <div className="text-sm text-stone-400 line-clamp-2">
              New platform gives ceramicists, glassblowers, weavers, metalworkers, and woodworkers a complete creative business toolkit — combining process video, direct sales, workshops, patron subscriptions, and more in one place.
            </div>
          </a>

          {releases.map((r) => (
            <a
              key={r.id}
              href={`/kiln/press/index.html`}
              target="_blank"
              rel="noopener"
              className="block bg-stone-900 hover:bg-stone-800 rounded-xl p-4 transition-colors"
            >
              <div className="text-xs text-stone-500 mb-1">
                {new Date(r.generatedAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
                {r.autoPostedTo && (
                  <span className="ml-2 bg-green-900/50 text-green-400 px-2 py-0.5 rounded-full text-xs">
                    Auto-published
                  </span>
                )}
              </div>
              <div className="font-semibold leading-snug mb-1">{r.title}</div>
              {r.summary && (
                <div className="text-sm text-stone-400 line-clamp-2">{r.summary}</div>
              )}
            </a>
          ))}
        </div>

        {/* Coverage angles */}
        <div className="mt-10 bg-stone-900 rounded-xl p-5">
          <h2 className="font-semibold mb-3">Suggested Coverage Angles</h2>
          <ul className="space-y-2 text-sm text-stone-300">
            {[
              "The Etsy alternative for craft artists — what Etsy doesn't offer",
              "TikTok for craft — how process video drives discovery and sales for makers",
              "AI and handmade craft — the tools helping artists run their business",
              "The craft renaissance — why handmade work grows in value as AI proliferates",
              "Multi-revenue-stream businesses for artists — workshops + subscriptions + sales",
              "Commission custom art — how Kiln's milestone system works for bespoke pieces",
            ].map((angle) => (
              <li key={angle} className="flex items-start gap-2">
                <span className="text-amber-400 mt-0.5">→</span>
                <span>{angle}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 text-center text-sm text-stone-500">
          For interviews, artist introductions, screenshots, or additional information —{" "}
          <a href="mailto:press@kilnfire.com" className="text-amber-400 hover:underline">
            press@kilnfire.com
          </a>
        </div>
      </div>
    </div>
  );
}
