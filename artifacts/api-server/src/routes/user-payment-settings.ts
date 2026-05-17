import { Router } from "express";
import { db } from "@workspace/db";
import { userSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// GET /users/:userId/payment-settings — public endpoint, returns only payment fields
router.get("/users/:userId/payment-settings", async (req, res): Promise<void> => {
  try {
    const [row] = await db.select({ paymentSettings: userSettingsTable.paymentSettings })
      .from(userSettingsTable).where(eq(userSettingsTable.userId, req.params.userId));
    const payments = (row?.paymentSettings as Record<string, string> | null) ?? {};
    res.json({
      stripeLink: payments.stripeLink ?? "",
      venmo: payments.venmo ?? "",
      cashapp: payments.cashapp ?? "",
      paypalMe: payments.paypalMe ?? "",
      notes: payments.notes ?? "",
    });
  } catch (err) {
    req.log.error({ err }, "getUserPaymentSettings error");
    res.status(500).json({ error: "Failed" });
  }
});

export default router;
