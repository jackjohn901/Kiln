import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, ChevronRight, Sparkles } from "lucide-react";

const PREFS_KEY = "kiln_prefs_v1";

const TECHNIQUES = [
  { id: "glass-blow", label: "Glass Blowing", emoji: "🔥", description: "Hot glass, gathers, and fire" },
  { id: "glass-cast", label: "Kiln Casting", emoji: "⚗️", description: "Lost-wax and fused casting" },
  { id: "ceramics", label: "Ceramics", emoji: "🏺", description: "Wheel, hand-build, and kilns" },
  { id: "raku", label: "Raku & Pit Fire", emoji: "💨", description: "Ancient firing traditions" },
  { id: "metal-forge", label: "Blacksmithing", emoji: "⚒️", description: "Forge, hammer, and anvil" },
  { id: "welding", label: "Welding", emoji: "⚡", description: "TIG, MIG, and oxy-acetylene" },
  { id: "jewelry", label: "Studio Jewelry", emoji: "💎", description: "Fabrication and stone setting" },
  { id: "enamel", label: "Enamel", emoji: "🎨", description: "Cloisonné, champlevé, kiln" },
  { id: "fiber", label: "Fiber Arts", emoji: "🧵", description: "Weaving, knitting, embroidery" },
  { id: "tapestry", label: "Tapestry", emoji: "🖼️", description: "Loom weaving and wall art" },
  { id: "wood", label: "Wood Carving", emoji: "🪵", description: "Sculpture and furniture" },
  { id: "stone", label: "Stone Carving", emoji: "🪨", description: "Marble, granite, and soapstone" },
  { id: "flamework", label: "Flameworking", emoji: "🕯️", description: "Borosilicate and soft glass" },
  { id: "neon", label: "Neon Glass", emoji: "💡", description: "Bent tubing and light" },
  { id: "printmaking", label: "Printmaking", emoji: "🖨️", description: "Etching, screen, woodblock" },
  { id: "basketry", label: "Basketry", emoji: "🧺", description: "Weaving with natural materials" },
];

const VIBES = [
  { id: "process", label: "Behind-the-scenes process", emoji: "🎬" },
  { id: "finished", label: "Finished work and galleries", emoji: "✨" },
  { id: "tutorials", label: "How-to and technique", emoji: "📖" },
  { id: "studio", label: "Studio life and routine", emoji: "🏠" },
  { id: "collectors", label: "Collecting and commissioning", emoji: "🖼️" },
  { id: "community", label: "Community and collaboration", emoji: "🤝" },
];

export const PREFS_SET_KEY = PREFS_KEY;

