import { Router } from "express";
import { ReplitConnectors } from "@replit/connectors-sdk";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();

router.get("/elevenlabs/voices", authMiddleware, async (req, res) => {
  try {
    const connectors = new ReplitConnectors();
    const response = await connectors.proxy("elevenlabs", "/v1/voices", { method: "GET" });
    const data = await response.json() as { voices?: unknown[] };
    res.json(data);
  } catch (err) {
    req.log?.error(err, "ElevenLabs voices fetch failed");
    res.status(500).json({ error: "Failed to fetch voices" });
  }
});

router.post("/elevenlabs/tts", authMiddleware, async (req, res) => {
  const { text, voiceId, modelId } = req.body as {
    text?: string;
    voiceId?: string;
    modelId?: string;
  };

  if (!text || !voiceId) {
    res.status(400).json({ error: "text and voiceId are required" });
    return;
  }

  if (text.length > 2500) {
    res.status(400).json({ error: "Text must be 2500 characters or fewer" });
    return;
  }

  try {
    const connectors = new ReplitConnectors();
    const response = await connectors.proxy(
      "elevenlabs",
      `/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "audio/mpeg" },
        body: JSON.stringify({
          text,
          model_id: modelId ?? "eleven_multilingual_v2",
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      req.log?.error({ status: response.status, body: errText }, "ElevenLabs TTS error");
      res.status(502).json({ error: "Voice generation failed" });
      return;
    }

    const audioBuffer = await response.arrayBuffer();
    res.set("Content-Type", "audio/mpeg");
    res.set("Content-Length", String(audioBuffer.byteLength));
    res.set("Cache-Control", "no-store");
    res.send(Buffer.from(audioBuffer));
  } catch (err) {
    req.log?.error(err, "ElevenLabs TTS failed");
    res.status(500).json({ error: "Voice generation failed" });
  }
});

export default router;
