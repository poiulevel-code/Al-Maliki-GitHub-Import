import { supabase, hasSupabase } from "./supabase.js";
import { ReplitConnectors } from "@replit/connectors-sdk";
import { loadReviews, saveReviews } from "./persist.js";
import {
  store,
  type MenuItem,
  type Category,
  type Table,
  type Order,
  type WaiterCall,
  type Review,
} from "../routes/store.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = () => supabase as any;

function requireSupabase(operation: string) {
  if (!hasSupabase) throw new Error(`${operation}: Supabase connection is unavailable`);
}

function ensureNoError(error: { message: string } | null, operation: string) {
  if (error) throw new Error(`${operation}: ${error.message}`);
}

const localSettings = new Map<string, string>([
  ["menu_initialized", "true"],
  ["categories_initialized", "true"],
  ["restaurant_name", store.settings.restaurantName],
  ["logo", store.settings.logo ?? ""],
]);
const localRateLimits = new Map<string, { count: number; resetAt: number }>();
let localReviewsLoaded = false;

function ensureLocalReviewsLoaded() {
  if (localReviewsLoaded) return;
  const reviews = loadReviews();
  if (reviews.length > 0 || store.reviews.length === 0) store.reviews = reviews;
  localReviewsLoaded = true;
}

export async function dbLoadMenu(): Promise<MenuItem[]> {
  if (!hasSupabase) return [...store.menu];
  requireSupabase("loadMenu");
  const { data, error } = await sb().from("menu_items").select("*").order("sort_order");
  ensureNoError(error, "loadMenu");
  return (data ?? []).map((r: any) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    price: r.price,
    category: r.category,
    image: r.image ?? "",
    hidden: r.hidden ?? false,
  }));
}

export async function dbSaveMenuItem(item: MenuItem, sortOrder: number): Promise<void> {
  if (!hasSupabase) {
    const currentIndex = store.menu.findIndex((row) => row.id === item.id);
    if (currentIndex >= 0) store.menu.splice(currentIndex, 1);
    store.menu.splice(Math.max(0, Math.min(sortOrder, store.menu.length)), 0, item);
    return;
  }
  requireSupabase("saveMenuItem");
  const { error } = await sb().from("menu_items").upsert({
    id: item.id,
    name: item.name,
    description: item.description,
    price: item.price,
    category: item.category,
    image: item.image,
    hidden: item.hidden,
    sort_order: sortOrder,
  });
  ensureNoError(error, "saveMenuItem");
}

export async function dbDeleteMenuItem(id: string): Promise<void> {
  if (!hasSupabase) {
    store.menu = store.menu.filter((item) => item.id !== id);
    return;
  }
  requireSupabase("deleteMenuItem");
  const { error } = await sb().from("menu_items").delete().eq("id", id);
  ensureNoError(error, "deleteMenuItem");
}

export async function dbSeedMenu(items: MenuItem[]): Promise<void> {
  if (!hasSupabase) {
    store.menu = [...items];
    return;
  }
  requireSupabase("seedMenu");
  const rows = items.map((item, i) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    price: item.price,
    category: item.category,
    image: item.image,
    hidden: item.hidden,
    sort_order: i,
  }));
  const { error } = await sb().from("menu_items").upsert(rows);
  ensureNoError(error, "seedMenu");
}

export async function dbLoadCategories(): Promise<Category[]> {
  if (!hasSupabase) return [...store.categories].sort((a, b) => a.order - b.order);
  requireSupabase("loadCategories");
  const { data, error } = await sb().from("categories").select("*").order("order");
  ensureNoError(error, "loadCategories");
  return (data ?? []).map((r: any) => ({
    id: r.id,
    name: r.name,
    order: r.order,
  }));
}

export async function dbSaveCategory(cat: Category): Promise<void> {
  if (!hasSupabase) {
    const index = store.categories.findIndex((row) => row.id === cat.id);
    if (index < 0) store.categories.push(cat);
    else store.categories[index] = cat;
    return;
  }
  requireSupabase("saveCategory");
  const { error } = await sb().from("categories").upsert({
    id: cat.id,
    name: cat.name,
    order: cat.order,
  });
  ensureNoError(error, "saveCategory");
}

