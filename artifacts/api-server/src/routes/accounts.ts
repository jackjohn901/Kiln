import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable, profilesTable } from "@workspace/db";
import { eq, or, sql } from "drizzle-orm";
import {
  getSessionId,
  getSession,
  updateSession,
  type AuthUser,
  type SessionData,
} from "../lib/auth";

const router: IRouter = Router();

const MAX_ACCOUNTS_PER_OWNER = 10;

/**
 * Resolve the authenticated session and the stable owner (root) identity id.
 * The owner id is derived from the session only — never from client input.
 * Legacy sessions without `ownerId` are treated as single-account owners.
 */
async function resolveOwner(
  req: Request,
): Promise<{ sid: string; session: SessionData; ownerId: string } | null> {
  if (!req.isAuthenticated()) return null;
  const sid = getSessionId(req);
  if (!sid) return null;
  const session = await getSession(sid);
  if (!session?.user?.id) return null;
  const ownerId = session.ownerId ?? session.user.id;
  return { sid, session, ownerId };
}

function toAuthUser(row: typeof usersTable.$inferSelect): AuthUser {
  return {
    id: row.id,
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    profileImageUrl: row.profileImageUrl,
  };
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 20) || "artist"
  );
}

type DbExecutor = Pick<typeof db, "select">;

async function generateUniqueHandle(
  exec: DbExecutor,
  displayName: string,
): Promise<string> {
  const base = slugify(displayName);
  for (let i = 0; i < 6; i++) {
    const cand = `${base}${Math.random().toString(36).slice(2, 6)}`;
    const [exists] = await exec
      .select({ h: profilesTable.handle })
      .from(profilesTable)
      .where(eq(profilesTable.handle, cand));
    if (!exists) return cand;
  }
  return `${base}${Date.now().toString(36)}`;
}

// GET /me/accounts — list all accounts the owner controls.
router.get("/me/accounts", async (req: Request, res: Response): Promise<void> => {
  const ctx = await resolveOwner(req);
  if (!ctx) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { session, ownerId } = ctx;
  try {
    const rows = await db
      .select({
        id: usersTable.id,
        ownerId: usersTable.ownerId,
        displayName: profilesTable.displayName,
        handle: profilesTable.handle,
        avatarUrl: profilesTable.avatarUrl,
      })
      .from(usersTable)
      .leftJoin(profilesTable, eq(profilesTable.userId, usersTable.id))
      .where(or(eq(usersTable.id, ownerId), eq(usersTable.ownerId, ownerId)));

    const accounts = rows
      .map((r) => ({
        id: r.id,
        displayName: r.displayName ?? null,
        handle: r.handle ?? null,
        avatarUrl: r.avatarUrl ?? null,
        isOwner: r.id === ownerId,
        isActive: r.id === session.user.id,
      }))
      .sort((a, b) => (a.isOwner === b.isOwner ? 0 : a.isOwner ? -1 : 1));

    res.json({ accounts, maxAccounts: MAX_ACCOUNTS_PER_OWNER });
  } catch (err) {
    req.log.error({ err }, "listAccounts error");
    res.status(500).json({ error: "Failed to list accounts" });
  }
});

// POST /me/accounts — create a new account owned by the current owner, then
// switch the session to it. Enforces the per-owner cap.
router.post("/me/accounts", async (req: Request, res: Response): Promise<void> => {
  const ctx = await resolveOwner(req);
  if (!ctx) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { sid, session, ownerId } = ctx;

  const rawName =
    typeof req.body?.displayName === "string" ? req.body.displayName.trim() : "";
  if (!rawName) {
    res.status(400).json({ error: "A display name is required." });
    return;
  }
  const displayName = rawName.slice(0, 80);

  try {
    // Create inside a transaction guarded by a per-owner advisory lock so the
    // count-then-insert cap check cannot be bypassed by concurrent requests.
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${ownerId}))`);

      const [{ count }] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(usersTable)
        .where(or(eq(usersTable.id, ownerId), eq(usersTable.ownerId, ownerId)));

      if (count >= MAX_ACCOUNTS_PER_OWNER) {
        return { capped: true as const };
      }

      // Owner's email is carried as the profile contactEmail so notifications
      // still reach the owner. It is read from the owner ROOT row (not the active
      // session.user, whose email is null when the active account is a sub-account).
      // The new auth `users.email` is left null to avoid the unique email
      // constraint (additional accounts are not separate Replit logins).
      const [ownerRow] = await tx
        .select({ email: usersTable.email })
        .from(usersTable)
        .where(eq(usersTable.id, ownerId));
      const ownerEmail = ownerRow?.email ?? null;

      const [newUser] = await tx
        .insert(usersTable)
        .values({ ownerId, email: null, firstName: displayName })
        .returning();

      const handle = await generateUniqueHandle(tx, displayName);
      await tx.insert(profilesTable).values({
        userId: newUser.id,
        handle,
        displayName,
        contactEmail: ownerEmail,
        accountType: "artist",
      });

      return { capped: false as const, newUser, handle };
    });

    if (result.capped) {
      res.status(429).json({
        error: `You can have at most ${MAX_ACCOUNTS_PER_OWNER} accounts.`,
      });
      return;
    }

    // Switch the active session to the freshly created account.
    const updated: SessionData = {
      ...session,
      user: toAuthUser(result.newUser),
      ownerId,
    };
    await updateSession(sid, updated);

    res.status(201).json({
      account: {
        id: result.newUser.id,
        displayName,
        handle: result.handle,
        avatarUrl: null,
        isOwner: false,
        isActive: true,
      },
    });
  } catch (err) {
    req.log.error({ err }, "createAccount error");
    res.status(500).json({ error: "Failed to create account" });
  }
});

// POST /me/accounts/:id/switch — switch the active account. Only accounts owned
// by the current owner (or the owner root itself) are allowed.
router.post(
  "/me/accounts/:id/switch",
  async (req: Request, res: Response): Promise<void> => {
    const ctx = await resolveOwner(req);
    if (!ctx) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const { sid, session, ownerId } = ctx;
    const targetId = String(req.params.id);

    try {
      const [target] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, targetId));

      const owned =
        !!target && (target.id === ownerId || target.ownerId === ownerId);
      if (!owned) {
        res.status(403).json({ error: "You do not have access to that account." });
        return;
      }

      const updated: SessionData = {
        ...session,
        user: toAuthUser(target),
        ownerId,
      };
      await updateSession(sid, updated);

      res.json({ ok: true, activeAccountId: target.id });
    } catch (err) {
      req.log.error({ err }, "switchAccount error");
      res.status(500).json({ error: "Failed to switch account" });
    }
  },
);

export default router;
