import { Router, type IRouter } from "express";
import healthRouter from "./health";
import instagramRouter from "./instagram";
import storageRouter from "./storage";
import craftAssistantRouter from "./craft-assistant";
import aiCaptionRouter from "./ai-caption";
import stripeRouter from "./stripe";
import glazeOracleRouter from "./glaze-oracle";
import grantWriterRouter from "./grant-writer";
import authRouter from "./auth";
import feedRouter from "./feed";
import postsRouter from "./posts";
import socialRouter from "./social";
import notificationsRouter from "./notifications";
import messagesRouter from "./messages";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use("/instagram", instagramRouter);
router.use(storageRouter);
router.use(craftAssistantRouter);
router.use(aiCaptionRouter);
router.use(stripeRouter);
router.use(glazeOracleRouter);
router.use(grantWriterRouter);
router.use(feedRouter);
router.use(postsRouter);
router.use(socialRouter);
router.use(notificationsRouter);
router.use(messagesRouter);

export default router;
