import { INITIAL_CATEGORIES, INITIAL_MENU } from "./data/initial-data.js";
import { clerkClient, getAuth } from "@clerk/express";

export interface LangMap { en: string; am: string; om?: string; }
export interface MenuItem { id: string; name: LangMap; description: LangMap; price: number; category: string; image: string; hidden: boolean; }
export interface Category { id: string; name: LangMap; order: number; }
export interface Table { id: string; number: number; location: string; status: string; activeOrderCount: number; }
export interface WaiterCall { tableId: string; count: number; lastCalledAt: number; }
export interface Settings { restaurantName: string; logo: string | null; }
export interface OrderItem { menuItemId: string; name: LangMap; price: number; quantity: number; }
export type OrderStatus = "pending" | "preparing" | "ready" | "delivered" | "cancelled";
export interface Order { id: string; tableId: string; tableNumber: number; items: OrderItem[]; status: OrderStatus; createdAt: number; deliveredAt?: number; note?: string; }
export interface Review { id: string; tableId: string; tableNumber: number; mood: string | null; stars: number; comment: string; createdAt: number; }

export const store = {
  menu: [...INITIAL_MENU] as MenuItem[],
  categories: [...INITIAL_CATEGORIES] as Category[],
  tables: [] as Table[],
  waiterCalls: new Map<string, WaiterCall>(),
  orders: new Map<string, Order>(),
  menuClicks: new Map<string, number>(),
  reviews: [] as Review[],
  settings: {
    restaurantName: "ARAB ALI HOTEL",
    logo: null,
  } as Settings,
};

export function isText(value: unknown, max = 500): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}

export function isLangMap(value: unknown): value is LangMap {
  return !!value && typeof value === "object" &&
    isText((value as LangMap).en, 200) &&
    isText((value as LangMap).am, 200) &&
    ((value as LangMap).om === undefined || typeof (value as LangMap).om === "string");
}

export function validImageUrl(value: unknown): value is string {
  return value === "" || (typeof value === "string" && value.length <= 2048 &&
    (value.startsWith("/") || value.startsWith("https://")));
}

const roleCache = new Map<string, { role: "admin" | "waiter" | null; expiresAt: number }>();

async function getStaffRole(userId: string, claims: any): Promise<"admin" | "waiter" | null> {
  const claimRole = claims?.publicMetadata?.role ?? claims?.metadata?.role;
  if (claimRole === "admin" || claimRole === "waiter") return claimRole;

  const cached = roleCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.role;

  try {
    const user = await clerkClient.users.getUser(userId);
    const role = (user.publicMetadata as { role?: unknown }).role;
    const resolved = role === "admin" || role === "waiter" ? role : null;
    roleCache.set(userId, { role: resolved, expiresAt: Date.now() + 5 * 60_000 });
    return resolved;
  } catch {
    roleCache.set(userId, { role: null, expiresAt: Date.now() + 30_000 });
    return null;
  }
}

export async function authMiddleware(req: any, res: any, next: any) {
  const auth = getAuth(req);
  if (!auth.userId) {
    res.status(401).json({ error: "Sign in with your Clerk account to continue." });
    return;
  }
  const role = await getStaffRole(auth.userId, auth.sessionClaims);
  if (!role) {
    res.status(403).json({ error: "You do not have permission yet. Ask an administrator to assign you a staff role." });
    return;
  }
  req.userId = auth.userId;
  req.userRole = role;
  next();
}

/** Admin routes require a signed-in Clerk user with publicMetadata.role=admin. */
export async function adminOnly(req: any, res: any, next: any) {
  const auth = getAuth(req);
  if (!auth.userId) {
    res.status(401).json({ error: "Sign in with your Clerk account to continue." });
    return;
  }
  const role = await getStaffRole(auth.userId, auth.sessionClaims);
  if (role !== "admin") {
    res.status(403).json({
      error: role
        ? "Administrator access is required."
        : "You do not have permission yet. Ask an administrator to assign you the admin role.",
    });
    return;
  }
  req.userId = auth.userId;
  req.userRole = role;
  next();
}

export { getStaffRole };
