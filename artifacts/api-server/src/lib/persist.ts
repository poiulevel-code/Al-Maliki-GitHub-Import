import fs from "fs";
import path from "path";
import type { Review } from "../routes/store.js";

const DATA_DIR = path.join(process.cwd(), "data");
const REVIEWS_FILE = path.join(DATA_DIR, "reviews.json");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function loadReviews(): Review[] {
  try {
    ensureDir();
    if (!fs.existsSync(REVIEWS_FILE)) return [];
    const raw = fs.readFileSync(REVIEWS_FILE, "utf-8");
    return JSON.parse(raw) as Review[];
  } catch {
    return [];
  }
}

export function saveReviews(reviews: Review[]): void {
  try {
    ensureDir();
    fs.writeFileSync(REVIEWS_FILE, JSON.stringify(reviews, null, 2), "utf-8");
  } catch (e) {
    process.stdout.write(`[persist] Failed to save reviews: ${e}\n`);
  }
}
