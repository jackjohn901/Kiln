import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { artworks, formatPrice, type Artwork } from "@/data/artworks";

function ArtworkCard({ artwork }: { artwork: Artwork }) {
  const [revealed, setRevealed] = useState(false);
  const [, navigate] = useLocation();

  const handleClick = () => {
    if (!revealed) {
      setRevealed(true);
    } else {
      navigate(`/checkout/${artwork.id}`);
    }
  };

  return (
    <motion.div
      layout
      className="group cursor-pointer flex flex-col items-center"
      onClick={handleClick}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="relative w-full flex items-end justify-center pb-6" style={{ minHeight: 320 }}>
        <motion.img
          src={artwork.image}
          alt={artwork.title}
          className="object-contain max-h-72 w-auto select-none artwork-shadow"
          style={{ maxWidth: "80%" }}
          whileHover={{ scale: 1.03 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          animate={revealed ? { scale: 1.02 } : { scale: 1 }}
        />

        <AnimatePresence>
          {revealed && (
            <motion.div
              className="absolute inset-x-0 bottom-0 flex flex-col items-center"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              <div className="bg-white/95 backdrop-blur-sm border border-black/6 rounded px-5 py-3 text-center shadow-sm">
                <p className="text-xs uppercase tracking-[0.15em] text-gray-400 mb-0.5">{artwork.series}</p>
                <p className="text-xl font-light text-gray-900 tracking-tight">{formatPrice(artwork.price)}</p>
                <p className="text-[11px] text-gray-400 mt-1.5 uppercase tracking-[0.1em]">Click to purchase</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="text-center mt-1 space-y-1">
        <h3 className="text-sm font-medium text-gray-900 tracking-[-0.01em]">{artwork.title}</h3>
        <p className="text-[11px] uppercase tracking-[0.12em] text-gray-400">{artwork.medium} &middot; {artwork.year}</p>
        <p className="text-[11px] text-gray-400">{artwork.dimensions}</p>
        {!revealed && (
          <p className="text-[11px] text-gray-300 mt-1">Tap to view price</p>
        )}
      </div>
    </motion.div>
  );
}

export default function Gallery() {
  return (
    <div className="min-h-screen bg-white">
      <header className="pt-16 pb-12 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-[10px] uppercase tracking-[0.3em] text-gray-300 mb-4">
            Habatat Galleries
          </p>
          <h1 className="text-3xl font-light text-gray-900 tracking-[-0.03em]">Alex Bernstein</h1>
          <p className="mt-2 text-sm text-gray-400 font-light tracking-wide">Available Works</p>
          <div className="mt-6 w-8 h-px bg-gray-200 mx-auto" />
        </motion.div>
      </header>

      <main className="max-w-5xl mx-auto px-6 pb-24">
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {artworks.map((artwork, i) => (
            <motion.div
              key={artwork.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
              <ArtworkCard artwork={artwork} />
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          className="mt-20 pt-12 border-t border-gray-100 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <p className="text-xs text-gray-300 tracking-[0.1em] uppercase">
            Habatat Galleries &middot; Royal Oak, Michigan
          </p>
          <p className="text-xs text-gray-300 mt-1">
            All works are original, signed, and come with certificate of authenticity.
          </p>
        </motion.div>
      </main>
    </div>
  );
}
