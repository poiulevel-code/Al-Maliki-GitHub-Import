import { Router, type Response } from "express";
import { nanoid } from "nanoid";
import { adminOnly, isText, store } from "./store.js";
import type { Table } from "./store.js";
import { dbDeleteTable, dbLoadTables, dbSaveTable } from "../lib/db.js";

const router = Router();
const validFields = new Set(["number", "location", "status"]);
const hasOnlyValidFields = (body: Record<string, unknown>) =>
  Object.keys(body).every((key) => validFields.has(key));

function validTableFields(body: Record<string, unknown>) {
  return hasOnlyValidFields(body) &&
    (body["number"] === undefined ||
      (Number.isInteger(body["number"]) && Number(body["number"]) >= 1 && Number(body["number"]) <= 10_000)) &&
    (body["location"] === undefined ||
      (typeof body["location"] === "string" && body["location"].length <= 120)) &&
    (body["status"] === undefined ||
      ["available", "occupied", "reserved"].includes(String(body["status"])));
}

function sendDbError(res: Response, error: unknown) {
  if (error instanceof Error && /duplicate|unique/i.test(error.message)) {
    res.status(409).json({ error: "That table number is already in use." });
    return;
  }
  res.status(503).json({ error: "Tables are temporarily unavailable." });
}

router.get("/tables", async (_req, res) => {
  try {
    res.json(await dbLoadTables());
  } catch {
    res.status(503).json({ error: "Tables are temporarily unavailable." });
  }
});

router.post("/tables", adminOnly, async (req, res) => {
  const body = req.body as Record<string, unknown>;
  if (!validTableFields(body) || body["status"] !== undefined) {
    res.status(400).json({ error: "Invalid table." });
    return;
  }
  try {
    const tables = await dbLoadTables();
    let number = typeof body["number"] === "number" ? body["number"] : 1;
    while (body["number"] === undefined && tables.some((table) => table.number === number)) number += 1;
    if (tables.some((table) => table.number === number)) {
      res.status(409).json({ error: "That table number is already in use." });
      return;
    }
    const table: Table = {
      id: nanoid(8),
      number,
      location: typeof body["location"] === "string" ? body["location"].trim() : "",
      status: "available",
      activeOrderCount: 0,
    };
    await dbSaveTable(table);
    res.status(201).json(table);
  } catch (error) {
    sendDbError(res, error);
  }
});

async function updateTable(id: string, body: Record<string, unknown>, res: Response) {
  if (!validTableFields(body) || Object.keys(body).length === 0) {
    res.status(400).json({ error: "Invalid table." });
    return;
  }
  try {
    const tables = await dbLoadTables();
    const current = tables.find((table) => table.id === id);
    if (!current) {
      res.status(404).json({ error: "Table not found." });
      return;
    }
    const updated: Table = { ...current, ...body, id };
    if (tables.some((table) => table.id !== id && table.number === updated.number)) {
      res.status(409).json({ error: "That table number is already in use." });
      return;
    }
    await dbSaveTable(updated);
    res.json(updated);
  } catch (error) {
    sendDbError(res, error);
  }
}

router.put("/tables/:id", adminOnly, async (req, res) => {
  await updateTable(req.params.id, req.body as Record<string, unknown>, res);
});

router.patch("/tables/:id", adminOnly, async (req, res) => {
  await updateTable(req.params.id, req.body as Record<string, unknown>, res);
});

router.delete("/tables/:id", adminOnly, async (req, res) => {
  try {
    const tables = await dbLoadTables();
    if (!tables.some((table) => table.id === req.params.id)) {
      res.status(404).json({ error: "Table not found." });
      return;
    }
    await dbDeleteTable(req.params.id);
    res.status(204).end();
  } catch (error) {
    sendDbError(res, error);
  }
});

export async function initTables() {
  store.tables = await dbLoadTables();
  log(`Loaded ${store.tables.length} tables from Supabase`);
}

function log(message: string) {
  process.stdout.write(`[tables] ${message}\n`);
}

export default router;
