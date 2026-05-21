import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

// GET /api/users/:id/featured-status
router.get("/users/:id/featured-status", async (req, res): Promise<void> => {
  const rows = await db
    .select({ isFeatured: usersTable.isFeatured })
    .from(usersTable)
    .where(eq(usersTable.id, req.params.id))
    .limit(1);
  res.json({ isFeatured: rows[0]?.isFeatured ?? false });
});

// GET /api/users/:id/featured-badge.svg — downloadable badge for featured artists
router.get("/users/:id/featured-badge.svg", async (req, res): Promise<void> => {
  const rows = await db
    .select({ isFeatured: usersTable.isFeatured, firstName: usersTable.firstName })
    .from(usersTable)
    .where(eq(usersTable.id, req.params.id))
    .limit(1);

  if (!rows[0]?.isFeatured) {
    res.status(404).json({ error: "Not a featured artist" });
    return;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="64" viewBox="0 0 220 64">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1c1917"/>
      <stop offset="100%" stop-color="#292524"/>
    </linearGradient>
    <linearGradient id="flame" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
  </defs>
  <rect width="220" height="64" rx="12" fill="url(#bg)"/>
  <rect width="220" height="64" rx="12" fill="none" stroke="#f59e0b" stroke-opacity="0.35" stroke-width="1.5"/>
  <!-- Flame icon approximation -->
  <text x="18" y="40" font-size="22" font-family="system-ui">🔥</text>
  <!-- KILN wordmark -->
  <text x="50" y="27" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" letter-spacing="2" fill="#f59e0b">KILN</text>
  <!-- Featured label -->
  <text x="50" y="44" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="500" fill="#d6d3d1" letter-spacing="0.5">Featured Artist</text>
  <!-- kilnfire.replit.app -->
  <text x="50" y="57" font-family="system-ui, -apple-system, sans-serif" font-size="8.5" fill="#78716c">kilnfire.replit.app/kiln</text>
</svg>`;

  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Content-Disposition", `attachment; filename="kiln-featured-badge.svg"`);
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.send(svg);
});

export default router;