export async function dbDeleteCategory(id: string): Promise<void> {
  if (!hasSupabase) {
    store.categories = store.categories.filter((category) => category.id !== id);
    return;
  }
  requireSupabase("deleteCategory");
  const { error } = await sb().from("categories").delete().eq("id", id);
  ensureNoError(error, "deleteCategory");
}

export async function dbSeedCategories(cats: Category[]): Promise<void> {
  if (!hasSupabase) {
    store.categories = [...cats];
    return;
  }
  requireSupabase("seedCategories");
  const rows = cats.map(c => ({ id: c.id, name: c.name, order: c.order }));
  const { error } = await sb().from("categories").upsert(rows);
  ensureNoError(error, "seedCategories");
}

export async function dbLoadTables(): Promise<Table[]> {
  if (!hasSupabase) return [...store.tables].sort((a, b) => a.number - b.number);
  requireSupabase("loadTables");
  const { data, error } = await sb().from("tables").select("*").order("number");
  ensureNoError(error, "loadTables");
  return (data ?? []).map((r: any) => ({
    id: r.id,
    number: r.number,
    location: r.location ?? "",
    status: r.status ?? "available",
    activeOrderCount: r.active_order_count ?? 0,
  }));
}

export async function dbGetTable(tableId: string): Promise<Table | null> {
  if (!hasSupabase) return store.tables.find((table) => table.id === tableId) ?? null;
  requireSupabase("getTable");
  const { data, error } = await sb().from("tables").select("*").eq("id", tableId);
  ensureNoError(error, "getTable");
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return {
    id: row.id,
    number: row.number,
    location: row.location ?? "",
    status: row.status ?? "available",
    activeOrderCount: row.active_order_count ?? 0,
  };
}

export async function dbSaveTable(table: Table): Promise<void> {
  if (!hasSupabase) {
    const index = store.tables.findIndex((row) => row.id === table.id);
    if (index < 0) store.tables.push(table);
    else store.tables[index] = table;
    return;
  }
  requireSupabase("saveTable");
  const { error } = await sb().from("tables").upsert({
    id: table.id,
    number: table.number,
    location: table.location,
    status: table.status,
    active_order_count: table.activeOrderCount,
  });
  ensureNoError(error, "saveTable");
}

export async function dbDeleteTable(id: string): Promise<void> {
  if (!hasSupabase) {
    store.tables = store.tables.filter((table) => table.id !== id);
    return;
  }
  requireSupabase("deleteTable");
  const { error } = await sb().from("tables").delete().eq("id", id);
  ensureNoError(error, "deleteTable");
}

export async function dbGetSetting(key: string): Promise<string | null> {
  if (!hasSupabase) return localSettings.get(key) ?? null;
  requireSupabase("getSetting");
  const { data, error } = await sb().from("settings").select("value").eq("key", key);
  ensureNoError(error, "getSetting");
  const row = Array.isArray(data) ? data[0] : data;
  return (row as any)?.value ?? null;
}

export async function dbSetSetting(key: string, value: string): Promise<void> {
  if (!hasSupabase) {
    localSettings.set(key, value);
    if (key === "restaurant_name") store.settings.restaurantName = value;
    if (key === "logo") store.settings.logo = value || null;
    return;
  }
  requireSupabase("setSetting");
  const { error } = await sb().from("settings").upsert({ key, value });
  ensureNoError(error, "setSetting");
}

export async function dbLoadOrders(): Promise<Order[]> {
  if (!hasSupabase) {
    return [...store.orders.values()].sort((a, b) => b.createdAt - a.createdAt);
  }
  requireSupabase("loadOrders");
  const { data, error } = await sb().from("orders").select("*").order("created_at", { ascending: false });
  ensureNoError(error, "loadOrders");
  return (data ?? []).map((row: any) => ({
    id: row.id,
    tableId: row.table_id,
    tableNumber: row.table_number ?? 0,
    items: row.items ?? [],
    status: row.status,
    createdAt: Number(row.created_at),
    ...(row.status === "delivered"
      ? { deliveredAt: Number(row.delivered_at ?? row.created_at) }
      : {}),
    ...(row.note ? { note: row.note } : {}),
  })) as Order[];
}

