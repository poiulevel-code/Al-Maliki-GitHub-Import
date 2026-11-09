import { Router } from "express";
import { nanoid } from "nanoid";
import { adminOnly, authMiddleware, isText } from "./store.js";
import type { Order, OrderItem, OrderStatus, Review } from "./store.js";
import {
  dbDeleteReview,
  dbGetTable,
  dbLoadMenu,
  dbLoadOrders,
  dbSaveOrder,
  dbSaveReview,
} from "../lib/db.js";
import { allowPublicAction } from "./public-rate-limit.js";

const router = Router();
const terminalStatuses: OrderStatus[] = ["delivered", "cancelled"];

router.get("/orders", (req, res, next) => {
  const guard = req.query["includeArchived"] === "1" ? adminOnly : authMiddleware;
  void guard(req, res, next);
}, async (req, res) => {
  try {
    const allOrders = await dbLoadOrders();
    const includeArchived = req.query["includeArchived"] === "1";
    const includeRecentDelivered = req.query["includeRecentDelivered"] === "1";
    const recentDeliveredAfter = Date.now() - 60 * 60_000;
    res.json(includeArchived
      ? allOrders
      : allOrders.filter((order) =>
        !terminalStatuses.includes(order.status) ||
        (includeRecentDelivered && order.status === "delivered" &&
          typeof order.deliveredAt === "number" && order.deliveredAt >= recentDeliveredAfter)
      ));
  } catch {
    res.status(503).json({ error: "Orders are temporarily unavailable." });
  }
});

router.post("/orders", async (req, res) => {
  const body = req.body as {
    tableId?: unknown;
    items?: unknown;
    note?: unknown;
    rating?: unknown;
    mood?: unknown;
    isReviewOnly?: unknown;
  };
  if (!isText(body.tableId, 80)) {
    res.status(400).json({ error: "A valid table is required." });
    return;
  }

  try {
    const table = await dbGetTable(body.tableId);
    if (!table) {
      res.status(400).json({ error: "This table is not valid." });
      return;
    }
    const isReview = body.isReviewOnly === true;
    if (!await allowPublicAction(req, res, isReview ? "review" : "order", table.id, isReview ? 3 : 5)) {
      return;
    }

    if (isReview) {
      if ((body.note !== undefined &&
          (typeof body.note !== "string" || body.note.length > 200)) ||
          (body.rating !== undefined &&
          (!Number.isInteger(body.rating) || Number(body.rating) < 0 || Number(body.rating) > 5)) ||
          (body.mood !== undefined &&
          (typeof body.mood !== "string" || body.mood.length > 80))) {
        res.status(400).json({ error: "Review text must be 200 characters or fewer." });
        return;
      }
      const review: Review = {
        id: `rev-${nanoid(12)}`,
        tableId: table.id,
        tableNumber: table.number,
        mood: typeof body.mood === "string" ? body.mood : null,
        stars: typeof body.rating === "number" ? body.rating : 0,
        comment: typeof body.note === "string" ? body.note : "",
        createdAt: Date.now(),
      };
      await dbSaveReview(review);
      res.status(201).json(review);
      return;
    }

    if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 100) {
      res.status(400).json({ error: "The order must contain at least one item." });
      return;
    }
    const itemInput = body.items as Array<Record<string, unknown>>;
    if (itemInput.some((item) =>
      !item || !isText(item["menuItemId"], 80) ||
      !Number.isInteger(item["quantity"]) ||
      Number(item["quantity"]) < 1 || Number(item["quantity"]) > 100
    )) {
      res.status(400).json({ error: "The order contains invalid items." });
      return;
    }
    if (body.note !== undefined &&
        (typeof body.note !== "string" || body.note.length > 1000)) {
      res.status(400).json({ error: "The order note is invalid." });
      return;
    }

    const menu = await dbLoadMenu();
    const byId = new Map(menu.filter((item) => !item.hidden).map((item) => [item.id, item]));
    const validatedItems: OrderItem[] = [];
    for (const item of itemInput) {
      const menuItem = byId.get(item["menuItemId"] as string);
      if (!menuItem) {
        res.status(400).json({ error: "The order contains an unavailable menu item." });
        return;
      }
      validatedItems.push({
        menuItemId: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: Number(item["quantity"]),
      });
    }

    const order: Order = {
      id: `ord-${nanoid(12)}`,
      tableId: table.id,
      tableNumber: table.number,
      items: validatedItems,
      status: "pending",
      createdAt: Date.now(),
      ...(typeof body.note === "string" && body.note
        ? { note: body.note }
        : {}),
    };
    await dbSaveOrder(order);
    res.status(201).json(order);
  } catch {
    res.status(503).json({ error: "The request could not be saved. Please try again." });
  }
});

router.patch("/orders/:id/status", authMiddleware, async (req, res) => {
  const { status } = req.body as { status?: unknown };
  const valid: OrderStatus[] = ["pending", "preparing", "ready", "delivered", "cancelled"];
  if (typeof status !== "string" || !valid.includes(status as OrderStatus)) {
    res.status(400).json({ error: "Invalid order status." });
    return;
  }
  try {
    const order = (await dbLoadOrders()).find((row) => row.id === req.params.id);
    if (!order) {
      res.status(404).json({ error: "Order not found." });
      return;
    }
    const nextStatus = status as OrderStatus;
    const updatedOrder = {
      ...order,
      status: nextStatus,
      ...(nextStatus === "delivered"
        ? { deliveredAt: order.status === "delivered" ? order.deliveredAt ?? Date.now() : Date.now() }
        : { deliveredAt: undefined }),
    };
    await dbSaveOrder(updatedOrder);
    res.json(updatedOrder);
  } catch {
    res.status(503).json({ error: "Order status could not be saved." });
  }
});

router.delete("/orders/:id", authMiddleware, async (req, res) => {
  try {
    const order = (await dbLoadOrders()).find((row) => row.id === req.params.id);
    if (!order) {
      res.status(404).json({ error: "Order not found." });
      return;
    }
    await dbSaveOrder({ ...order, status: "cancelled" });
    res.status(204).end();
  } catch {
    res.status(503).json({ error: "Order could not be archived." });
  }
});

export async function initOrders(): Promise<void> {
  await dbLoadOrders();
}

export default router;
