import { Router } from "express";
import { db } from "@workspace/db";
import { profilesTable } from "@workspace/db";
import { isNotNull } from "drizzle-orm";

const router = Router();

// GET /studio-map — artist profiles with location data
router.get("/studio-map", async (req, res): Promise<void> => {
  try {
    const profiles = await db.select({
      userId: profilesTable.userId,
      displayName: profilesTable.displayName,
      avatarUrl: profilesTable.avatarUrl,
      location: profilesTable.location,
      medium: profilesTable.medium,
      bio: profilesTable.bio,
      handle: profilesTable.handle,
    }).from(profilesTable)
      .where(isNotNull(profilesTable.location))
      .limit(200);
    const withLocation = profiles.filter(p => p.location && p.location.trim().length > 0);
    res.json({ artists: withLocation });
  } catch (err) {
    req.log.error({ err }, "getStudioMap error");
    res.status(500).json({ error: "Failed" });
  }
});

export default router;
