import { Router } from "express";
import { isText, authMiddleware } from "./store.js";
import { dbDeleteWaiterCall, dbGetTable, dbIncrementWaiterCall, dbLoadWaiterCalls } from "../lib/db.js";
import { allowPublicAction } from "./public-rate-limit.js";

const router = Router();

router.get("/waiter-calls", authMiddleware, async (_req, res) => {
  try {
    const calls = await dbLoadWaiterCalls();
    res.json(calls.sort((a, b) => a.lastCalledAt - b.lastCalledAt));
  } catch {
    res.status(503).json({ error: "Waiter calls are temporarily unavailable." });
  }
});

router.post("/waiter-call", async (req, res) => {
  const { tableId } = req.body as { tableId?: unknown };
  if (!isText(tableId, 80)) {
    res.status(400).json({ error: "A valid table is required." });
    return;
  }
  try {
    const table = await dbGetTable(tableId);
    if (!table) {
      res.status(400).json({ error: "This table is not valid." });
      return;
    }
    if (!await allowPublicAction(req, res, "waiter-call", table.id, 3)) return;
    await dbIncrementWaiterCall(table.id);
    res.json({ ok: true });
  } catch {
    res.status(503).json({ error: "The waiter could not be called. Please try again." });
  }
});

router.delete("/waiter-calls/:tableId", authMiddleware, async (req, res) => {
  try {
    await dbDeleteWaiterCall(req.params.tableId);
    res.status(204).end();
  } catch {
    res.status(503).json({ error: "Waiter call could not be cleared." });
  }
});

export async function initWaiterCalls(): Promise<void> {
  await dbLoadWaiterCalls();
}

export default router;
