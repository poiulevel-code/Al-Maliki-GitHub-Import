import { Router } from "express";
import { adminOnly, isText } from "./store.js";
import { dbGetTable, dbIncrementMenuClick, dbLoadMenu, dbLoadMenuClicks } from "../lib/db.js";
import { allowPublicAction } from "./public-rate-limit.js";

const router = Router();

router.post("/menu-stats/click/:itemId", async (req, res) => {
  const { itemId } = req.params;
  const tableId = req.query["tableId"];
  if (!isText(itemId, 80) || !isText(tableId, 80)) {
    res.status(400).json({ error: "A valid menu item and table are required." });
    return;
  }
  try {
    const [table, menu] = await Promise.all([dbGetTable(tableId), dbLoadMenu()]);
    if (!table || !menu.some((item) => item.id === itemId && !item.hidden)) {
      res.status(400).json({ error: "This menu item or table is not available." });
      return;
    }
    if (!await allowPublicAction(req, res, "menu-click", table.id, 30)) return;
    await dbIncrementMenuClick(itemId);
    res.json({ ok: true });
  } catch {
    res.status(503).json({ error: "The menu click could not be recorded." });
  }
});

router.get("/menu-stats/popular", adminOnly, async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query["limit"]) || 10, 1), 50);
    const [menu, clickRows] = await Promise.all([dbLoadMenu(), dbLoadMenuClicks()]);
    const menuMap = new Map(menu.map((item) => [item.id, item]));
    const result = clickRows
      .filter(({ itemId }) => menuMap.has(itemId))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, limit)
      .map(({ itemId, clicks }) => ({
        id: itemId,
        clicks,
        name: menuMap.get(itemId)!.name,
        price: menuMap.get(itemId)!.price,
        image: menuMap.get(itemId)!.image,
      }));
    res.json(result);
  } catch {
    res.status(503).json({ error: "Menu statistics are temporarily unavailable." });
  }
});

export async function initMenuStats(): Promise<void> {
  await dbLoadMenuClicks();
}

export default router;
