import { motion, AnimatePresence } from "framer-motion";

export interface Annotation {
  time: number;
  text: string;
  color?: "amber" | "emerald" | "sky" | "rose" | "violet";
}

interface Props {
  annotations: Annotation[];
  progress: number;
}

const COLORS: Record<string, string> = {
  amber: "bg-amber-500/95 text-stone-950 border-amber-400/80",
  emerald: "bg-emerald-500/95 text-white border-emerald-400/80",
  sky: "bg-sky-500/95 text-white border-sky-400/80",
  rose: "bg-rose-500/95 text-white border-rose-400/80",
  violet: "bg-violet-500/95 text-white border-violet-400/80",
};

export const TECHNIQUE_ANNOTATIONS: Record<string, Annotation[]> = {
  "Glass Blowing": [
    { time: 6,  text: "Gathering molten glass at 2,100°F", color: "amber" },
    { time: 20, text: "Marvering to center the gather", color: "amber" },
    { time: 36, text: "Adding color overlay — cobalt blue batch", color: "sky" },
    { time: 52, text: "Shaping with jacks — constant rotation prevents sagging", color: "amber" },
    { time: 68, text: "Glory hole reheat — must stay above 1,800°F", color: "rose" },
    { time: 84, text: "Scoring punty → annealing kiln at 900°F", color: "emerald" },
  ],
  "Flameworking": [
    { time: 8,  text: "Heating borosilicate in oxygen/propane flame", color: "amber" },
    { time: 24, text: "Building form layer by layer — gravity + tool", color: "amber" },
    { time: 44, text: "Applying color stringers — precise placement", color: "sky" },
    { time: 60, text: "Reducing flame chemistry for metallic effect", color: "violet" },
    { time: 78, text: "Annealing in fiber blanket — slow cool prevents cracking", color: "emerald" },
  ],
  "Raku": [
    { time: 10, text: "Bisque-fired piece enters raku kiln at ambient temp", color: "amber" },
    { time: 28, text: "Kiln reaching 1,850°F — glaze beginning to melt", color: "rose" },
    { time: 46, text: "Pulling piece at peak with tongs — crackle glaze forming", color: "amber" },
    { time: 62, text: "Into reduction chamber — newspaper igniting", color: "rose" },
    { time: 78, text: "Carbon blackening unglazed clay — unique every time", color: "violet" },
    { time: 90, text: "Water quench — crackle pattern locked in", color: "sky" },
  ],
  "Ceramics": [
    { time: 10, text: "Centering on the wheel — 2,000 RPM, wet hands", color: "amber" },
    { time: 26, text: "Opening the clay — thumb pressure to the base", color: "amber" },
    { time: 42, text: "Pulling the walls — inside and outside hand together", color: "sky" },
    { time: 60, text: "Collaring the neck — compress inward slowly", color: "emerald" },
    { time: 76, text: "Wire tool release — set aside to stiffen before trimming", color: "amber" },
  ],
  "Porcelain": [
    { time: 8,  text: "Porcelain has very short working window — move quickly", color: "amber" },
    { time: 24, text: "Thin walls — porcelain translucent at 1/8\" or less", color: "sky" },
    { time: 44, text: "Carved decoration through leather-hard stage", color: "violet" },
    { time: 62, text: "Celadon glaze — iron oxide, 0.5% concentration", color: "emerald" },
    { time: 80, text: "Reduction firing brings out jade-green celadon color", color: "sky" },
  ],
  "Metal Forging": [
    { time: 8,  text: "Steel billet at 2,200°F — bright orange forging heat", color: "rose" },
    { time: 24, text: "First strike — hammer compresses the grain structure", color: "amber" },
    { time: 42, text: "Drawing out — working toward final form", color: "amber" },
    { time: 58, text: "Back to the forge — must reheat every 2–3 minutes", color: "rose" },
    { time: 74, text: "Quench in water — hardening the steel", color: "sky" },
    { time: 88, text: "Temper at 400°F — removes brittleness", color: "emerald" },
  ],
  "Wood-Fired": [
    { time: 10, text: "Anagama kiln — single-chamber, 2,400°F goal", color: "amber" },
    { time: 26, text: "Stoking every 15 minutes — maintaining draft", color: "rose" },
    { time: 42, text: "Ash fly — natural ash landing on pieces, forming glaze", color: "amber" },
    { time: 60, text: "Cone 13 witness cones dropping — peak temperature reached", color: "rose" },
    { time: 78, text: "Slow cool — kiln sealed, door bricked up for 48h", color: "sky" },
  ],
  "Fiber Arts": [
    { time: 8,  text: "Warp set at 24 ends per inch — 8 shaft pattern", color: "violet" },
    { time: 24, text: "Shuttling the weft — over/under the warp threads", color: "amber" },
    { time: 40, text: "Beating in — reed compresses each pick into the fell", color: "amber" },
    { time: 58, text: "Color transition — butterfly shuttle changing weft", color: "violet" },
    { time: 76, text: "Finishing: wet finish and block to full width", color: "sky" },
  ],
  "Enamel": [
    { time: 10, text: "Copper base — cleaned with acid to remove oxides", color: "amber" },
    { time: 28, text: "Applying powdered glass — sifted in thin layers", color: "sky" },
    { time: 46, text: "Into kiln at 1,500°F — enamel fuses in 2–3 minutes", color: "rose" },
    { time: 62, text: "Cloisonné wire placed to define color sections", color: "amber" },
    { time: 80, text: "Final layer — fire-scale pickled away, surface stoned flat", color: "emerald" },
  ],
};

export default function VideoAnnotations({ annotations, progress }: Props) {
  const sorted = [...annotations].sort((a, b) => a.time - b.time);
  const active = sorted.filter((a) => progress >= a.time && progress < a.time + 9).at(-1);

  return (
    <AnimatePresence mode="wait">
      {active && (
        <motion.div
          key={`${active.time}-${active.text}`}
          initial={{ opacity: 0, x: -14, scale: 0.94 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 10, scale: 0.94 }}
          transition={{ duration: 0.2 }}
          className={`absolute left-4 top-[26%] z-20 max-w-[72%] rounded-2xl border px-3.5 py-2.5 shadow-xl backdrop-blur-sm ${COLORS[active.color ?? "amber"]}`}
        >
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[9px] font-bold opacity-60 uppercase tracking-wider">Technique Note</span>
          </div>
          <p className="text-[11px] font-bold leading-snug">{active.text}</p>
          <div
            className={`absolute -bottom-[6px] left-5 h-3 w-3 rotate-45 border-b border-r ${COLORS[active.color ?? "amber"]}`}
            style={{ background: "inherit" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
