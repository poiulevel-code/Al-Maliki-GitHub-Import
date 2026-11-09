import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import menuRouter, { initMenu } from "./menu.js";
import categoriesRouter, { initCategories } from "./categories.js";
import tablesRouter, { initTables } from "./tables.js";
import waiterCallsRouter, { initWaiterCalls } from "./waiter-calls.js";
import bundleRouter from "./bundle.js";
import settingsRouter, { initSettings } from "./settings.js";
import uploadRouter from "./upload.js";
import ordersRouter, { initOrders } from "./orders.js";
import menuStatsRouter, { initMenuStats } from "./menu-stats.js";
import reviewsRouter, { initReviews } from "./reviews.js";
import { store } from "./store.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(menuRouter);
router.use(categoriesRouter);
router.use(tablesRouter);
router.use(waiterCallsRouter);
router.use(bundleRouter);
router.use(settingsRouter);
router.use(uploadRouter);
router.use(ordersRouter);
router.use(menuStatsRouter);
router.use(reviewsRouter);

export {
  initTables,
  initSettings,
  initMenu,
  initCategories,
  initOrders,
  initWaiterCalls,
  initReviews,
  initMenuStats,
};
export default router;
