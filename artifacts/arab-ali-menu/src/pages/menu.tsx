import React, { useState, useRef, useMemo, useCallback, memo, useEffect } from "react";
import {
  Bell, CheckCircle, X, Search, SlidersHorizontal, ArrowUpDown,
  TrendingUp, TrendingDown, ShoppingCart, Plus, Minus, Trash2,
  ChevronUp, Send, ClipboardList, Clock, MessageSquarePlus, Star
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

const API_BASE = "/api";
const BUNDLE_KEY = "al_bundle_v3";
const BUNDLE_TTL = 30 * 60_000;
const BUNDLE_CACHE_WRITE_INTERVAL = 5 * 60_000;

type Lang = "en" | "am" | "om";
interface LangMap { en: string; am: string; om?: string; }
interface MenuItem { id: string; name: LangMap; description: LangMap; price: number; category: string; image: string; }
interface Category { id: string; name: LangMap; order: number; }
interface Bundle { menu: MenuItem[]; categories: Category[]; settings: { logo: string | null; restaurantName: string }; }
interface CartItem { item: MenuItem; qty: number; }

const T = {
  callWaiter:        { en: "Call Waiter",           am: "አስተናጋጅ ይጥሩ",        om: "Qore Waami"               },
  calling:           { en: "Calling…",               am: "እየጠሩ ነው…",           om: "Waamaa jira…"             },
  waiterComing:      { en: "Waiter Coming!",          am: "አስተናጋጅ መጣ!",         om: "Qoreen Bitaa dhufa!"      },
  searchPlaceholder: { en: "Search menu…",            am: "ሜኑ ፈልግ…",            om: "Nyaata barbaadi…"          },
  noResults:         { en: "No items found",          am: "ምንም ምርት አልተገኘም",     om: "Wanti argame hin jiru"    },
  noResultsSub:      { en: "Try a different keyword", am: "ሌላ ቃል ይሞክሩ",        om: "Jecha biraa yaali"        },
  myOrder:           { en: "My Orders",               am: "የኔ ትዕዛዞች",            om: "Ajaja Koo"                },
  addToOrder:        { en: "Add",                     am: "ጨምር",                om: "Dabaluu"                  },
  emptyCart:         { en: "Your order is empty",     am: "ትዕዛዙ ባዶ ነው",         om: "Ajajni keessan duwwaadha" },
  emptyCartSub:      { en: "Tap + on items to add",   am: "ምርቶች ላይ + ይጫኑ",     om: "Wantootarra + tuqi"       },
  total:             { en: "Total",                   am: "ጠቅላላ",               om: "Walii Gala"               },
  note:              { en: "Note for kitchen…",       am: "ለምግብ ቤት ማስታወሻ…",   om: "Yaada dabalataa…"         },
  placeOrder:        { en: "Place Order",             am: "ትዕዛዝ ላክ",           om: "Ajaja Ergi"               },
  placing:           { en: "Sending…",                am: "እየላከ…",              om: "Ergaa jira…"              },
  orderSent:         { en: "Order Sent! 🎉",          am: "ትዕዛዝ ተልኳል! 🎉",    om: "Ajajni Ergame! 🎉"        },
  orderFail:         { en: "Failed, try again",       am: "አልተሳካም፣ ሞክሩ",       om: "Hin milkoofne, irra deebi'i" },
  items:             { en: "items",                   am: "ምርቶች",              om: "wantoota"                 },
  ordered:           { en: "Ordered",                 am: "ታዝዟል",              om: "Ajajame"                  },
} as const;
const t = (key: keyof typeof T, lang: Lang) => T[key][lang];

function readBundleCache(): Bundle | undefined {
  try {
    const raw = localStorage.getItem(BUNDLE_KEY);
    if (!raw) return undefined;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts < BUNDLE_TTL) return data as Bundle;
  } catch {}
  return undefined;
}
function writeBundleCache(data: Bundle) {
  try {
    const now = Date.now();
    const serializedData = JSON.stringify(data);
    const raw = localStorage.getItem(BUNDLE_KEY);
    if (raw) {
      const cached = JSON.parse(raw) as { data?: Bundle; ts?: number };
      if (JSON.stringify(cached.data) === serializedData &&
          typeof cached.ts === "number" && now - cached.ts < BUNDLE_CACHE_WRITE_INTERVAL) return;
    }
    localStorage.setItem(BUNDLE_KEY, JSON.stringify({ data, ts: now }));
  } catch {}
}

const ORDER_HISTORY_KEY = "al_last_order";
const ORDER_HISTORY_TTL = 20 * 60_000; // 20 minutes

interface SavedOrder { items: CartItem[]; total: number; note: string; placedAt: number; }

