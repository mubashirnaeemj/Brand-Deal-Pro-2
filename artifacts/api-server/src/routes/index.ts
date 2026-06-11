import { Router, type IRouter } from "express";
import healthRouter from "./health";
import pitchRouter from "./pitch/index";
import negotiatorRouter from "./negotiator/index";

const router: IRouter = Router();

router.use(healthRouter);
router.use(pitchRouter);
router.use(negotiatorRouter);

export default router;
