import { useState, useMemo } from "react";
import { Link } from "wouter";
import { ChevronLeft, Calculator, DollarSign, Clock, Package, Plus, Trash2, TrendingUp, CheckCircle, Info } from "lucide-react";
import Nav from "@/components/Nav";

const TECHNIQUES = [
  { name: "Glass Blowing", multiplier: 1.8 },
  { name: "Flameworking", multiplier: 1.5 },
  { name: "Raku", multiplier: 1.3 },
  { name: "Ceramics / Pottery", multiplier: 1.0 },
  { name: "Porcelain", multiplier: 1.4 },
  { name: "Wood-Fired / Anagama", multiplier: 1.6 },
  { name: "Metal Forging", multiplier: 1.7 },
  { name: "Fiber Arts / Weaving", multiplier: 1.2 },
  { name: "Enamelwork", multiplier: 1.5 },
  { name: "Stone Carving", multiplier: 1.6 },
  { name: "Bronze Casting", multiplier: 2.0 },
  { name: "Studio Craft", multiplier: 1.0 },
];

const SIZES = [
  { label: "Small (< 6\")", factor: 0.8 },
  { label: "Medium (6–12\")", factor: 1.0 },
  { label: "Large (12–24\")", factor: 1.4 },
  { label: "Extra Large (> 24\")", factor: 2.0 },
  { label: "Monumental (> 4\')", factor: 3.5 },
];

const MARKET_DATA: Record<string, { low: number; high: number; label: string }> = {
  "Glass Blowing": { low: 380, high: 2800, label: "studio glass vessels" },
  "Flameworking": { low: 120, high: 900, label: "flameworked sculptures" },
  "Raku": { low: 200, high: 1200, label: "raku vessels" },
  "Ceramics / Pottery": { low: 80, high: 800, label: "functional ceramics" },
  "Porcelain": { low: 150, high: 1800, label: "porcelain works" },
  "Wood-Fired / Anagama": { low: 300, high: 3500, label: "wood-fired pieces" },
  "Metal Forging": { low: 400, high: 4000, label: "forged metalwork" },
  "Fiber Arts / Weaving": { low: 180, high: 2200, label: "handwoven textiles" },
  "Enamelwork": { low: 200, high: 1600, label: "enamel pieces" },
  "Stone Carving": { low: 600, high: 6000, label: "carved stone works" },
  "Bronze Casting": { low: 800, high: 8000, label: "bronze sculptures" },
  "Studio Craft": { low: 100, high: 1000, label: "studio works" },
};

interface MaterialLine {
  id: string;
  name: string;
  cost: number;
}

