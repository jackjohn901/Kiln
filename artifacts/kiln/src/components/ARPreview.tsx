import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Camera, ZoomIn, ZoomOut, RotateCcw, Move, CameraOff, Info } from "lucide-react";

interface ARPreviewProps {
  imageUrl: string;
  title: string;
  widthInches?: number;
  heightInches?: number;
}

export default function ARPreview({ imageUrl, title, widthInches = 18, heightInches = 24 }: ARPreviewProps) {
  const [open, setOpen] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [artStart, setArtStart] = useState({ x: 0, y: 0 });
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const startCamera = useCallback(async () => {
    setCamError(null);
    setCameraReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraReady(true);
        };
      }
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        setCamError("Camera permission denied. Please allow camera access to use AR preview.");
      } else if (err.name === "NotFoundError") {
        setCamError("No camera found on this device.");
      } else {
        setCamError("Could not start camera: " + err.message);
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  useEffect(() => {
    if (open) {
      setScale(1);
      setPos({ x: 0, y: 0 });
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [open, startCamera, stopCamera]);

  function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    setDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setArtStart({ ...pos });
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!dragging) return;
    setPos({
      x: artStart.x + (e.clientX - dragStart.x),
      y: artStart.y + (e.clientY - dragStart.y),
    });
  }

  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 1) {
      setDragging(true);
      setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      setArtStart({ ...pos });
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!dragging || e.touches.length !== 1) return;
    setPos({
      x: artStart.x + (e.touches[0].clientX - dragStart.x),
      y: artStart.y + (e.touches[0].clientY - dragStart.y),
    });
  }

  const baseWidth = Math.min(widthInches * 12, 220);
  const baseHeight = Math.min(heightInches * 12, 280);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl border border-white/10 bg-stone-900/60 px-4 py-2.5 text-sm font-medium text-stone-300 hover:border-amber-500/30 hover:text-amber-300 transition-colors"
      >
        <Camera size={14} /> Preview in your space
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black flex flex-col"
          >
            {/* Toolbar */}
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/70 to-transparent">
              <div className="flex items-center gap-2">
                <Camera size={16} className="text-amber-400" />
                <span className="text-sm font-medium text-white">AR Preview</span>
                <span className="text-xs text-stone-400 hidden sm:block">— {title}</span>
              </div>
              <button onClick={() => setOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Camera feed */}
            <div
              ref={containerRef}
              className="flex-1 relative overflow-hidden select-none"
              onMouseMove={handleMouseMove}
              onMouseUp={() => setDragging(false)}
              onMouseLeave={() => setDragging(false)}
              onTouchMove={handleTouchMove}
              onTouchEnd={() => setDragging(false)}
            >
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover"
                playsInline
                muted
                autoPlay
              />

              {/* Camera not ready states */}
              {!cameraReady && !camError && (
                <div className="absolute inset-0 flex items-center justify-center bg-stone-950">
                  <div className="text-center space-y-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent mx-auto" />
                    <p className="text-sm text-stone-400">Starting camera…</p>
                  </div>
                </div>
              )}

              {camError && (
                <div className="absolute inset-0 flex items-center justify-center bg-stone-950 p-6">
                  <div className="text-center space-y-4 max-w-sm">
                    <CameraOff size={40} className="text-stone-600 mx-auto" />
                    <p className="text-sm text-stone-400">{camError}</p>
                    <button
                      onClick={startCamera}
                      className="rounded-full bg-amber-500 px-6 py-2 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              )}

              {/* Artwork overlay — draggable */}
              {cameraReady && (
                <div
                  className="absolute cursor-move"
                  style={{
                    left: "50%",
                    top: "50%",
                    transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px)) scale(${scale})`,
                    width: baseWidth,
                    height: baseHeight,
                    touchAction: "none",
                  }}
                  onMouseDown={handleMouseDown}
                  onTouchStart={handleTouchStart}
                >
                  <img
                    src={imageUrl}
                    alt={title}
                    className="w-full h-full object-cover rounded-sm shadow-2xl"
                    style={{ boxShadow: "0 0 0 2px rgba(255,255,255,0.3), 0 20px 60px rgba(0,0,0,0.8)" }}
                    draggable={false}
                  />
                  {/* Dimension label */}
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/60 px-2.5 py-1 text-[10px] text-white/80 backdrop-blur-sm">
                    {widthInches}" × {heightInches}"
                  </div>
                  {/* Corner handles */}
                  {["top-left", "top-right", "bottom-left", "bottom-right"].map((c) => (
                    <div key={c} className={`absolute h-3 w-3 border-2 border-white/60 ${
                      c === "top-left" ? "top-0 left-0 border-r-0 border-b-0" :
                      c === "top-right" ? "top-0 right-0 border-l-0 border-b-0" :
                      c === "bottom-left" ? "bottom-0 left-0 border-r-0 border-t-0" :
                      "bottom-0 right-0 border-l-0 border-t-0"
                    }`} />
                  ))}
                </div>
              )}
            </div>

            {/* Bottom controls */}
            {cameraReady && (
              <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-6 py-4 bg-gradient-to-t from-black/80 to-transparent">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setScale((s) => Math.max(0.3, s - 0.15))}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors border border-white/10"
                  >
                    <ZoomOut size={16} />
                  </button>
                  <button
                    onClick={() => setScale((s) => Math.min(3, s + 0.15))}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors border border-white/10"
                  >
                    <ZoomIn size={16} />
                  </button>
                  <button
                    onClick={() => { setScale(1); setPos({ x: 0, y: 0 }); }}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors border border-white/10"
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>
                <div className="flex items-center gap-2 text-xs text-white/50">
                  <Move size={11} /> Drag to reposition
                </div>
                <div className="text-xs text-white/40 hidden sm:block">
                  {Math.round(scale * 100)}% scale
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
