import { useState, useCallback } from "react";

export type BgColor = "white" | "charcoal";

export interface BgRemoveResult {
  url: string;
  file: File;
}

async function compositeOnBackground(transparentBlob: Blob, bgColor: BgColor): Promise<BgRemoveResult> {
  const img = new Image();
  const srcUrl = URL.createObjectURL(transparentBlob);
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = srcUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = bgColor === "white" ? "#ffffff" : "#1c1a18";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.drawImage(img, 0, 0);

  const shadowH = Math.round(canvas.height * 0.04);
  const shadowY = canvas.height - shadowH;
  const shadowW = Math.round(canvas.width * 0.65);
  const shadowX = Math.round((canvas.width - shadowW) / 2);

  const grad = ctx.createRadialGradient(
    canvas.width / 2, shadowY + shadowH / 2, 0,
    canvas.width / 2, shadowY + shadowH / 2, shadowW / 2
  );
  const shadowAlpha = bgColor === "white" ? 0.18 : 0.42;
  grad.addColorStop(0, `rgba(0,0,0,${shadowAlpha})`);
  grad.addColorStop(1, "rgba(0,0,0,0)");

  ctx.save();
  ctx.filter = "blur(8px)";
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(canvas.width / 2, shadowY + shadowH / 2, shadowW / 2, shadowH / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  URL.revokeObjectURL(srcUrl);

  const resultBlob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Canvas toBlob failed"))), "image/png", 0.95)
  );

  const file = new File([resultBlob], "image.png", { type: "image/png" });
  const url = URL.createObjectURL(resultBlob);
  return { url, file };
}

export function useBgRemove() {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const removeBackground = useCallback(async (
    sourceFile: File,
    bgColor: BgColor
  ): Promise<BgRemoveResult> => {
    setProcessing(true);
    setError(null);
    try {
      const { removeBackground: removeBg } = await import("@imgly/background-removal");
      const transparentBlob = await removeBg(sourceFile, {
        output: { format: "image/png", quality: 0.95 },
      });
      return await compositeOnBackground(transparentBlob, bgColor);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Background removal failed";
      setError(msg);
      throw e;
    } finally {
      setProcessing(false);
    }
  }, []);

  return { removeBackground, processing, error };
}
