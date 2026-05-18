import { Router } from "express";
import { db } from "@workspace/db";
import { mentorshipApplicationsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

// POST /mentorship/apply — apply to a mentor
router.post("/mentorship/apply", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { mentorId, message } = req.body as { mentorId: string; message: string };
  if (!mentorId || !message?.trim()) { res.status(400).json({ error: "mentorId and message required" }); return; }
  const user = req.user;
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Artist";
  // prevent duplicate pending application
  const [existing] = await db.select().from(mentorshipApplicationsTable)
    .where(and(eq(mentorshipApplicationsTable.applicantId, user.id), eq(mentorshipApplicationsTable.mentorId, mentorId), eq(mentorshipApplicationsTable.status, "pending")));
  if (existing) { res.json({ application: { ...existing, createdAt: existing.createdAt.toISOString() }, alreadyApplied: true }); return; }
  const [row] = await db.insert(mentorshipApplicationsTable).values({
    id: crypto.randomUUID(),
    applicantId: user.id,
    applicantName: name,
    applicantAvatarUrl: user.profileImageUrl ?? null,
    mentorId,
    message: message.trim(),
    status: "pending",
  }).returning();
  res.status(201).json({ application: { ...row, createdAt: row.createdAt.toISOString() } });
});

// GET /me/mentorship/applications — list my outgoing applications
router.get("/me/mentorship/applications", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const rows = await db.select().from(mentorshipApplicationsTable)
    .where(eq(mentorshipApplicationsTable.applicantId, req.user.id))
    .orderBy(desc(mentorshipApplicationsTable.createdAt));
  res.json({ applications: rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })) });
});

export default router;
