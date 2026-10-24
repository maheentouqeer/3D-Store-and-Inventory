import { Router, type IRouter } from "express";
import healthRouter from "./health";
import storeRouter from "./store";
import inventoryRouter from "./inventory";
import ordersRouter from "./orders";

const router: IRouter = Router();

router.use(healthRouter);
router.use(storeRouter);
router.use(inventoryRouter);
router.use(ordersRouter);

export default router;