export async function dbSaveOrder(order: Order): Promise<void> {
  if (!hasSupabase) {
    store.orders.set(order.id, order);
    return;
  }
  requireSupabase("saveOrder");
  const { error } = await sb().from("orders").upsert({
    id: order.id,
    table_id: order.tableId,
    table_number: order.tableNumber,
    items: order.items,
    status: order.status,
    note: order.note ?? null,
    created_at: order.createdAt,
    delivered_at: order.deliveredAt ?? null,
  });
  ensureNoError(error, "saveOrder");
}

export async function dbDeleteOrder(id: string): Promise<void> {
  if (!hasSupabase) {
    store.orders.delete(id);
    return;
  }
  requireSupabase("deleteOrder");
  const { error } = await sb().from("orders").delete().eq("id", id);
  ensureNoError(error, "deleteOrder");
}

export async function dbLoadWaiterCalls(): Promise<WaiterCall[]> {
  if (!hasSupabase) {
    return [...store.waiterCalls.values()].sort((a, b) => a.lastCalledAt - b.lastCalledAt);
  }
  requireSupabase("loadWaiterCalls");
  const { data, error } = await sb().from("waiter_calls").select("*").order("last_called_at");
  ensureNoError(error, "loadWaiterCalls");
  return (data ?? []).map((row: any) => ({
    tableId: row.table_id,
    count: row.count ?? 1,
    lastCalledAt: Number(row.last_called_at),
  })) as WaiterCall[];
}

export async function dbSaveWaiterCall(call: WaiterCall): Promise<void> {
  if (!hasSupabase) {
    store.waiterCalls.set(call.tableId, call);
    return;
  }
  requireSupabase("saveWaiterCall");
  const { error } = await sb().from("waiter_calls").upsert({
    table_id: call.tableId,
    count: call.count,
    last_called_at: call.lastCalledAt,
  });
  ensureNoError(error, "saveWaiterCall");
}

export async function dbIncrementWaiterCall(tableId: string): Promise<void> {
  if (!hasSupabase) {
    const current = store.waiterCalls.get(tableId);
    store.waiterCalls.set(tableId, {
      tableId,
      count: (current?.count ?? 0) + 1,
      lastCalledAt: Date.now(),
    });
    return;
  }
  requireSupabase("incrementWaiterCall");
  const { error } = await sb().rpc("increment_waiter_call", { p_table_id: tableId });
  ensureNoError(error, "incrementWaiterCall");
}

export async function dbDeleteWaiterCall(tableId: string): Promise<void> {
  if (!hasSupabase) {
    store.waiterCalls.delete(tableId);
    return;
  }
  requireSupabase("deleteWaiterCall");
  const { error } = await sb().from("waiter_calls").delete().eq("table_id", tableId);
  ensureNoError(error, "deleteWaiterCall");
}

export async function dbLoadReviews(): Promise<Review[]> {
  if (!hasSupabase) {
    ensureLocalReviewsLoaded();
    return [...store.reviews].sort((a, b) => b.createdAt - a.createdAt);
  }
  requireSupabase("loadReviews");
  const { data, error } = await sb().from("reviews").select("*").order("created_at", { ascending: false });
  ensureNoError(error, "loadReviews");
  return (data ?? []).map((row: any) => ({
    id: row.id,
    tableId: row.table_id,
    tableNumber: row.table_number ?? 0,
    mood: row.mood ?? null,
    stars: row.stars ?? 0,
    comment: row.comment ?? "",
    createdAt: Number(row.created_at),
  })) as Review[];
}

export async function dbSaveReview(review: Review): Promise<void> {
  if (!hasSupabase) {
    ensureLocalReviewsLoaded();
    const index = store.reviews.findIndex((row) => row.id === review.id);
    if (index < 0) store.reviews.push(review);
    else store.reviews[index] = review;
    saveReviews(store.reviews);
    return;
  }
  requireSupabase("saveReview");
  const { error } = await sb().from("reviews").upsert({
    id: review.id,
    table_id: review.tableId,
    table_number: review.tableNumber,
    mood: review.mood,
    stars: review.stars,
    comment: review.comment,
    created_at: review.createdAt,
  });
  ensureNoError(error, "saveReview");
}

export async function dbDeleteReview(id: string): Promise<void> {
  if (!hasSupabase) {
    ensureLocalReviewsLoaded();
    store.reviews = store.reviews.filter((review) => review.id !== id);
    saveReviews(store.reviews);
    return;
  }
  requireSupabase("deleteReview");
  const { error } = await sb().from("reviews").delete().eq("id", id);
  ensureNoError(error, "deleteReview");
}

