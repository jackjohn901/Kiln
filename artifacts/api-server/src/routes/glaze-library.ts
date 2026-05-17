import { Router } from "express";
import { db } from "@workspace/db";
import { glazeRecipesTable, glazeRecipeLikesTable, glazeRecipeSavesTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

// GET /glaze-library — user-created recipes + like/save status
router.get("/glaze-library", async (req, res): Promise<void> => {
  const userId = req.isAuthenticated() ? req.user.id : null;
  const recipes = await db.select().from(glazeRecipesTable).orderBy(desc(glazeRecipesTable.createdAt));
  if (!userId) { res.json({ recipes }); return; }
  const likes = await db.select({ recipeId: glazeRecipeLikesTable.recipeId }).from(glazeRecipeLikesTable)
    .where(eq(glazeRecipeLikesTable.userId, userId));
  const saves = await db.select({ recipeId: glazeRecipeSavesTable.recipeId }).from(glazeRecipeSavesTable)
    .where(eq(glazeRecipeSavesTable.userId, userId));
  const likedSet = new Set(likes.map(l => l.recipeId));
  const savedSet = new Set(saves.map(s => s.recipeId));
  res.json({ recipes: recipes.map(r => ({ ...r, liked: likedSet.has(r.id), saved: savedSet.has(r.id) })) });
});

// POST /glaze-library — create recipe
router.post("/glaze-library", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { name, description, cone, atmosphere, colorFamily, swatch, ingredients, colorants, notes, tags } = req.body;
  if (!name) { res.status(400).json({ error: "name required" }); return; }
  const user = req.user;
  const authorName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Artist";
  const [recipe] = await db.insert(glazeRecipesTable).values({
    id: crypto.randomUUID(), authorId: user.id, authorName, name,
    description: description ?? null, cone: cone ?? null,
    atmosphere: atmosphere ?? null, colorFamily: colorFamily ?? null,
    swatch: swatch ?? null, ingredients: ingredients ?? [],
    colorants: colorants ?? [], notes: notes ?? null,
    tags: tags ?? [],
  }).returning();
  res.status(201).json(recipe);
});

// POST /glaze-library/:id/like — toggle like
router.post("/glaze-library/:id/like", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { id } = req.params;
  const userId = req.user.id;
  const existing = await db.select().from(glazeRecipeLikesTable)
    .where(and(eq(glazeRecipeLikesTable.recipeId, id), eq(glazeRecipeLikesTable.userId, userId)));
  if (existing.length > 0) {
    await db.delete(glazeRecipeLikesTable)
      .where(and(eq(glazeRecipeLikesTable.recipeId, id), eq(glazeRecipeLikesTable.userId, userId)));
    await db.update(glazeRecipesTable).set({ likeCount: sql`${glazeRecipesTable.likeCount} - 1` }).where(eq(glazeRecipesTable.id, id));
    res.json({ liked: false });
  } else {
    await db.insert(glazeRecipeLikesTable).values({ recipeId: id, userId }).onConflictDoNothing();
    await db.update(glazeRecipesTable).set({ likeCount: sql`${glazeRecipesTable.likeCount} + 1` }).where(eq(glazeRecipesTable.id, id));
    res.json({ liked: true });
  }
});

// POST /glaze-library/:id/save — toggle save
router.post("/glaze-library/:id/save", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { id } = req.params;
  const userId = req.user.id;
  const existing = await db.select().from(glazeRecipeSavesTable)
    .where(and(eq(glazeRecipeSavesTable.recipeId, id), eq(glazeRecipeSavesTable.userId, userId)));
  if (existing.length > 0) {
    await db.delete(glazeRecipeSavesTable)
      .where(and(eq(glazeRecipeSavesTable.recipeId, id), eq(glazeRecipeSavesTable.userId, userId)));
    await db.update(glazeRecipesTable).set({ saveCount: sql`${glazeRecipesTable.saveCount} - 1` }).where(eq(glazeRecipesTable.id, id));
    res.json({ saved: false });
  } else {
    await db.insert(glazeRecipeSavesTable).values({ recipeId: id, userId }).onConflictDoNothing();
    await db.update(glazeRecipesTable).set({ saveCount: sql`${glazeRecipesTable.saveCount} + 1` }).where(eq(glazeRecipesTable.id, id));
    res.json({ saved: true });
  }
});

// DELETE /glaze-library/:id
router.delete("/glaze-library/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [recipe] = await db.select().from(glazeRecipesTable).where(eq(glazeRecipesTable.id, req.params.id));
  if (!recipe || recipe.authorId !== req.user.id) { res.status(403).json({ error: "Forbidden" }); return; }
  await db.delete(glazeRecipesTable).where(eq(glazeRecipesTable.id, req.params.id));
  res.json({ ok: true });
});

export default router;
