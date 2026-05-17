import { Router } from "express";
import { db } from "@workspace/db";
import { reportsTable } from "@workspace/db";
import crypto from "crypto";

const router = Router();

router.post("/reports", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { targetType, targetId, reason, otherText } = req.body as {
    targetType?: string; targetId?: string; reason?: string; otherText?: string;
  };
  if (!targetType || !targetId || !reason) {
    res.status(400).json({ error: "targetType, targetId, reason required" }); return;
  }
  try {
    await db.insert(reportsTable).values({
      id: crypto.randomUUID(),
      reporterId: req.user.id,
      targetType,
      targetId,
      reason,
      otherText: otherText?.trim() || null,
    });
    res.status(201).json({ success: true });
  } catch (err) {
    req.log.error({ err }, "createReport error");
    res.status(500).json({ error: "Failed to submit report" });
  }
});

export default router;