export async function dbSeedReviews(reviews: Review[]): Promise<void> {
  for (const review of reviews) await dbSaveReview(review);
}

export async function dbGetMenuClick(itemId: string): Promise<number> {
  if (!hasSupabase) return store.menuClicks.get(itemId) ?? 0;
  requireSupabase("getMenuClick");
  const { data, error } = await sb().from("menu_clicks").select("clicks").eq("item_id", itemId);
  ensureNoError(error, "getMenuClick");
  const row = Array.isArray(data) ? data[0] : data;
  return Number((row as any)?.clicks ?? 0);
}

export async function dbSaveMenuClick(itemId: string, clicks: number): Promise<void> {
  if (!hasSupabase) {
    store.menuClicks.set(itemId, clicks);
    return;
  }
  requireSupabase("saveMenuClick");
  const { error } = await sb().from("menu_clicks").upsert({ item_id: itemId, clicks });
  ensureNoError(error, "saveMenuClick");
}

export async function dbLoadMenuClicks(): Promise<Array<{ itemId: string; clicks: number }>> {
  if (!hasSupabase) {
    return [...store.menuClicks.entries()].map(([itemId, clicks]) => ({ itemId, clicks }));
  }
  requireSupabase("loadMenuClicks");
  const { data, error } = await sb().from("menu_clicks").select("*");
  ensureNoError(error, "loadMenuClicks");
  return (data ?? []).map((row: any) => ({ itemId: row.item_id, clicks: row.clicks ?? 0 }));
}

export async function dbIncrementMenuClick(itemId: string): Promise<void> {
  if (!hasSupabase) {
    store.menuClicks.set(itemId, (store.menuClicks.get(itemId) ?? 0) + 1);
    return;
  }
  requireSupabase("incrementMenuClick");
  const { error } = await sb().rpc("increment_menu_click", { p_item_id: itemId });
  ensureNoError(error, "incrementMenuClick");
}

export async function dbReorderCategories(ids: string[]): Promise<void> {
  if (!hasSupabase) {
    const categoriesById = new Map(store.categories.map((category) => [category.id, category]));
    store.categories = ids.flatMap((id, order) => {
      const category = categoriesById.get(id);
      return category ? [{ ...category, order }] : [];
    });
    return;
  }
  requireSupabase("reorderCategories");
  const { error } = await sb().rpc("reorder_categories", { p_ids: ids });
  ensureNoError(error, "reorderCategories");
}

export async function dbConsumeRateLimit(key: string, limit: number): Promise<boolean> {
  if (!hasSupabase) {
    const now = Date.now();
    let entry = localRateLimits.get(key);
    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + 60_000 };
      localRateLimits.set(key, entry);
    }
    if (entry.count >= limit) return false;
    entry.count += 1;
    return true;
  }
  requireSupabase("consumeRateLimit");
  const { data, error } = await sb().rpc("consume_public_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_now: Date.now(),
    p_window_ms: 60_000,
  });
  ensureNoError(error, "consumeRateLimit");
  return data === true;
}

export async function downloadStorageObject(bucket: string, objectPath: string): Promise<Response> {
  if (!hasSupabase) return new Response(null, { status: 404 });
  return new ReplitConnectors().proxy("supabase", `/object/${bucket}/${objectPath}`, { method: "GET" });
}

export async function uploadImageToSupabase(buffer: Buffer, ext: string, folder: string): Promise<string> {
  if (!hasSupabase) throw new Error("Supabase not configured");
  const fileName = `${folder}/${Date.now()}${ext}`;
  const { error } = await sb().storage.from("menu-images").upload(fileName, buffer, {
    contentType: ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg",
    upsert: false,
  });
  if (error) throw error;
  const { data } = sb().storage.from("menu-images").getPublicUrl(fileName);
  return data.publicUrl;
}

export async function uploadLogoToSupabase(buffer: Buffer, ext: string): Promise<string> {
  if (!hasSupabase) throw new Error("Supabase not configured");
  const fileName = `restaurant-logo${ext}`;
  const { error } = await sb().storage.from("logos").upload(fileName, buffer, {
    contentType: ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg",
    upsert: true,
  });
  if (error) throw error;
  const { data } = sb().storage.from("logos").getPublicUrl(fileName);
  return data.publicUrl;
}