export default function OnboardingQuiz() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<"techniques" | "vibes">("techniques");
  const [selectedTechniques, setSelectedTechniques] = useState<string[]>([]);
  const [selectedVibes, setSelectedVibes] = useState<string[]>([]);

  useEffect(() => {
    if (localStorage.getItem(PREFS_KEY)) {
      navigate("/");
    }
  }, [navigate]);

  function toggleTechnique(id: string) {
    setSelectedTechniques((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  function toggleVibe(id: string) {
    setSelectedVibes((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function syncPrefsToApi(prefs: object) {
    fetch("/api/me/settings", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        return fetch("/api/me/settings", {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ settings: { ...(data.settings ?? {}), onboardingPrefs: prefs } }),
        });
      })
      .catch(() => {});
  }

  function handleNext() {
    if (step === "techniques") {
      setStep("vibes");
    } else {
      const prefs = { techniques: selectedTechniques, vibes: selectedVibes, setAt: new Date().toISOString() };
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
      syncPrefsToApi(prefs);
      navigate("/");
    }
  }

  function handleSkip() {
    const prefs = { techniques: [], vibes: [], setAt: new Date().toISOString() };
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    syncPrefsToApi(prefs);
    navigate("/");
  }

  const canContinueTechniques = selectedTechniques.length >= 3;
  const canContinueVibes = selectedVibes.length >= 1;

  return (
    <div className="min-h-screen bg-[#0e0c0a] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-8 pb-4">
        <div className="flex items-center gap-2">
          <Flame size={22} className="text-amber-400" />
          <span className="font-serif text-xl text-amber-100 tracking-tight">Kiln</span>
        </div>
        <button onClick={handleSkip} className="text-sm text-stone-600 hover:text-stone-400 transition-colors">
          Skip for now
        </button>
      </div>

      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 pt-2 pb-6">
        <div className={`h-1.5 w-8 rounded-full transition-colors ${step === "techniques" ? "bg-amber-400" : "bg-amber-400/40"}`} />
        <div className={`h-1.5 w-8 rounded-full transition-colors ${step === "vibes" ? "bg-amber-400" : "bg-stone-700"}`} />
      </div>

      <div className="flex-1 overflow-y-auto px-6">
        <AnimatePresence mode="wait">
          {step === "techniques" && (
            <motion.div key="techniques" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="mb-8 text-center">
                <h1 className="font-serif text-3xl text-amber-100 mb-3">
                  What draws you to craft?
                </h1>
                <p className="text-stone-400 text-sm max-w-sm mx-auto leading-relaxed">
                  Pick the techniques that excite you most. We'll personalize your For You feed accordingly.
                </p>
                <p className="text-stone-600 text-xs mt-2">Select 3 or more</p>
              </div>

              <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto pb-4">
                {TECHNIQUES.map((t) => {
                  const selected = selectedTechniques.includes(t.id);
                  return (
                    <motion.button
                      key={t.id}
                      onClick={() => toggleTechnique(t.id)}
                      whileTap={{ scale: 0.97 }}
                      className={`relative flex flex-col items-start gap-1.5 rounded-2xl border p-4 text-left transition-all ${
                        selected
                          ? "border-amber-500/60 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.1)]"
                          : "border-white/8 bg-stone-900/60 hover:border-white/20"
                      }`}
                    >
                      {selected && (
                        <div className="absolute right-3 top-3 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500">
                          <div className="h-1.5 w-1.5 rounded-full bg-stone-950" />
                        </div>
                      )}
                      <span className="text-2xl">{t.emoji}</span>
                      <span className={`text-sm font-semibold leading-tight ${selected ? "text-amber-200" : "text-stone-300"}`}>
                        {t.label}
                      </span>
                      <span className="text-[11px] text-stone-500 leading-snug">{t.description}</span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {step === "vibes" && (
            <motion.div key="vibes" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="mb-8 text-center">
                <div className="mb-3 flex items-center justify-center gap-2">
                  <Sparkles size={18} className="text-amber-400" />
                  <h1 className="font-serif text-3xl text-amber-100">
                    What are you here for?
                  </h1>
                </div>
                <p className="text-stone-400 text-sm max-w-sm mx-auto leading-relaxed">
                  Tell us what content you love — we'll surface more of it.
                </p>
                <p className="text-stone-600 text-xs mt-2">Pick at least one</p>
              </div>

              <div className="flex flex-col gap-3 max-w-md mx-auto pb-4">
                {VIBES.map((v) => {
                  const selected = selectedVibes.includes(v.id);
                  return (
                    <motion.button
                      key={v.id}
                      onClick={() => toggleVibe(v.id)}
                      whileTap={{ scale: 0.98 }}
                      className={`flex items-center gap-4 rounded-2xl border px-5 py-4 text-left transition-all ${
                        selected
                          ? "border-amber-500/60 bg-amber-500/10"
                          : "border-white/8 bg-stone-900/60 hover:border-white/20"
                      }`}
                    >
                      <span className="text-2xl">{v.emoji}</span>
                      <span className={`text-sm font-semibold ${selected ? "text-amber-200" : "text-stone-300"}`}>
                        {v.label}
                      </span>
                      {selected && (
                        <div className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500">
                          <div className="h-2 w-2 rounded-full bg-stone-950" />
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* CTA */}
      <div className="sticky bottom-0 bg-gradient-to-t from-[#0e0c0a] to-transparent px-6 pt-8 pb-8">
        {step === "techniques" && (
          <div className="mb-3 text-center">
            <span className={`text-sm transition-colors ${canContinueTechniques ? "text-amber-400" : "text-stone-600"}`}>
              {selectedTechniques.length} selected{selectedTechniques.length < 3 ? ` — need ${3 - selectedTechniques.length} more` : " — ready!"}
            </span>
          </div>
        )}
        <motion.button
          onClick={handleNext}
          disabled={step === "techniques" ? !canContinueTechniques : !canContinueVibes}
          whileTap={{ scale: 0.97 }}
          className={`flex w-full items-center justify-center gap-2 rounded-full py-4 text-base font-bold transition-all ${
            (step === "techniques" ? canContinueTechniques : canContinueVibes)
              ? "bg-amber-500 text-stone-950 hover:bg-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.3)]"
              : "bg-stone-800 text-stone-600 cursor-not-allowed"
          }`}
        >
          {step === "techniques" ? "Next" : "Start Exploring Kiln"}
          <ChevronRight size={18} />
        </motion.button>
      </div>
    </div>
  );
}