function readLastOrder(): SavedOrder | null {
  try {
    const raw = localStorage.getItem(ORDER_HISTORY_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as SavedOrder;
    if (Date.now() - o.placedAt > ORDER_HISTORY_TTL) {
      localStorage.removeItem(ORDER_HISTORY_KEY);
      return null;
    }
    return o;
  } catch { return null; }
}
function writeLastOrder(o: SavedOrder) {
  try { localStorage.setItem(ORDER_HISTORY_KEY, JSON.stringify(o)); } catch {}
}
function clearLastOrder() {
  try { localStorage.removeItem(ORDER_HISTORY_KEY); } catch {}
}

const INITIAL_BUNDLE: Bundle = {
  menu: [],
  categories: [],
  settings: { logo: null, restaurantName: "ARAB ALI HOTEL" },
};

function FoodImage({
  src,
  alt,
  className,
  style,
  loading = "lazy",
  fallbackClassName = "absolute inset-0 flex items-center justify-center bg-stone-100",
  iconClassName = "text-stone-300 text-6xl",
}: {
  src: string;
  alt: string;
  className: string;
  style?: React.CSSProperties;
  loading?: "eager" | "lazy";
  fallbackClassName?: string;
  iconClassName?: string;
}) {
  const [failed, setFailed] = useState(!src);
  useEffect(() => setFailed(!src), [src]);
  if (!src || failed) {
    return (
      <div className={fallbackClassName} role="img" aria-label={alt}>
        <span className={iconClassName}>🍽</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      loading={loading}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

/* ── Item detail modal ── */
const ItemDetailModal = memo(function ItemDetailModal({
  item, lang, onClose, onAdd
}: { item: MenuItem; lang: Lang; onClose: () => void; onAdd: () => void }) {
  const gl = (map: LangMap | undefined) => map ? (map[lang] || map.en || "") : "";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm sm:max-w-md bg-white rounded-[2rem] overflow-hidden shadow-2xl mx-4"
        onClick={e => e.stopPropagation()}
        style={{ animation: "modalIn 0.18s ease-out" }}
      >
        <div className="relative w-full overflow-hidden bg-muted" style={{ paddingBottom: "88%" }}>
          <FoodImage
            src={item.image}
            alt={gl(item.name)}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: "center 35%", filter: "brightness(1.06) saturate(1.10)", transform: "scale(1.04)" }}
            loading="eager"
          />
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/30 to-transparent" />
          <button onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 pt-5 pb-6">
          <h2 className="font-serif font-bold text-[#1B2A4A] text-xl leading-snug mb-2">{gl(item.name)}</h2>
          {gl(item.description) && (
            <p className="text-stone-500 text-sm leading-relaxed mb-4">{gl(item.description)}</p>
          )}
          <div className="flex items-center justify-between mt-2">
            <span className="text-[#C1440E] font-bold text-2xl">{item.price} ETB</span>
            <button
              onClick={() => { onAdd(); onClose(); }}
              className="flex items-center gap-2 bg-[#C1440E] text-white px-5 py-2.5 rounded-full font-semibold text-sm active:scale-95 transition-transform shadow-md shadow-[#C1440E]/30"
            >
              <Plus className="w-4 h-4" /> {t("addToOrder", lang)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

/* ── countdown helper ── */
function useCountdown(targetMs: number | null) {
  const [remaining, setRemaining] = useState<number>(0);
  useEffect(() => {
    if (targetMs === null) return;
    const tick = () => setRemaining(Math.max(0, targetMs - Date.now()));
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, [targetMs]);
  if (targetMs === null) return null;
  const mins = Math.ceil(remaining / 60_000);
  return mins > 0 ? mins : 0;
}

/* ── Cart drawer ── */
function CartDrawer({
  cart, lang, tableId, onQty, onClose, lastOrder, onOrderPlaced, onClearLastOrder, onOpenReview
}: {
  cart: Map<string, CartItem>;
  lang: Lang;
  tableId: string;
  onQty: (id: string, delta: number) => void;
  onClose: () => void;
  lastOrder: SavedOrder | null;
  onOrderPlaced: (o: SavedOrder) => void;
  onClearLastOrder: () => void;
  onOpenReview: () => void;
}) {
  const [note, setNote]     = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [successTotal, setSuccessTotal] = useState(0);
  const [visible, setVisible] = useState(false);
  const mountedRef     = useRef(true);
  const timerRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    const raf = requestAnimationFrame(() => {
      if (mountedRef.current) setVisible(true);
    });
    return () => {
      mountedRef.current = false;
      cancelAnimationFrame(raf);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const handleClose = () => {
    if (closeTimerRef.current) return;
    setVisible(false);
    closeTimerRef.current = setTimeout(() => {
      if (mountedRef.current) onClose();
    }, 320);
  };

  const gl = (map: LangMap | undefined) => map ? (map[lang] || map.en || "") : "";
  const items = Array.from(cart.values());
  const total = items.reduce((s, ci) => s + ci.item.price * ci.qty, 0);
  const expiresAt = lastOrder ? lastOrder.placedAt + ORDER_HISTORY_TTL : null;
  const minsLeft = useCountdown(items.length === 0 && lastOrder ? expiresAt : null);

  const safeSet = <T,>(fn: (v: T) => void, v: T) => {
    if (mountedRef.current) fn(v);
  };

  const placeOrder = async () => {
    if (status === "loading") return;
    const snapshot = Array.from(cart.values());
    safeSet(setStatus, "loading" as const);
    try {
      const orderItems = snapshot.map(ci => ({
        menuItemId: ci.item.id,
        quantity: ci.qty,
      }));
      const res = await fetch(`${API_BASE}/orders`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId,
          items: orderItems,
          note: note.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("fail");
      const savedOrder = await res.json() as { items: Array<{ menuItemId: string; name: LangMap; price: number; quantity: number }> };
      const savedItems = savedOrder.items.map((serverItem) => {
        const cartItem = snapshot.find((entry) => entry.item.id === serverItem.menuItemId);
        return {
          item: {
            ...(cartItem?.item ?? {
              id: serverItem.menuItemId,
              name: serverItem.name,
              description: { en: "", am: "" },
              category: "",
              image: "",
              hidden: false,
            }),
            name: serverItem.name,
            price: serverItem.price,
          },
          qty: serverItem.quantity,
        };
      });
      const savedTotal = savedItems.reduce((sum, entry) => sum + entry.item.price * entry.qty, 0);
      const saved: SavedOrder = { items: savedItems, total: savedTotal, note: note.trim(), placedAt: Date.now() };
      onOrderPlaced(saved);
      safeSet(setSuccessTotal, savedTotal);
      safeSet(setStatus, "success" as const);
      timerRef.current = setTimeout(() => {
        if (mountedRef.current) handleClose();
      }, 2000);
    } catch {
      safeSet(setStatus, "error" as const);
      timerRef.current = setTimeout(() => {
        safeSet(setStatus, "idle" as const);
      }, 2500);
    }
  };

  const totalCount = items.reduce((s, ci) => s + ci.qty, 0);
  const showFooter = status === "success" || status === "error" || items.length > 0;

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col justify-end"
      style={{ pointerEvents: visible ? "auto" : "none" }}
      onClick={e => e.target === e.currentTarget && handleClose()}
    >
      <div
        className="absolute inset-0 bg-black/50"
        style={{ opacity: visible ? 1 : 0, transition: "opacity 250ms ease" }}
        onClick={handleClose}
      />
      <div
        className="relative bg-white rounded-t-3xl shadow-2xl flex flex-col"
        style={{
          maxHeight: "92vh",
          transform: visible ? "translateY(0)" : "translateY(100%)",
          transition: "transform 320ms cubic-bezier(0.32,0.72,0,1)",
          willChange: "transform",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-stone-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 pt-1 border-b border-stone-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-[#C1440E]" />
            <h2 className="font-bold text-[#1B2A4A] text-base">{t("myOrder", lang)}</h2>
            {totalCount > 0 && status === "idle" && (
              <span className="text-[11px] font-bold bg-[#C1440E] text-white px-2 py-0.5 rounded-full">
                {totalCount}
              </span>
            )}
          </div>
          <button onClick={handleClose} className="p-1.5 text-stone-400 hover:text-stone-600 transition-colors touch-manipulation">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success overlay — shown over everything when order placed */}
        {status === "success" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 py-10">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <div className="text-center">
              <p className="font-bold text-[#1B2A4A] text-xl mb-1">
                {lang === "en" ? "Order Sent!" : lang === "am" ? "ትዕዛዝ ተልኳል!" : "Ajajni Ergame!"}
              </p>
              <p className="text-stone-400 text-sm">
                {lang === "en" ? "Your order is being prepared" : lang === "am" ? "ትዕዛዝዎ እየተዘጋጀ ነው" : "Ajajni keessan qophaa'aa jira"}
              </p>
            </div>
            <div className="mt-2 px-6 py-3 bg-stone-50 rounded-2xl">
              <p className="text-stone-400 text-xs text-center">{lang === "en" ? "Total" : lang === "am" ? "ጠቅላላ" : "Walii Gala"}</p>
              <p className="font-black text-[#1B2A4A] text-2xl text-center">{successTotal.toLocaleString()} ETB</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {status === "error" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 py-10">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center text-4xl">⚠️</div>
            <div className="text-center">
              <p className="font-bold text-red-600 text-lg mb-1">{t("orderFail", lang)}</p>
              <p className="text-stone-400 text-sm">
                {lang === "en" ? "Please try again" : lang === "am" ? "እባክዎ እንደገና ሞክሩ" : "Irra deebi'ii yaali"}
              </p>
            </div>
          </div>
        )}

        {/* Normal cart content — only shown when not success/error */}
        {status !== "success" && status !== "error" && (
          <>
            {/* Review strip */}
            <button
              onClick={() => { handleClose(); setTimeout(onOpenReview, 320); }}
              className="flex-shrink-0 mx-4 mt-3 flex items-center gap-3 bg-gradient-to-r from-[#C1440E]/10 to-orange-50 border-2 border-[#C1440E]/30 rounded-2xl px-4 py-3.5 w-[calc(100%-2rem)] active:scale-[0.98] transition-transform shadow-sm touch-manipulation"
            >
              <div className="w-10 h-10 rounded-xl bg-[#C1440E]/15 flex items-center justify-center text-xl flex-shrink-0">✍️</div>
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-[#C1440E]">
                  {lang === "en" ? "Leave a Review" : lang === "am" ? "አስተያየት ይስጡ" : "Yaada Kee Kenni"}
                </p>
                <p className="text-xs text-[#C1440E]/70 mt-0.5">
                  {lang === "en" ? "Share your feedback with us" : lang === "am" ? "አስተያየቶን ያጋሩልን" : "Yaada kee nu waliin qoodi"}
                </p>
              </div>
              <MessageSquarePlus className="w-4 h-4 text-[#C1440E] flex-shrink-0" />
            </button>

            {/* Items list */}
            <div className="overflow-y-auto flex-1 overscroll-contain px-4 py-3 space-y-2">
              {items.length === 0 ? (
                lastOrder && minsLeft !== null && minsLeft > 0 ? (
                  <div>
                    <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-2xl px-4 py-3 mb-3">
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-green-800 text-sm">
                          {lang === "en" ? "Order placed!" : lang === "am" ? "ትዕዛዝ ተልኳል!" : "Ajajni Erga'e!"}
                        </p>
                        <p className="text-green-600 text-xs flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {lang === "en"
                            ? `Shown for ${minsLeft} more min${minsLeft !== 1 ? "s" : ""}`
                            : lang === "am"
                            ? `${minsLeft} ደቂቃ ይታያል`
                            : `Daqiiqaa ${minsLeft} mul'ata`}
                        </p>
                      </div>
                      <button onClick={onClearLastOrder} className="p-1 text-green-400 hover:text-green-600 transition-colors flex-shrink-0 touch-manipulation">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="space-y-2">
                      {lastOrder.items.map(ci => (
                        <div key={ci.item.id} className="flex items-center gap-3 bg-stone-50 rounded-2xl p-3 opacity-80">
                          <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-stone-100">
                            <FoodImage
                              src={ci.item.image}
                              alt={gl(ci.item.name)}
                              className="w-full h-full object-cover"
                              fallbackClassName="w-full h-full flex items-center justify-center bg-stone-100"
                              iconClassName="text-xl"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-[#1B2A4A] text-sm truncate">{gl(ci.item.name)}</p>
                            <p className="text-stone-400 text-xs">{ci.qty} × {ci.item.price} ETB</p>
                          </div>
                          <span className="text-[#C1440E] font-bold text-sm flex-shrink-0">{ci.item.price * ci.qty} ETB</span>
                        </div>
                      ))}
                    </div>
                    {lastOrder.note && (
                      <div className="mt-3 px-4 py-2.5 bg-stone-50 rounded-2xl text-xs text-stone-500 italic border border-stone-100">
                        <span className="font-bold not-italic text-stone-400 text-[10px] uppercase tracking-wide block mb-1">
                          {lang === "en" ? "Note" : lang === "am" ? "ማስታወሻ" : "Yaadaannoo"}
                        </span>
                        {lastOrder.note}
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-3 px-1">
                      <span className="text-stone-400 text-sm">{lang === "en" ? "Total" : lang === "am" ? "ጠቅላላ" : "Walii Gala"}</span>
                      <span className="font-bold text-[#1B2A4A] text-base">{lastOrder.total} ETB</span>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <ShoppingCart className="w-10 h-10 text-stone-200 mx-auto mb-3" />
                    <p className="font-semibold text-stone-400 text-sm">{t("emptyCart", lang)}</p>
                    <p className="text-stone-300 text-xs mt-1">{t("emptyCartSub", lang)}</p>
                  </div>
                )
              ) : (
                items.map(ci => (
                  <div key={ci.item.id} className="flex items-center gap-3 bg-stone-50 rounded-2xl p-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-stone-100">
                      <FoodImage
                        src={ci.item.image}
                        alt={gl(ci.item.name)}
                        className="w-full h-full object-cover"
                        fallbackClassName="w-full h-full flex items-center justify-center bg-stone-100"
                        iconClassName="text-xl"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#1B2A4A] text-sm truncate">{gl(ci.item.name)}</p>
                      <p className="text-[#C1440E] font-bold text-sm">{ci.item.price * ci.qty} ETB</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => onQty(ci.item.id, -1)}
                        className="w-7 h-7 rounded-full bg-white border border-stone-200 flex items-center justify-center text-stone-600 hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-colors touch-manipulation"
                      >
                        {ci.qty === 1 ? <Trash2 className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                      </button>
                      <span className="w-6 text-center text-sm font-bold text-[#1B2A4A]">{ci.qty}</span>
                      <button
                        onClick={() => onQty(ci.item.id, 1)}
                        className="w-7 h-7 rounded-full bg-[#C1440E] flex items-center justify-center text-white hover:bg-[#a83a0c] transition-colors touch-manipulation"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer — order button */}
            {showFooter && items.length > 0 && (
              <div className="flex-shrink-0 px-4 pb-6 pt-3 border-t border-stone-100 space-y-3"
                style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder={t("note", lang)}
                  rows={2}
                  className="w-full bg-stone-50 border border-stone-200 focus:border-[#C1440E] rounded-2xl px-4 py-2.5 text-sm text-stone-700 resize-none outline-none transition-colors placeholder:text-stone-300"
                />
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-stone-500 text-sm">{t("total", lang)}</span>
                  <span className="font-bold text-[#1B2A4A] text-lg">{total} ETB</span>
                </div>
                <button
                  onClick={placeOrder}
                  disabled={status === "loading"}
                  className="w-full flex items-center justify-center gap-2 bg-[#C1440E] text-white py-4 rounded-2xl font-bold text-sm shadow-lg shadow-[#C1440E]/30 active:scale-[0.98] transition-all disabled:opacity-60 touch-manipulation select-none"
                >
                  {status === "loading"
                    ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />{t("placing", lang)}</>
                    : <><Send className="w-4 h-4" />{t("placeOrder", lang)}</>
                  }
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function MenuPage() {
  const params = useParams();
  const tableId = params.tableId || "1";
  return <MenuContent tableId={tableId} />;
}

/* ─── Review Modal ─────────────────────────────────────────────────── */
const MOODS = [
  { emoji: "😍", label: { en: "Excellent", am: "አስደናቂ",    om: "Baay'ee Gaarii" }, color: "bg-green-50 border-green-300 text-green-700"   },
  { emoji: "😊", label: { en: "Good",      am: "ጥሩ",       om: "Gaarii"         }, color: "bg-lime-50 border-lime-300 text-lime-700"     },
  { emoji: "😐", label: { en: "Okay",      am: "መካከለኛ",    om: "Giddugaleessa"  }, color: "bg-yellow-50 border-yellow-300 text-yellow-700" },
  { emoji: "😕", label: { en: "Poor",      am: "አልተመቸኝም", om: "Gaaritti Miti"  }, color: "bg-orange-50 border-orange-300 text-orange-700" },
] as const;

function ReviewModal({ open, onClose, tableId, lang }: {
  open: boolean; onClose: () => void; tableId: string; lang: Lang;
}) {
  const [mood, setMood]       = useState<number | null>(null);
  const [stars, setStars]     = useState(0);
  const [hoverStar, setHoverStar] = useState(0);
  const [comment, setComment] = useState("");
  const [status, setStatus]   = useState<"idle" | "sending" | "done" | "error">("idle");

  const lbl = (map: Record<string, string>) => map[lang as string] ?? map["en"];

  const reset = () => { setMood(null); setStars(0); setHoverStar(0); setComment(""); setStatus("idle"); };

  const handleClose = () => { onClose(); setTimeout(reset, 400); };

  const submit = async () => {
    if (mood === null && stars === 0 && !comment.trim()) return;
    setStatus("sending");
    try {
      const response = await fetch(`${API_BASE}/orders`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId,
          items: [],
          note: comment.trim() || undefined,
          rating: stars || undefined,
          mood: mood !== null ? MOODS[mood].label.en : undefined,
          isReviewOnly: true,
        }),
      });
      if (!response.ok) throw new Error("Review could not be saved");
      setStatus("done");
      setTimeout(handleClose, 2000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2500);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="review-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Sheet */}
          <motion.div
            key="review-sheet"
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 sm:max-w-2xl sm:mx-auto rounded-t-3xl bg-white shadow-2xl overflow-hidden"
            style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-stone-200" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-2 pb-4">
              <div>
                <h2 className="text-lg font-bold text-[#1B2A4A]">
                  {lbl({ en: "Leave a Review", am: "አስተያየት ይስጡ", om: "Yaada Kee Kenni" })}
                </h2>
                <p className="text-xs text-stone-400 mt-0.5">
                  {lbl({ en: "Your feedback helps us improve", am: "አስተያየቶ እናሻሽለን", om: "Yaadi kee nu gargaara" })}
                </p>
              </div>
              <button onClick={handleClose}
                className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 active:scale-90 transition-transform">
                <X className="w-4 h-4" />
              </button>
            </div>

            {status === "done" ? (() => {
              const isPositive = mood !== null ? mood <= 1 : stars >= 4;
              return (
                <motion.div
                  initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-center justify-center py-10 gap-4 px-5 text-center">
                  <div className={cn(
                    "w-20 h-20 rounded-full flex items-center justify-center text-4xl",
                    isPositive ? "bg-green-100" : "bg-orange-50"
                  )}>
                    {isPositive ? "🎉" : "🤝"}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xl font-bold text-[#1B2A4A]">
                      {isPositive
                        ? lbl({ en: "Thank you! 🙏", am: "እናመሰግናለን!", om: "Galatoomi! 🙏" })
                        : lbl({ en: "We hear you! 🙏", am: "እናመሰግናለን!", om: "Dhagahamte! 🙏" })
                      }
                    </p>
                    <p className="text-xs text-stone-400 font-medium">
                      {lbl({ en: "Feedback received", am: "አስተያየትዎ ደርሶናል", om: "Yaadi kee nu gahe" })}
                    </p>
                  </div>
                  <p className="text-sm text-stone-500 leading-relaxed max-w-xs">
                    {isPositive
                      ? lbl({
                          en: "We're glad you enjoyed it. We always look forward to welcoming you! ❤️",
                          am: "በጣም እናመሰግናለን! 🙏\nበአገልግሎታችን እንደተደሰቱ ተስፋ እናደርጋለን። ሁል ጊዜ እንጠብቃችኋለን! ❤️",
                          om: "Gammaddan jirra! Yeroo hundaa si simachuuf eegna! ❤️",
                        })
                      : lbl({
                          en: "Your feedback helps us improve. We'll work hard to make it better! 🤝",
                          am: "ስላልተመቸዎት አዝነናል። በተሻለ አገልግሎት ለመጠበቅ ራሳችንን እናሻሽላለን! 🤝",
                          om: "Yaadi kee nu gargaara. Siif gaarii taasisuuf tattaafanna! 🤝",
                        })
                    }
                  </p>
                </motion.div>
              );
            })() : (
              <div className="px-5 space-y-5 pb-2">
                {/* Mood selector */}
                <div>
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">
                    {lbl({ en: "How was your experience?", am: "አስተያየት ይስጡ", om: "Muuxannoon kee akkam ture?" })}
                  </p>
                  <div className="flex gap-2 justify-between">
                    {MOODS.map((m, i) => (
                      <button key={i} type="button" onClick={() => setMood(prev => prev === i ? null : i)}
                        className={cn(
                          "flex-1 flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2 transition-all active:scale-95",
                          mood === i ? m.color + " scale-105 shadow-md" : "bg-stone-50 border-stone-200"
                        )}>
                        <span className="text-2xl leading-none">{m.emoji}</span>
                        <span className="text-[9px] font-semibold uppercase tracking-wide leading-tight text-center text-stone-500">
                          {lbl(m.label)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Star rating */}
                <div>
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
                    {lbl({ en: "Rate the food", am: "ለምግቡ ደረጃ ይስጡ", om: "Nyaata sadarkaa itti kenni" })}
                  </p>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(s => (
                      <button key={s} type="button"
                        onClick={() => setStars(prev => prev === s ? 0 : s)}
                        onMouseEnter={() => setHoverStar(s)}
                        onMouseLeave={() => setHoverStar(0)}
                        className="touch-manipulation active:scale-110 transition-transform">
                        <Star
                          className={cn("w-8 h-8 transition-colors", s <= (hoverStar || stars) ? "fill-amber-400 text-amber-400" : "text-stone-200 fill-stone-200")}
                        />
                      </button>
                    ))}
                    {stars > 0 && (
                      <span className="self-center text-sm font-bold text-amber-500 ml-1">
                        {["", "1★", "2★", "3★", "4★", "5★"][stars]}
                      </span>
                    )}
                  </div>
                </div>

                {/* Comment */}
                <div>
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
                    {lbl({ en: "Additional comments", am: "ተጨማሪ አስተያየት ካላችሁ", om: "Yaada dabalataa" })}
                  </p>
                  <textarea
                    value={comment} onChange={e => setComment(e.target.value)} rows={3} maxLength={200}
                    placeholder={lbl({
                      en: "Tell us what you loved or what we can improve…",
                      am: "ምን ማሻሻል እንዳለብን ይንገሩን…",
                      om: "Maal jaalattu fi maal fooyyefnu nuuf himi…",
                    })}
                    className="w-full bg-stone-50 border border-stone-200 focus:border-[#C1440E] rounded-2xl px-4 py-3 text-sm text-stone-700 resize-none outline-none transition-colors placeholder:text-stone-400"
                  />
                  <p className="text-right text-[10px] text-stone-300 mt-1">{comment.length}/200</p>
                </div>

                {/* Submit */}
                <button onClick={submit} disabled={status === "sending" || (mood === null && stars === 0 && !comment.trim())}
                  className={cn(
                    "w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]",
                    (mood !== null || stars > 0 || comment.trim())
                      ? "bg-[#1B2A4A] text-white shadow-lg shadow-[#1B2A4A]/20"
                      : "bg-stone-100 text-stone-400 cursor-not-allowed"
                  )}>
                  {status === "sending" ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {lbl({ en: "Sending…", am: "በመላክ ላይ…", om: "Ergaa jira…" })}</>
                  ) : (
                    <><Send className="w-4 h-4" />
                    {lbl({ en: "Send Review", am: "አስተያየት ላክ", om: "Yaada Ergi" })}</>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function MenuContent({ tableId }: { tableId: string }) {
  const [lang, setLang] = useState<Lang>(() => {
    try { const s = localStorage.getItem("menu_lang") as Lang; return (s === "en" || s === "am" || s === "om") ? s : "en"; } catch { return "en"; }
  });
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selectedItem, setSelectedItem]     = useState<MenuItem | null>(null);
  const [langMenuOpen, setLangMenuOpen]     = useState(false);
  const [waiterCalled, setWaiterCalled]     = useState(false);
  const [searchQuery, setSearchQuery]       = useState("");
  const [sortOrder, setSortOrder]           = useState<"default" | "asc" | "desc">("default");
  const [filterOpen, setFilterOpen]         = useState(false);
  const [cart, setCart]                     = useState<Map<string, CartItem>>(new Map());
  const [cartOpen, setCartOpen]             = useState(false);
  const [reviewOpen, setReviewOpen]         = useState(false);
  const [lastOrder, setLastOrder]           = useState<SavedOrder | null>(() => readLastOrder());
  const searchRef = useRef<HTMLInputElement>(null);

  const cachedBundle = readBundleCache();

  const { data: bundle = INITIAL_BUNDLE } = useQuery<Bundle>({
    queryKey: ["bundle"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/bundle`, { cache: "no-store", credentials: "same-origin" });
      if (!res.ok) return cachedBundle ?? INITIAL_BUNDLE;
      const data = await res.json() as Bundle;
      writeBundleCache(data);
      return data;
    },
    initialData: cachedBundle ?? INITIAL_BUNDLE,
    initialDataUpdatedAt: cachedBundle ? Date.now() - 5_000 : 0,
    staleTime: 0,
    gcTime: 30 * 60_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  const { menu: menuData = INITIAL_BUNDLE.menu, categories = INITIAL_BUNDLE.categories } = bundle;

  const callWaiter = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_BASE}/waiter-call`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId }),
      });
      if (!response.ok) throw new Error("Waiter could not be called");
    },
    onSuccess: () => { setWaiterCalled(true); setTimeout(() => setWaiterCalled(false), 4000); },
  });

  const gl = useCallback(
    (map: LangMap | undefined) => (map ? map[lang] || map.en || "" : ""),
    [lang],
  );
  const closeModal = useCallback(() => setSelectedItem(null), []);

  /* Cart helpers */
  const addToCart = useCallback((item: MenuItem) => {
    setCart(prev => {
      const next = new Map(prev);
      const existing = next.get(item.id);
      next.set(item.id, { item, qty: existing ? existing.qty + 1 : 1 });
      return next;
    });
    /* track click */
    fetch(`${API_BASE}/menu-stats/click/${encodeURIComponent(item.id)}?tableId=${encodeURIComponent(tableId)}`, {
      method: "POST",
      credentials: "same-origin",
    }).catch(() => {});
  }, []);

  const adjustQty = useCallback((id: string, delta: number) => {
    setCart(prev => {
      const next = new Map(prev);
      const entry = next.get(id);
      if (!entry) return prev;
      if (entry.qty + delta <= 0) { next.delete(id); }
      else { next.set(id, { ...entry, qty: entry.qty + delta }); }
      return next;
    });
  }, []);

  const cartCount = useMemo(() => Array.from(cart.values()).reduce((s, ci) => s + ci.qty, 0), [cart]);

  const allTabs = useMemo(
    () => [{ id: "all", name: { en: "All", am: "ሁሉም", om: "Hunda" }, order: 0 } as Category, ...categories],
    [categories],
  );

  const query = searchQuery.trim().toLowerCase();
  const filteredItems = useMemo(
    () =>
      menuData
        .filter(item => {
          const inCategory = activeCategory === "all" || item.category === activeCategory;
          if (!inCategory) return false;
          if (!query) return true;
          return (
            gl(item.name).toLowerCase().includes(query) ||
            gl(item.description).toLowerCase().includes(query)
          );
        })
        .sort((a, b) => {
          if (sortOrder === "asc") return a.price - b.price;
          if (sortOrder === "desc") return b.price - a.price;
          return 0;
        }),
    [menuData, activeCategory, query, sortOrder, gl],
  );

  const isFiltered = sortOrder !== "default";
  const SORT_OPTIONS: { key: "default" | "asc" | "desc"; labelEn: string; labelAm: string; labelOm: string; icon: React.ReactNode }[] = [
    { key: "default", labelEn: "Default order",     labelAm: "ሁሉንም አሳይ",   labelOm: "Tartiiba Default",  icon: <ArrowUpDown  className="w-4 h-4" /> },
    { key: "asc",     labelEn: "Price: Low → High", labelAm: "ዋጋ: ዝቅ → ከፍ", labelOm: "Gatii: Gad → Ol",   icon: <TrendingUp   className="w-4 h-4" /> },
    { key: "desc",    labelEn: "Price: High → Low", labelAm: "ዋጋ: ከፍ → ዝቅ", labelOm: "Gatii: Ol → Gad",   icon: <TrendingDown className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background w-full flex flex-col relative overflow-hidden sm:max-w-2xl sm:mx-auto sm:my-4 sm:rounded-[2rem] sm:shadow-2xl sm:shadow-foreground/5 sm:border sm:border-border/50">
      <style>{`
        @keyframes modalIn { from { opacity: 0; transform: scale(0.96) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes cardFadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .menu-card { animation: cardFadeIn 0.22s ease-out both; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          lang={lang}
          onClose={closeModal}
          onAdd={() => addToCart(selectedItem)}
        />
      )}
      {cartOpen && (
        <CartDrawer
          cart={cart}
          lang={lang}
          tableId={tableId}
          onQty={adjustQty}
          onClose={() => setCartOpen(false)}
          lastOrder={lastOrder}
          onOrderPlaced={(o) => { writeLastOrder(o); setLastOrder(o); setCart(new Map()); }}
          onClearLastOrder={() => { clearLastOrder(); setLastOrder(null); }}
          onOpenReview={() => { setCartOpen(false); setTimeout(() => setReviewOpen(true), 400); }}
        />
      )}

      {/* Header */}
      <header className="relative sticky top-0 z-20 border-b border-border/40 backdrop-blur-xl bg-background/95">
        <div className="relative w-full overflow-hidden">
          <img src="/restaurant-bg-clean.jpg" alt={bundle.settings.restaurantName} className="w-full block"
            style={{ height: "170px", objectFit: "cover", objectPosition: "center" }} />
          <div
            className="absolute inset-0 flex items-center justify-center text-center pointer-events-none"
            style={{ background: "linear-gradient(180deg, rgba(14,7,3,0.18), rgba(14,7,3,0.42))" }}
          >
            <div style={{ transform: "translateY(-4px)", padding: "0 24px" }}>
              {bundle.settings.logo && (
                <img
                  src={bundle.settings.logo}
                  alt=""
                  className="mx-auto"
                  style={{ maxWidth: 76, maxHeight: 34, objectFit: "contain", marginBottom: 8 }}
                />
              )}
              <div
                aria-hidden="true"
                style={{ height: 1, width: 52, background: "rgba(229,205,159,0.75)", margin: "0 auto 10px" }}
              />
              <h1
                className="text-white uppercase"
                style={{
                  margin: 0,
                  fontFamily: "Georgia, serif",
                  fontSize: "clamp(20px, 6vw, 30px)",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  lineHeight: 1.15,
                  textShadow: "0 2px 12px rgba(0,0,0,0.75)",
                }}
              >
                {bundle.settings.restaurantName}
              </h1>
              <div
                aria-hidden="true"
                style={{ height: 1, width: 52, background: "rgba(229,205,159,0.75)", margin: "10px auto 0" }}
              />
            </div>
          </div>
          <div className="absolute top-0 right-0 z-10 pointer-events-none"
            style={{ width: "220px", height: "60px", background: "radial-gradient(ellipse at 100% 0%, rgba(14,7,3,0.97) 0%, rgba(14,7,3,0.85) 28%, rgba(14,7,3,0.45) 55%, transparent 80%)" }} />
        </div>
        {/* Language selector — outside overflow-hidden so dropdown never clips */}
        <div className="absolute top-2 right-2 z-50">
          <button
            onClick={() => setLangMenuOpen(o => !o)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-xs font-bold text-white transition-colors backdrop-blur-sm whitespace-nowrap"
          >
            <span className="text-base leading-none">🇪🇹</span>
            <span>{lang === "en" ? "EN" : lang === "am" ? "አማ" : "OM"}</span>
            <span className="text-white/60 text-[10px]">▾</span>
          </button>
          {langMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setLangMenuOpen(false)} />
              <div className="absolute top-10 right-0 z-50 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden w-40 py-1">
                {([
                  { code: "en" as Lang, flag: "🇬🇧", label: "English" },
                  { code: "am" as Lang, flag: "🇪🇹", label: "አማርኛ" },
                  { code: "om" as Lang, flag: "🇪🇹", label: "Afaan Oromoo" },
                ]).map(({ code, flag, label }) => (
                  <button key={code}
                    onClick={() => { setLang(code); setLangMenuOpen(false); try { localStorage.setItem("menu_lang", code); } catch {} }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors",
                      lang === code ? "bg-primary/10 text-primary font-semibold" : "text-slate-700 hover:bg-slate-50"
                    )}>
                    <span className="text-base">{flag}</span>
                    <span className="flex-1 text-left">{label}</span>
                    {lang === code && <span className="text-primary text-xs font-bold">✓</span>}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto py-2 px-3 sm:px-5 no-scrollbar snap-x bg-background">
          {allTabs.map(category => {
            const isActive = activeCategory === category.id;
            return (
              <button key={category.id} onClick={() => { setActiveCategory(category.id); setSearchQuery(""); }}
                className={cn(
                  "snap-start px-4 py-1.5 rounded-full text-sm sm:text-base font-semibold transition-colors duration-150 flex-shrink-0",
                  isActive ? "bg-primary text-white shadow-md shadow-primary/30" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}>
                {gl(category.name)}
              </button>
            );
          })}
        </div>

        {/* Search + filter */}
        <div className="px-3 min-[400px]:px-4 sm:px-5 pb-3 bg-background">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 flex items-center">
              <Search className="absolute left-3.5 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input ref={searchRef} type="search" value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t("searchPlaceholder", lang)}
                className="w-full bg-secondary/60 border border-border/50 rounded-full pl-9 pr-9 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all" />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(""); searchRef.current?.focus(); }}
                  className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="relative flex-shrink-0">
              <button onClick={() => setFilterOpen(o => !o)}
                className={cn(
                  "relative flex items-center justify-center w-10 h-10 rounded-full border transition-all",
                  isFiltered ? "bg-primary text-white border-primary shadow-md shadow-primary/30" : "bg-secondary/60 text-muted-foreground border-border/50 hover:text-foreground hover:bg-secondary"
                )}>
                <SlidersHorizontal className="w-4 h-4" />
              </button>
              {filterOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setFilterOpen(false)} />
                  <div className="absolute right-0 top-12 z-50 bg-card border border-border/60 rounded-2xl shadow-xl overflow-hidden w-52 py-1.5">
                    <p className="px-4 pt-1 pb-2 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                      {lang === "en" ? "Sort by price" : lang === "am" ? "በዋጋ ደርድር" : "Gatiin Tartiibsi"}
                    </p>
                    {SORT_OPTIONS.map(opt => (
                      <button key={opt.key} onClick={() => { setSortOrder(opt.key); setFilterOpen(false); }}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                          sortOrder === opt.key ? "bg-primary/10 text-primary font-semibold" : "text-foreground hover:bg-secondary/60"
                        )}>
                        <span className={sortOrder === opt.key ? "text-primary" : "text-muted-foreground"}>{opt.icon}</span>
                        {lang === "en" ? opt.labelEn : lang === "am" ? opt.labelAm : opt.labelOm}
                        {sortOrder === opt.key && <span className="ml-auto text-primary text-xs font-bold">✓</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Grid */}
      <main className="flex-1 px-3 min-[400px]:px-4 sm:px-5 py-4 sm:py-5 overflow-y-auto pb-28 bg-[#F8F5F2]">
        {filteredItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
              <Search className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground text-base">{t("noResults", lang)}</p>
            <p className="text-sm text-muted-foreground">{t("noResultsSub", lang)}</p>
            <button onClick={() => setSearchQuery("")}
              className="mt-1 px-5 py-2 rounded-full bg-primary text-white text-sm font-semibold shadow-sm shadow-primary/30 active:scale-95 transition-transform">
              <X className="inline w-3.5 h-3.5 mr-1.5 -mt-0.5" />
              {lang === "en" ? "Clear search" : lang === "am" ? "ፍለጋ አጽዳ" : "Barbaaduu Haqi"}
            </button>
          </div>
        )}
        <div className="grid grid-cols-2 min-[560px]:grid-cols-3 gap-3 min-[400px]:gap-4 sm:gap-5 items-stretch">
          {filteredItems.map((item, index) => {
            const inCart = cart.get(item.id);
            return (
              <div key={item.id} onClick={() => setSelectedItem(item)}
                role="button" tabIndex={0}
                className="menu-card flex flex-col bg-card rounded-2xl overflow-hidden shadow-sm border border-border/40 text-left h-full relative cursor-pointer"
                style={{ animationDelay: `${Math.min(index, 5) * 40}ms` }}>
                <div className="relative overflow-hidden bg-muted w-full flex-shrink-0" style={{ paddingBottom: "88%" }}>
                  <FoodImage
                    src={item.image}
                    alt={gl(item.name)}
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ objectPosition: "center 35%", filter: "brightness(1.06) saturate(1.10)", transform: "scale(1.04)" }}
                    loading={index < 6 ? "eager" : "lazy"}
                  />
                  {inCart && (
                    <div className="absolute top-2 right-2 bg-[#C1440E] text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                      {inCart.qty}
                    </div>
                  )}
                </div>
                <div className="px-3 pt-2.5 pb-3 flex flex-col flex-1 gap-1">
                  <h3 className="font-serif font-bold text-foreground leading-tight text-[0.85rem] min-[400px]:text-[0.92rem] line-clamp-2">{gl(item.name)}</h3>
                  <p className="text-[11px] min-[400px]:text-[12px] text-muted-foreground leading-snug line-clamp-2 flex-1">{gl(item.description)}</p>
                  <div className="flex items-center justify-between mt-auto pt-1.5">
                    <span className="font-bold text-primary text-[0.88rem] min-[400px]:text-[0.95rem]">{item.price} ETB</span>
                    <button
                      onClick={e => { e.stopPropagation(); addToCart(item); }}
                      className="w-10 h-10 rounded-full bg-[#C1440E] text-white flex items-center justify-center shadow-md active:scale-90 transition-transform touch-manipulation flex-shrink-0"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </main>

      {/* Review Modal */}
      <ReviewModal open={reviewOpen} onClose={() => setReviewOpen(false)} tableId={tableId} lang={lang} />

      {/* Bottom bar */}
      <div className="fixed bottom-0 right-0 z-30 p-4 flex flex-col items-end gap-3"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>

        {/* Cart button — always visible */}
        <button
          onClick={() => setCartOpen(true)}
          className={cn(
            "flex items-center gap-2 px-4 py-3 rounded-2xl font-bold shadow-xl active:scale-95 transition-all",
            cartCount > 0
              ? "bg-[#1B2A4A] text-white shadow-[#1B2A4A]/30"
              : lastOrder
                ? "bg-[#1B2A4A]/80 text-white shadow-[#1B2A4A]/20"
                : "bg-white/90 text-[#1B2A4A] shadow-stone-200/60 border border-stone-200"
          )}
        >
          <ShoppingCart className="w-4 h-4 flex-shrink-0" />
          <span className="text-xs tracking-wide uppercase whitespace-nowrap">{t("myOrder", lang)}</span>
          {cartCount > 0 ? (
            <span className="bg-[#C1440E] text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">{cartCount}</span>
          ) : lastOrder ? (
            <span className="bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 flex items-center gap-0.5">
              <CheckCircle className="w-2.5 h-2.5" />
            </span>
          ) : null}
        </button>

        {/* Waiter call button */}
        {waiterCalled ? (
          <div className="relative flex items-center gap-2 bg-green-500 text-white px-4 py-3 rounded-2xl font-bold shadow-lg shadow-green-500/30 overflow-hidden"
            style={{ animation: "cardFadeIn 0.18s ease-out" }}>
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-xs tracking-wide uppercase">{t("waiterComing", lang)}</span>
            <div className="absolute bottom-0 left-0 h-0.5 bg-white/40 rounded-b-2xl"
              style={{ width: "100%", animation: "shrinkBar 4s linear forwards" }} />
          </div>
        ) : (
          <button
            onClick={() => callWaiter.mutate()}
            disabled={callWaiter.isPending}
            className="flex items-center gap-1.5 sm:gap-2 bg-[#C1440E] text-white px-3 py-2 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl font-bold shadow-lg shadow-[#C1440E]/40 active:scale-95 transition-transform disabled:opacity-60"
          >
            <Bell className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0", callWaiter.isPending && "animate-bounce")} />
            <span className="text-[11px] sm:text-xs tracking-wide uppercase whitespace-nowrap">
              {callWaiter.isPending ? t("calling", lang) : t("callWaiter", lang)}
            </span>
          </button>
        )}
      </div>
      <style>{`
        @keyframes shrinkBar { from { width: 100%; } to { width: 0%; } }
      `}</style>
    </div>
  );
}
