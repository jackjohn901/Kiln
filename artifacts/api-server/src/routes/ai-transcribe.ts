import { Router } from "express";
import multer from "multer";
import OpenAI, { toFile } from "openai";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

const client = new OpenAI({
  baseURL: process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"],
  apiKey: process.env["AI_INTEGRATIONS_OPENAI_API_KEY"],
});

router.post(
  "/ai/transcribe",
  authMiddleware,
  upload.single("file"),
  async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const { buffer, mimetype, originalname } = req.file;

    try {
      const fileObj = await toFile(buffer, originalname ?? "audio.mp4", { type: mimetype });
      const transcription = await client.audio.transcriptions.create({
        file: fileObj,
        model: "whisper-1",
        response_format: "text",
      });

      const transcript = typeof transcription === "string" ? transcription : (transcription as { text: string }).text ?? "";
      res.json({ transcript: transcript.trim() });
    } catch (err) {
      req.log?.error(err, "Transcription failed");
      res.status(500).json({ error: "Transcription failed" });
    }
  }
);

export default router;
