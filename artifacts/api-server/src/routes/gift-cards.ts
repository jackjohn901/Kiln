import { Router } from "express";
import { db, giftCardsTable } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 4 }, () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join(""),
  ).join("-");
}

router.post("/gift-cards", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { amount, designId, recipientName, recipientEmail, message } = req.body as {
    amount?: number; designId?: string;
    recipientName?: string; recipientEmail?: string; message?: string;
  };

  if (!amount || amount < 1 || amount > 10000) {
    res.status(400).json({ error: "Amount must be between $1 and $10,000" });
    return;
  }

  try {
    const code = generateCode();
    const [card] = await db.insert(giftCardsTable).values({
      id: crypto.randomUUID(),
      code,
      amount: Math.round(amount),
      designId: designId ?? "glasswork",
      purchasedByUserId: req.user.id,
      recipientName: recipientName ?? null,
      recipientEmail: recipientEmail ?? null,
      message: message ?? null,
    }).returning();

    res.status(201).json({ card });
  } catch (err) {
    req.log.error({ err }, "gift-cards.create error");
    res.status(500).json({ error: "Failed to create gift card" });
  }
});

router.post("/gift-cards/redeem", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { code } = req.body as { code?: string };
  if (!code) { res.status(400).json({ error: "Code is required" }); return; }

  try {
    const [card] = await db.select().from(giftCardsTable)
      .where(and(eq(giftCardsTable.code, code.toUpperCase().trim()), isNull(giftCardsTable.redeemedByUserId)));

    if (!card) {
      res.status(404).json({ error: "Invalid or already redeemed code" });
      return;
    }

    const [updated] = await db.update(giftCardsTable)
      .set({ redeemedByUserId: req.user.id, redeemedAt: new Date() })
      .where(and(eq(giftCardsTable.code, card.code), isNull(giftCardsTable.redeemedByUserId)))
      .returning();

    if (!updated) {
      res.status(409).json({ error: "Code was already redeemed" });
      return;
    }

    res.json({ card: updated, amount: updated.amount });
  } catch (err) {
    req.log.error({ err }, "gift-cards.redeem error");
    res.status(500).json({ error: "Failed to redeem gift card" });
  }
});

router.get("/gift-cards/mine", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  try {
    const purchased = await db.select().from(giftCardsTable)
      .where(eq(giftCardsTable.purchasedByUserId, req.user.id));

    const redeemed = await db.select().from(giftCardsTable)
      .where(eq(giftCardsTable.redeemedByUserId, req.user.id));

    res.json({
      purchased: purchased.map((c) => ({ ...c, createdAt: c.createdAt.toISOString(), redeemedAt: c.redeemedAt?.toISOString() ?? null })),
      redeemed: redeemed.map((c) => ({ ...c, createdAt: c.createdAt.toISOString(), redeemedAt: c.redeemedAt?.toISOString() ?? null })),
    });
  } catch (err) {
    req.log.error({ err }, "gift-cards.mine error");
    res.status(500).json({ error: "Failed to load gift cards" });
  }
});

export default router;
