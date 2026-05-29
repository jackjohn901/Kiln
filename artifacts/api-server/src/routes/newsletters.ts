import { Router } from "express";
import { db } from "@workspace/db";
import { newslettersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

// GET /me/newsletters — list my sent newsletters
router.get("/me/newsletters", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const rows = await db.select().from(newslettersTable)
    .where(eq(newslettersTable.artistId, req.user.id))
    .orderBy(desc(newslettersTable.sentAt));
  res.json({ newsletters: rows.map(n => ({ ...n, sentAt: n.sentAt.toISOString(), createdAt: n.createdAt.toISOString() })) });
});

// POST /newsletters — record a sent newsletter
router.post("/newsletters", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { subject, body, audience } = req.body as { subject: string; body: string; audience: string };
  if (!subject?.trim() || !body?.trim()) { res.status(400).json({ error: "subject and body required" }); return; }
  // recipientCount is server-owned: there is no real delivery pipeline yet, so we store 0
  // rather than trusting a client-supplied figure that would be rendered as an authoritative metric.
  const [row] = await db.insert(newslettersTable).values({
    id: crypto.randomUUID(),
    artistId: req.user.id,
    subject: subject.trim(),
    body: body.trim(),
    audience: audience ?? "all",
    recipientCount: 0,
    status: "sent",
  }).returning();
  res.status(201).json({ ...row, sentAt: row.sentAt.toISOString(), createdAt: row.createdAt.toISOString() });
});

export default router;
