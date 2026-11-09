import { createHmac } from "node:crypto";
import type { Request, Response } from "express";
import { dbConsumeRateLimit } from "../lib/db.js";

export async function allowPublicAction(
  req: Request,
  res: Response,
  action: string,
  tableId: string,
  limit: number,
): Promise<boolean> {
  const secret = process.env["SESSION_SECRET"] || process.env["CLERK_SECRET_KEY"];
  if (!secret) throw new Error("A server secret is required for rate limiting.");

  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const hashKey = (value: string) =>
    createHmac("sha256", secret).update(value).digest("hex");
  const [ipAllowed, tableAllowed] = await Promise.all([
    dbConsumeRateLimit(hashKey(`${action}:ip:${ip}`), limit),
    dbConsumeRateLimit(hashKey(`${action}:table:${tableId}`), limit),
  ]);

  if (ipAllowed && tableAllowed) return true;

  res.setHeader("Retry-After", "60");
  res.status(429).json({ error: "Too many requests. Please try again shortly." });
  return false;
}
