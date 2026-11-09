import { Router } from "express";
import { dbGetSetting, dbLoadCategories, dbLoadMenu } from "../lib/db.js";

const router = Router();

router.get("/bundle", async (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    const [menu, categories, restaurantName, logo] = await Promise.all([
      dbLoadMenu(),
      dbLoadCategories(),
      dbGetSetting("restaurant_name"),
      dbGetSetting("logo"),
    ]);
    res.json({
      menu: menu.filter((item) => !item.hidden),
      categories: categories.sort((a, b) => a.order - b.order),
      settings: {
        restaurantName: restaurantName || "ARAB ALI HOTEL",
        logo: logo || null,
      },
    });
  } catch {
    res.status(503).json({ error: "Menu is temporarily unavailable." });
  }
});

export default router;
