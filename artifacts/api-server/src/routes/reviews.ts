import { Router } from "express";
import { authMiddleware } from "./store.js";
import { dbDeleteReview, dbLoadReviews } from "../lib/db.js";

const router = Router();

router.get("/reviews", authMiddleware, async (_req, res) => {
  try {
    const reviews = await dbLoadReviews();
    res.json(reviews.sort((a, b) => b.createdAt - a.createdAt));
  } catch {
    res.status(503).json({ error: "Reviews are temporarily unavailable." });
  }
});

router.delete("/reviews/:id", authMiddleware, async (req, res) => {
  try {
    const reviews = await dbLoadReviews();
    if (!reviews.some((review) => review.id === req.params.id)) {
      res.status(404).json({ error: "Review not found." });
      return;
    }
    await dbDeleteReview(req.params.id);
    res.status(204).end();
  } catch {
    res.status(503).json({ error: "Review could not be deleted." });
  }
});

export async function initReviews(): Promise<void> {
  await dbLoadReviews();
}

export default router;