function Slider({ label, value, min, max, step, unit, onChange }: {
  label: string; value: number; min: number; max: number; step: number; unit: string; onChange: (n: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between mb-2">
        <label className="text-sm font-medium text-stone-300">{label}</label>
        <span className="text-sm font-bold text-amber-300">{unit}{value.toLocaleString()}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-amber-500"
      />
      <div className="flex justify-between mt-1 text-[10px] text-stone-600">
        <span>{unit}{min.toLocaleString()}</span>
        <span>{unit}{max.toLocaleString()}</span>
      </div>
    </div>
  );
}

export default function PriceCalculator() {
  const [technique, setTechnique] = useState("Glass Blowing");
  const [size, setSize] = useState(1);
  const [hours, setHours] = useState(12);
  const [hourlyRate, setHourlyRate] = useState(45);
  const [platformFee, setPlatformFee] = useState(12);
  const [materials, setMaterials] = useState<MaterialLine[]>([
    { id: "m1", name: "Raw materials", cost: 60 },
    { id: "m2", name: "Kiln / studio fees", cost: 40 },
  ]);
  const [newMatName, setNewMatName] = useState("");
  const [newMatCost, setNewMatCost] = useState(0);

  const tech = TECHNIQUES.find((t) => t.name === technique) ?? TECHNIQUES[0]!;
  const sizeObj = SIZES[size]!;
  const materialTotal = materials.reduce((s, m) => s + m.cost, 0);
  const laborCost = hours * hourlyRate;

  const { base, low, high, suggested } = useMemo(() => {
    const base = (laborCost + materialTotal) * tech.multiplier * sizeObj.factor;
    const feeMultiplier = 1 / (1 - platformFee / 100);
    const withFee = base * feeMultiplier;
    return {
      base: Math.round(base),
      low: Math.round(withFee * 0.85),
      high: Math.round(withFee * 1.25),
      suggested: Math.round(withFee),
    };
  }, [laborCost, materialTotal, tech.multiplier, sizeObj.factor, platformFee]);

  const market = MARKET_DATA[technique];

  function addMaterial() {
    if (!newMatName.trim()) return;
    setMaterials((m) => [...m, { id: Date.now().toString(), name: newMatName.trim(), cost: newMatCost }]);
    setNewMatName("");
    setNewMatCost(0);
  }

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-2xl px-4 pb-32 pt-6">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/creator-home">
            <button className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-stone-500 hover:text-stone-300 transition-colors">
              <ChevronLeft size={16} />
            </button>
          </Link>
          <div>
            <h1 className="font-serif text-2xl text-amber-100 flex items-center gap-2">
              <Calculator size={20} className="text-amber-500" />
              Price Calculator
            </h1>
            <p className="text-xs text-stone-500">Fair pricing based on your real costs</p>
          </div>
        </div>

        <div className="space-y-5">
          {/* Technique */}
          <div className="rounded-2xl border border-white/8 bg-stone-900/60 p-5">
            <h2 className="text-sm font-semibold text-stone-300 mb-3 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold">1</span>
              Technique
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {TECHNIQUES.map((t) => (
                <button
                  key={t.name}
                  onClick={() => setTechnique(t.name)}
                  className={`rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition-all ${
                    technique === t.name
                      ? "border-amber-500 bg-amber-500/10 text-amber-300"
                      : "border-white/8 bg-stone-800/40 text-stone-400 hover:border-white/15"
                  }`}
                >
                  {t.name}
                  <span className={`ml-1 text-[10px] ${technique === t.name ? "text-amber-500/70" : "text-stone-700"}`}>
                    ×{t.multiplier}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Size */}
          <div className="rounded-2xl border border-white/8 bg-stone-900/60 p-5">
            <h2 className="text-sm font-semibold text-stone-300 mb-3 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold">2</span>
              Size
            </h2>
            <div className="flex flex-wrap gap-2">
              {SIZES.map((s, i) => (
                <button
                  key={s.label}
                  onClick={() => setSize(i)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
                    size === i
                      ? "border-amber-500 bg-amber-500/10 text-amber-300"
                      : "border-white/8 text-stone-400 hover:border-white/15"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Labor */}
          <div className="rounded-2xl border border-white/8 bg-stone-900/60 p-5 space-y-5">
            <h2 className="text-sm font-semibold text-stone-300 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold">3</span>
              Your Labor
            </h2>
            <Slider label="Hours worked" value={hours} min={1} max={120} step={1} unit="" onChange={setHours} />
            <Slider label="Hourly rate" value={hourlyRate} min={15} max={200} step={5} unit="$" onChange={setHourlyRate} />
            <div className="flex justify-between text-sm border-t border-white/5 pt-3">
              <span className="text-stone-500 flex items-center gap-1"><Clock size={12} /> Labor total</span>
              <span className="font-bold text-amber-300">${laborCost.toLocaleString()}</span>
            </div>
          </div>

          {/* Materials */}
          <div className="rounded-2xl border border-white/8 bg-stone-900/60 p-5">
            <h2 className="text-sm font-semibold text-stone-300 mb-3 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold">4</span>
              Material & Studio Costs
            </h2>
            <div className="space-y-2 mb-3">
              {materials.map((m) => (
                <div key={m.id} className="flex items-center gap-2">
                  <span className="flex-1 text-sm text-stone-400">{m.name}</span>
                  <span className="text-sm font-medium text-amber-300">${m.cost}</span>
                  <button onClick={() => setMaterials((ms) => ms.filter((x) => x.id !== m.id))} className="text-stone-700 hover:text-red-400 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={newMatName}
                onChange={(e) => setNewMatName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addMaterial()}
                placeholder="Add item (e.g. glazes)"
                className="flex-1 rounded-xl bg-stone-800 border border-white/10 px-3 py-2 text-xs text-stone-300 placeholder-stone-600 outline-none focus:border-amber-500/50"
              />
              <input
                type="number"
                value={newMatCost || ""}
                onChange={(e) => setNewMatCost(Number(e.target.value))}
                placeholder="$"
                className="w-16 rounded-xl bg-stone-800 border border-white/10 px-3 py-2 text-xs text-stone-300 placeholder-stone-600 outline-none focus:border-amber-500/50"
              />
              <button onClick={addMaterial} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25 transition-colors">
                <Plus size={14} />
              </button>
            </div>
            <div className="flex justify-between text-sm border-t border-white/5 pt-3 mt-3">
              <span className="text-stone-500 flex items-center gap-1"><Package size={12} /> Materials total</span>
              <span className="font-bold text-amber-300">${materialTotal.toLocaleString()}</span>
            </div>
          </div>

          {/* Platform fee */}
          <div className="rounded-2xl border border-white/8 bg-stone-900/60 p-5">
            <h2 className="text-sm font-semibold text-stone-300 mb-3 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold">5</span>
              Platform & Transaction Fee
            </h2>
            <Slider label="Combined fee" value={platformFee} min={0} max={30} step={1} unit="" onChange={setPlatformFee} />
            <p className="text-[11px] text-stone-600 mt-2">Kiln takes 8%. Add card processing (2–3%) and any gallery split.</p>
          </div>

          {/* Result */}
          <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-amber-500/5 p-6">
            <div className="flex items-center gap-2 mb-5">
              <DollarSign size={16} className="text-amber-400" />
              <h2 className="text-sm font-bold text-amber-200 uppercase tracking-wider">Your Price Recommendation</h2>
            </div>

            <div className="text-center mb-6">
              <p className="text-xs text-stone-500 mb-1">Suggested list price</p>
              <p className="font-serif text-5xl font-bold text-amber-300">${suggested.toLocaleString()}</p>
              <p className="text-xs text-stone-500 mt-1">Range: ${low.toLocaleString()} – ${high.toLocaleString()}</p>
            </div>

            <div className="space-y-2 text-sm border-t border-amber-500/20 pt-4 mb-4">
              <div className="flex justify-between text-stone-400">
                <span>Labor ({hours}h × ${hourlyRate}/h)</span>
                <span>${laborCost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-stone-400">
                <span>Materials & studio</span>
                <span>${materialTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-stone-400">
                <span>Technique premium (×{tech.multiplier})</span>
                <span>+${(base - laborCost - materialTotal).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-stone-400">
                <span>Size factor (×{sizeObj.factor})</span>
                <span>×{sizeObj.factor}</span>
              </div>
              <div className="flex justify-between text-stone-400">
                <span>Platform fees ({platformFee}%)</span>
                <span>+${(suggested - base).toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-amber-200 border-t border-amber-500/20 pt-2">
                <span>Your take-home</span>
                <span>${Math.round(suggested * (1 - platformFee / 100)).toLocaleString()}</span>
              </div>
            </div>

            {market && (
              <div className="rounded-xl border border-white/10 bg-stone-900/40 p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <TrendingUp size={12} className="text-emerald-400" />
                  <p className="text-xs font-semibold text-stone-300">Market comparison on Kiln</p>
                </div>
                <p className="text-xs text-stone-500">
                  Comparable {market.label} sell for{" "}
                  <span className="text-emerald-400 font-semibold">${market.low.toLocaleString()}–${market.high.toLocaleString()}</span>{" "}
                  on this platform.
                  {suggested < market.low && (
                    <span className="text-amber-400 font-medium"> Your price is below market — consider raising it.</span>
                  )}
                  {suggested > market.high && (
                    <span className="text-sky-400 font-medium"> Your price is above average — ensure strong provenance documentation.</span>
                  )}
                  {suggested >= market.low && suggested <= market.high && (
                    <span className="text-emerald-400 font-medium"> Your price is right in the market range. ✓</span>
                  )}
                </p>
              </div>
            )}

            <div className="mt-3 flex items-start gap-2 rounded-xl border border-sky-500/20 bg-sky-500/5 p-3">
              <Info size={12} className="text-sky-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-stone-500">
                Never price below your material + labor cost. Underpricing harms not just you — it suppresses market rates for all craft artists.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                const text = `My ${technique} piece: ${hours}h labor + $${materialTotal} materials → Suggested: $${suggested.toLocaleString()} (Kiln Price Calculator)`;
                navigator.clipboard.writeText(text);
              }}
              className="flex-1 rounded-full border border-white/10 py-3 text-sm font-medium text-stone-400 hover:border-white/20 hover:text-stone-200 transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle size={14} /> Copy result
            </button>
            <Link href="/create" className="flex-1">
              <button className="w-full rounded-full bg-amber-500 py-3 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors flex items-center justify-center gap-2">
                <Plus size={14} /> List this piece
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
