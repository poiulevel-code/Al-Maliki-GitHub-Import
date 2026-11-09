import { Router } from "express";
import { adminOnly, isText, store, validImageUrl } from "./store.js";
import { dbGetSetting, dbSetSetting } from "../lib/db.js";

const router = Router();

router.get("/settings", adminOnly, async (_req, res) => {
  try {
    const [restaurantName, logo] = await Promise.all([
      dbGetSetting("restaurant_name"),
      dbGetSetting("logo"),
    ]);
    res.json({ restaurantName: restaurantName || "ARAB ALI HOTEL", logo: logo || null });
  } catch {
    res.status(503).json({ error: "Settings are temporarily unavailable." });
  }
});

router.patch("/settings", adminOnly, async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const fields = new Set(["restaurantName", "logo"]);
  if (Object.keys(body).some((key) => !fields.has(key)) ||
      (body["restaurantName"] !== undefined && !isText(body["restaurantName"], 120)) ||
      (body["logo"] !== undefined && body["logo"] !== null && !validImageUrl(body["logo"])) ||
      Object.keys(body).length === 0) {
    res.status(400).json({ error: "Invalid settings." });
    return;
  }
  try {
    if (body["restaurantName"] !== undefined) {
      await dbSetSetting("restaurant_name", body["restaurantName"] as string);
    }
    if (body["logo"] !== undefined) {
      await dbSetSetting("logo", (body["logo"] as string | null) ?? "");
    }
    if (body["restaurantName"] !== undefined) {
      store.settings.restaurantName = body["restaurantName"] as string;
    }
    if (body["logo"] !== undefined) {
      store.settings.logo = (body["logo"] as string | null) ?? null;
    }
    res.json({
      restaurantName: store.settings.restaurantName,
      logo: store.settings.logo,
    });
  } catch {
    res.status(503).json({ error: "Settings could not be saved." });
  }
});

export async function initSettings() {
  const [restaurantName, logo] = await Promise.all([
    dbGetSetting("restaurant_name"),
    dbGetSetting("logo"),
  ]);
  store.settings.restaurantName = restaurantName || "ARAB ALI HOTEL";
  store.settings.logo = logo || null;
}

export default router;
