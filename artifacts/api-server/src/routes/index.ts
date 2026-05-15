import { Router, type IRouter } from "express";
import healthRouter from "./health";
import instagramRouter from "./instagram";
import storageRouter from "./storage";
import craftAssistantRouter from "./craft-assistant";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/instagram", instagramRouter);
router.use(storageRouter);
router.use(craftAssistantRouter);

export default router;
