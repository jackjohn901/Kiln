import { Router, type IRouter } from "express";
import healthRouter from "./health";
import instagramRouter from "./instagram";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/instagram", instagramRouter);
router.use(storageRouter);

export default router;
