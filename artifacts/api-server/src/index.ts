import app from "./app";
import { logger } from "./lib/logger";
import { hasSupabase } from "./lib/supabase.js";
import {
  initTables,
  initSettings,
  initReviews,
  initMenu,
  initCategories,
  initOrders,
  initWaiterCalls,
  initMenuStats,
} from "./routes/index.js";
import { INITIAL_MENU, INITIAL_CATEGORIES } from "./routes/data/initial-data.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, async (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  if (!hasSupabase) {
    logger.info("Supabase connector is not enabled; using local in-memory data.");
  }

  try {
    await initMenu(INITIAL_MENU);
    await initCategories(INITIAL_CATEGORIES);
    await initTables();
    await initSettings();
    await initOrders();
    await initWaiterCalls();
    await initReviews();
    await initMenuStats();
    logger.info("Initial data setup complete");
  } catch (e) {
    logger.warn({ err: e }, "Initial data setup failed (may already exist)");
  }
});
