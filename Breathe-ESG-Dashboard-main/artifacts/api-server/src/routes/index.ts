import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import companiesRouter from "./companies.js";
import recordsRouter from "./records.js";
import uploadsRouter from "./uploads.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(companiesRouter);
router.use(recordsRouter);
router.use(uploadsRouter);

export default router;
