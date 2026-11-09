import { Router } from "express";
import { nanoid } from "nanoid";
import { adminOnly, isLangMap, isText, store } from "./store.js";
import type { Category } from "./store.js";
import {
  dbDeleteCategory,
  dbGetSetting,
  dbLoadCategories,
  dbReorderCategories,
  dbSaveCategory,
  dbSeedCategories,
  dbSetSetting,
} from "../lib/db.js";

const router = Router();
const allowedFields = new Set(["name", "order"]);
const hasOnlyAllowedFields = (body: Record<string, unknown>) =>
  Object.keys(body).every((key) => allowedFields.has(key));

router.get("/categories", async (_req, res) => {
  try {
    const categories = await dbLoadCategories();
    res.setHeader("Cache-Control", "no-store");
    res.json(categories.sort((a, b) => a.order - b.order));
  } catch {
    res.status(503).json({ error: "Categories are temporarily unavailable." });
  }
});

router.post("/categories/reorder", adminOnly, async (req, res) => {
  const ids = (req.body as { ids?: unknown }).ids;
  if (!Array.isArray(ids) || ids.length > 200 ||
      ids.some((id) => !isText(id, 80)) || new Set(ids).size !== ids.length) {
    res.status(400).json({ error: "Invalid category order." });
    return;
  }
  try {
    const categories = await dbLoadCategories();
    if (categories.length !== ids.length ||
        categories.some((category) => !ids.includes(category.id))) {
      res.status(400).json({ error: "Category order does not match the current menu." });
      return;
    }
    await dbReorderCategories(ids as string[]);
    const updated = await dbLoadCategories();
    res.json(updated.sort((a, b) => a.order - b.order));
  } catch {
    res.status(503).json({ error: "Categories could not be reordered." });
  }
});

router.post("/categories", adminOnly, async (req, res) => {
  const body = req.body as Record<string, unknown>;
  if (!hasOnlyAllowedFields(body) || !isLangMap(body["name"]) ||
      (body["order"] !== undefined &&
      (!Number.isInteger(body["order"]) || Number(body["order"]) < 0))) {
    res.status(400).json({ error: "Invalid category." });
    return;
  }
  try {
    const categories = await dbLoadCategories();
    const category: Category = {
      id: nanoid(8),
      name: body["name"],
      order: body["order"] === undefined ? categories.length : Number(body["order"]),
    };
    await dbSaveCategory(category);
    res.status(201).json(category);
  } catch {
    res.status(503).json({ error: "Category could not be saved." });
  }
});

async function updateCategory(id: string, body: Record<string, unknown>, res: any) {
  if (!hasOnlyAllowedFields(body) || Object.keys(body).length === 0 ||
      (body["name"] !== undefined && !isLangMap(body["name"])) ||
      (body["order"] !== undefined &&
      (!Number.isInteger(body["order"]) || Number(body["order"]) < 0))) {
    res.status(400).json({ error: "Invalid category." });
    return;
  }
  try {
    const categories = await dbLoadCategories();
    const current = categories.find((category) => category.id === id);
    if (!current) {
      res.status(404).json({ error: "Category not found." });
      return;
    }
    const updated: Category = { ...current, ...body, id };
    await dbSaveCategory(updated);
    res.json(updated);
  } catch {
    res.status(503).json({ error: "Category could not be saved." });
  }
}

router.put("/categories/:id", adminOnly, async (req, res) => {
  await updateCategory(req.params.id, req.body as Record<string, unknown>, res);
});

router.patch("/categories/:id", adminOnly, async (req, res) => {
  await updateCategory(req.params.id, req.body as Record<string, unknown>, res);
});

router.delete("/categories/:id", adminOnly, async (req, res) => {
  try {
    const categories = await dbLoadCategories();
    if (!categories.some((category) => category.id === req.params.id)) {
      res.status(404).json({ error: "Category not found." });
      return;
    }
    await dbDeleteCategory(req.params.id);
    res.status(204).end();
  } catch {
    res.status(503).json({ error: "Category could not be deleted." });
  }
});

export async function initCategories(initialData: Category[]) {
  const rows = await dbLoadCategories();
  const initialized = await dbGetSetting("categories_initialized");
  if (!initialized) {
    if (rows.length === 0) await dbSeedCategories(initialData);
    await dbSetSetting("categories_initialized", "true");
    store.categories = rows.length === 0 ? [...initialData] : rows;
    log(`Initialized ${store.categories.length} categories`);
    return;
  }
  store.categories = rows;
  log(`Loaded ${rows.length} categories from Supabase`);
}

function log(message: string) {
  process.stdout.write(`[categories] ${message}\n`);
}

export default router;
