import { Router, type IRouter } from "express";
import healthRouter from "./health";
import instagramRouter from "./instagram";
import storageRouter from "./storage";
import craftAssistantRouter from "./craft-assistant";
import aiCaptionRouter from "./ai-caption";
import stripeRouter from "./stripe";
import glazeOracleRouter from "./glaze-oracle";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/instagram", instagramRouter);
router.use(storageRouter);
router.use(craftAssistantRouter);
router.use(aiCaptionRouter);
router.use(stripeRouter);
router.use(glazeOracleRouter);

export default router;
