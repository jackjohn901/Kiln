import { Router } from "express";
import { db } from "@workspace/db";
import { lineageMentorsTable, type LineageMentor } from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";
import { z } from "zod";
import crypto from "crypto";

const router = Router();

// A user can credit a generous but bounded number of professors/teachers.
const MAX_MENTORS = 50;

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().nullable();

// Image must be a relative storage path (e.g. "/api/storage/objects/...") or an
// https URL. Plain http:// is rejected so portraits never break on the https site.
const imageUrlSchema = z
  .string()
  .trim()
  .max(2000)
  .refine((v) => v === "" || v.startsWith("/") || v.startsWith("https://"), {
    message: "Image must be a relative path or an https URL",
  })
  .optional()
  .nullable();

const MentorBody = z.object({
  name: z.string().trim().min(1).max(255),
  role: optionalText(255),
  institution: optionalText(255),
  years: optionalText(100),
  note: optionalText(2000),
  imageUrl: imageUrlSchema,
});

function serialize(r: LineageMentor) {
  return {
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

// Public response shape: only the fields needed to render a profile, so the
// public endpoint never leaks owner ids or internal timestamps.
function serializePublic(r: LineageMentor) {
  return {
    id: r.id,
    name: r.name,
    role: r.role,
    institution: r.institution,
    years: r.years,
    note: r.note,
    imageUrl: r.imageUrl,
  };
}

// GET /lineage/mentors/:userId — public list of a user's credited professors.
router.get("/lineage/mentors/:userId", async (req, res): Promise<void> => {
  const userId = req.params.userId;
  if (!userId) {
    res.status(400).json({ error: "userId required" });
    return;
  }
  const rows = await db
    .select()
    .from(lineageMentorsTable)
    .where(eq(lineageMentorsTable.userId, userId))
    .orderBy(asc(lineageMentorsTable.createdAt));
  res.json({ mentors: rows.map(serializePublic) });
});

// GET /me/lineage/mentors — my own professors.
router.get("/me/lineage/mentors", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const rows = await db
    .select()
    .from(lineageMentorsTable)
    .where(eq(lineageMentorsTable.userId, req.user.id))
    .orderBy(asc(lineageMentorsTable.createdAt));
  res.json({ mentors: rows.map(serialize) });
});

// POST /me/lineage/mentors — add a professor.
router.post("/me/lineage/mentors", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = MentorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid input" });
    return;
  }

  const existingRows = await db
    .select({ id: lineageMentorsTable.id })
    .from(lineageMentorsTable)
    .where(eq(lineageMentorsTable.userId, req.user.id));
  if (existingRows.length >= MAX_MENTORS) {
    res.status(400).json({ error: `You can add up to ${MAX_MENTORS} professors.` });
    return;
  }

  const d = parsed.data;
  const [row] = await db
    .insert(lineageMentorsTable)
    .values({
      id: crypto.randomUUID(),
      userId: req.user.id,
      name: d.name,
      role: d.role || null,
      institution: d.institution || null,
      years: d.years || null,
      note: d.note || null,
      imageUrl: d.imageUrl || null,
    })
    .returning();
  res.status(201).json({ mentor: serialize(row) });
});

// PATCH /me/lineage/mentors/:id — edit a professor (owner only).
router.patch("/me/lineage/mentors/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const id = req.params.id;
  const parsed = MentorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid input" });
    return;
  }

  const [existing] = await db
    .select()
    .from(lineageMentorsTable)
    .where(eq(lineageMentorsTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (existing.userId !== req.user.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const d = parsed.data;
  const [row] = await db
    .update(lineageMentorsTable)
    .set({
      name: d.name,
      role: d.role || null,
      institution: d.institution || null,
      years: d.years || null,
      note: d.note || null,
      imageUrl: d.imageUrl || null,
      updatedAt: new Date(),
    })
    .where(and(eq(lineageMentorsTable.id, id), eq(lineageMentorsTable.userId, req.user.id)))
    .returning();
  res.json({ mentor: serialize(row) });
});

// DELETE /me/lineage/mentors/:id — remove a professor (owner only).
router.delete("/me/lineage/mentors/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const id = req.params.id;
  const [existing] = await db
    .select()
    .from(lineageMentorsTable)
    .where(eq(lineageMentorsTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (existing.userId !== req.user.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  await db
    .delete(lineageMentorsTable)
    .where(and(eq(lineageMentorsTable.id, id), eq(lineageMentorsTable.userId, req.user.id)));
  res.json({ ok: true });
});

export default router;
