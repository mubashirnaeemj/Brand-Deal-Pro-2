import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import pitchRouter from "./pitch/index";
import negotiatorRouter from "./negotiator/index";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(pitchRouter);
router.use(negotiatorRouter);

export default router;
