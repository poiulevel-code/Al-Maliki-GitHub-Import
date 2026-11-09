import { Router, type Request, type Response } from "express";
import { nanoid } from "nanoid";
import { adminOnly, isLangMap, isText, store, validImageUrl } from "./store.js";
import type { MenuItem } from "./store.js";
import {
  dbDeleteMenuItem,
  dbGetSetting,
  dbLoadCategories,
  dbLoadMenu,
  dbSaveMenuItem,
  dbSeedMenu,
  dbSetSetting,
} from "../lib/db.js";

const router = Router();
const allowedFields = new Set(["name", "description", "price", "category", "image", "hidden"]);
const hasOnlyAllowedFields = (body: Record<string, unknown>) =>
  Object.keys(body).every((key) => allowedFields.has(key));

function validMenuFields(body: Record<string, unknown>): boolean {
  return hasOnlyAllowedFields(body) &&
    (body["name"] === undefined || isLangMap(body["name"])) &&
    (body["description"] === undefined || isLangMap(body["description"])) &&
    (body["price"] === undefined || (
      typeof body["price"] === "number" && Number.isFinite(body["price"]) &&
      body["price"] >= 0 && body["price"] <= 1_000_000
    )) &&
    (body["category"] === undefined || isText(body["category"], 80)) &&
    (body["image"] === undefined || validImageUrl(body["image"])) &&
    (body["hidden"] === undefined || typeof body["hidden"] === "boolean");
}

router.get("/menu", async (req, res) => {
  const showHidden = req.query["showHidden"] === "1";
  const send = async () => {
    try {
      const items = await dbLoadMenu();
      res.setHeader("Cache-Control", "no-store");
      res.json(showHidden ? items : items.filter((item) => !item.hidden));
    } catch {
      res.status(503).json({ error: "Menu is temporarily unavailable." });
    }
  };
  if (showHidden) {
    await adminOnly(req, res, send);
  } else {
    await send();
  }
});

router.post("/menu", adminOnly, async (req, res) => {
  const body = req.body as Record<string, unknown>;
  if (!validMenuFields(body) || !isLangMap(body["name"]) ||
      !isLangMap(body["description"]) || !isText(body["category"], 80) ||
      typeof body["price"] !== "number") {
    res.status(400).json({ error: "Invalid menu item." });
    return;
  }
  try {
    const [items, categories] = await Promise.all([
      dbLoadMenu(),
      dbLoadCategories(),
    ]);
    if (!categories.some((category) => category.id === body["category"])) {
      res.status(400).json({ error: "Choose an existing category." });
      return;
    }
    const item: MenuItem = {
      id: nanoid(8),
      name: body["name"],
      description: body["description"],
      price: body["price"],
      category: body["category"],
      image: typeof body["image"] === "string" ? body["image"] : "",
      hidden: body["hidden"] === true,
    };
    await dbSaveMenuItem(item, items.length);
    res.status(201).json(item);
  } catch {
    res.status(503).json({ error: "Menu item could not be saved." });
  }
});

async function updateMenuItem(id: string, req: Request, res: Response) {
  const body = req.body as Record<string, unknown>;
  if (!validMenuFields(body) || Object.keys(body).length === 0) {
    res.status(400).json({ error: "Invalid menu item." });
    return;
  }
  try {
    const items = await dbLoadMenu();
    const index = items.findIndex((item) => item.id === id);
    if (index < 0) {
      res.status(404).json({ error: "Menu item not found." });
      return;
    }
    const next: MenuItem = { ...items[index]!, ...body, id };
    if (body["category"] !== undefined) {
      const categories = await dbLoadCategories();
      if (!categories.some((category) => category.id === next.category)) {
        res.status(400).json({ error: "Choose an existing category." });
        return;
      }
    }
    await dbSaveMenuItem(next, index);
    res.json(next);
  } catch {
    res.status(503).json({ error: "Menu item could not be saved." });
  }
}

router.put("/menu/:id", adminOnly, async (req, res) => {
  await updateMenuItem(req.params.id, req, res);
});

router.patch("/menu/:id", adminOnly, async (req, res) => {
  await updateMenuItem(req.params.id, req, res);
});

router.delete("/menu/:id", adminOnly, async (req, res) => {
  try {
    const items = await dbLoadMenu();
    if (!items.some((item) => item.id === req.params.id)) {
      res.status(404).json({ error: "Menu item not found." });
      return;
    }
    await dbDeleteMenuItem(req.params.id);
    res.status(204).end();
  } catch {
    res.status(503).json({ error: "Menu item could not be deleted." });
  }
});

export async function initMenu(initialData: MenuItem[]) {
  const rows = await dbLoadMenu();
  const initialized = await dbGetSetting("menu_initialized");
  if (!initialized) {
    if (rows.length === 0) await dbSeedMenu(initialData);
    await dbSetSetting("menu_initialized", "true");
    store.menu = rows.length === 0 ? [...initialData] : rows;
    log(`Initialized menu with ${store.menu.length} items`);
    return;
  }
  store.menu = rows;
  log(`Loaded ${rows.length} menu items from Supabase`);
}

function log(message: string) {
  process.stdout.write(`[menu] ${message}\n`);
}

export default router;
