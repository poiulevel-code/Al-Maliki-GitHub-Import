import React, { useState, useRef, useEffect, useCallback } from "react";
import { useClerk } from "@clerk/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, CheckCircle, AlertCircle, Wifi, RefreshCw, Volume2, VolumeX,
  Globe, LogOut, ClipboardList, ChefHat, Package, Truck, Trash2, ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type WLang = "en" | "am" | "om";

const W: Record<string, Record<WLang, string>> = {
  title:         { en: "Waiter Panel",              am: "አስተናጋጅ ፓነል",              om: "Panala Qoree Bitaa"        },
  calls:         { en: "Calls",                     am: "ጥሪዎች",                   om: "Waamicha"                  },
  orders:        { en: "Orders",                    am: "ትዕዛዞች",                  om: "Ajajawwan"                 },
  active:        { en: "active",                    am: "ንቁ",                      om: "socho'aa"                  },
  noCalls:       { en: "No pending calls",          am: "ምንም ጥሪ የለም",              om: "Waamicha hin jiru"         },
  noCallsSub:    { en: "Table calls appear here",   am: "የጠረጴዛ ጥሪዎች እዚህ ይታያሉ",  om: "Waamichwaan asitti mul'ata" },
  noOrders:      { en: "No active orders",          am: "ምንም ትዕዛዝ የለም",           om: "Ajajni socho'aa hin jiru"  },
  noOrdersSub:   { en: "New orders appear here",    am: "አዲስ ትዕዛዞች እዚህ ይታያሉ",   om: "Ajajawwan haaraa asitti mul'ata" },
  table:         { en: "Table",                     am: "ጠረጴዛ",                    om: "Teessuma"                  },
  calling:       { en: "Calling",                   am: "እየጠሩ",                    om: "Waamaa jira"               },
  calledTimes:   { en: "×",                        am: "ጊዜ",                      om: "×"                         },
  arrived:       { en: "Arrived ✓",                am: "ደረስኩ ✓",                  om: "Dhufne ✓"                  },
  logout:        { en: "Logout",                    am: "ውጣ",                      om: "Ba'i"                      },
  statusPending:   { en: "🟡 New Order",             am: "🟡 አዲስ ትዕዛዝ",             om: "🟡 Ajaja Haaraa"            },
  statusPreparing: { en: "👨‍🍳 Preparing",            am: "👨‍🍳 እየተዘጋጀ",                om: "👨‍🍳 Qophaa'aa jira"          },
  statusReady:     { en: "🚚 On the way",            am: "🚚 በመንገድ ላይ",             om: "🚚 Karaa jira"              },
  statusDelivered: { en: "✅ Delivered",             am: "✅ ተሰጥቷል",                om: "✅ Kennameera"              },
  statusCancelled: { en: "❌ Cancelled",             am: "❌ ተሰርዟል",                om: "❌ Haqameera"               },
  markPreparing: { en: "👨‍🍳 Start Preparing",        am: "👨‍🍳 ወደ ዝግጅት ቀይር",          om: "👨‍🍳 Qopheessuu Jalqabi"     },
  markReady:     { en: "🚚 Mark On the way",         am: "🚚 ወደ መንገድ ቀይር",           om: "🚚 Karaa Olkaa'i"           },
  markDelivered: { en: "✅ Mark Delivered",          am: "✅ አስረክቡ",                 om: "✅ Kenniif"                 },
  cancelOrder:   { en: "❌ Cancel",                  am: "❌ ሰርዝ",                   om: "❌ Haquu"                   },
  note:          { en: "Note",                      am: "ማስታወሻ",                  om: "Yaadaannoo"                },
  totalPrice:    { en: "Total",                     am: "ጠቅላላ",                   om: "Walii Gala"                },
  item:          { en: "item",                      am: "እቃ",                       om: "meeshaa"                   },
  items:         { en: "items",                     am: "እቃዎች",                    om: "meeshaalee"                },
  minute:        { en: "min",                       am: "ደቂቃ",                     om: "daqiiqaa"                  },
  justNow:       { en: "just now",                  am: "አሁን",                      om: "amma"                      },
  completed:     { en: "completed",                 am: "ተጠናቋል",                  om: "xumurame"                  },
  tableUnavailable: { en: "Table unavailable",      am: "ጠረጴዛው አይገኝም",            om: "Teessumni hin jiru"        },
};
const wt = (key: string, lang: WLang) => W[key]?.[lang] ?? key;

type OrderStatus = "pending" | "preparing" | "ready" | "delivered" | "cancelled";
interface LangMap { en: string; am: string; om?: string; }
interface OrderItem { menuItemId: string; name: LangMap; price: number; quantity: number; }
interface Order {
  id: string; tableId: string; tableNumber: number;
  items: OrderItem[]; status: OrderStatus; createdAt: number; note?: string;
}

const STATUS_CONFIG: Record<OrderStatus, { color: string; bg: string; border: string; accent: string; icon: React.ReactNode }> = {
  pending:   { color: "text-amber-700",  bg: "bg-amber-50",   border: "border-amber-200",  accent: "#f59e0b", icon: <Bell className="w-3.5 h-3.5" />      },
  preparing: { color: "text-blue-700",   bg: "bg-blue-50",    border: "border-blue-200",   accent: "#3b82f6", icon: <ChefHat className="w-3.5 h-3.5" />   },
  ready:     { color: "text-green-700",  bg: "bg-green-50",   border: "border-green-200",  accent: "#22c55e", icon: <Truck className="w-3.5 h-3.5" />     },
  delivered: { color: "text-slate-500",  bg: "bg-slate-50",   border: "border-slate-200",  accent: "#94a3b8", icon: <Package className="w-3.5 h-3.5" />   },
  cancelled: { color: "text-red-600",    bg: "bg-red-50",     border: "border-red-200",    accent: "#ef4444", icon: <AlertCircle className="w-3.5 h-3.5" />},
};


const API_BASE = "/api";
const staffFetch = (url: string, options: RequestInit = {}) =>
  fetch(url, { ...options, credentials: "same-origin" });

function useNotificationSound() {
  const ctx = useRef<AudioContext | null>(null);
  const getCtx = useCallback(() => {
    if (!ctx.current || ctx.current.state === "closed") ctx.current = new AudioContext();
    if (ctx.current.state === "suspended") ctx.current.resume();
    return ctx.current;
  }, []);
  const playCall = useCallback(() => {
    try {
      const ac = getCtx();
      const playTone = (freq: number, startTime: number, dur: number) => {
        const osc = ac.createOscillator(); const gain = ac.createGain();
        osc.connect(gain); gain.connect(ac.destination); osc.type = "sine";
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.4, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);
        osc.start(startTime); osc.stop(startTime + dur);
      };
      const t = ac.currentTime;
      playTone(880, t, 0.25); playTone(1100, t + 0.28, 0.25); playTone(880, t + 0.56, 0.35);
    } catch {}
    try { if ("vibrate" in navigator) navigator.vibrate([300, 100, 300, 100, 500]); } catch {}
  }, [getCtx]);
  return { playCall };
}

export default function WaiterPage() {
  const { signOut } = useClerk();
  const [lang, setLang]         = useState<WLang>(() => {
    try { const s = localStorage.getItem("staff_lang") as WLang; return (s === "en" || s === "am" || s === "om") ? s : "en"; } catch { return "en"; }
  });
  const changeLang = (l: WLang) => {
    setLang(l); try { localStorage.setItem("staff_lang", l); } catch {}
  };
  return (
    <WaiterDashboard
      lang={lang}
      setLang={changeLang}
      onLogout={async () => { await signOut(); }}
    />
  );
}

function WaiterDashboard({ lang, setLang, onLogout }: { lang: WLang; setLang: (l: WLang) => void; onLogout: () => void }) {
  const queryClient = useQueryClient();
  const [muted, setMuted] = useState(false);
  const [activeTab, setActiveTab] = useState<"calls" | "orders">("calls");
  const [langOpen, setLangOpen] = useState(false);
  const { playCall } = useNotificationSound();
  const prevTotalCount = useRef<number | null>(null);
  const prevOrderCount = useRef<number | null>(null);

  const { data: calls = [], isFetching } = useQuery({
    queryKey: ["waiter-calls"],
    queryFn: async () => { const r = await staffFetch(`${API_BASE}/waiter-calls`, { cache: "no-store" }); return r.ok ? r.json() : []; },
    staleTime: 0,
    refetchInterval: 4_000,
  });
  const { data: tables = [] } = useQuery({
    queryKey: ["waiter-tables"],
    queryFn: async () => { const r = await staffFetch(`${API_BASE}/tables`, { cache: "no-store" }); return r.ok ? r.json() : []; },
    staleTime: 5 * 60_000,
  });
  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ["waiter-orders"],
    queryFn: async () => { const r = await staffFetch(`${API_BASE}/orders?includeRecentDelivered=1`, { cache: "no-store" }); return r.ok ? r.json() : []; },
    staleTime: 0,
    refetchInterval: 4_000,
  });

  const tableMap = new Map((tables as any[]).map((t: any) => [t.id, t]));
  const callCount = (calls as any[]).length;
  const totalCount = (calls as any[]).reduce((s: number, c: any) => s + (c.count || 1), 0);
  const activeOrders = orders.filter(o => o.status !== "delivered" && o.status !== "cancelled");

  useEffect(() => {
    if (prevTotalCount.current !== null && totalCount > prevTotalCount.current && !muted) playCall();
    prevTotalCount.current = totalCount;
  }, [totalCount, muted, playCall]);

  useEffect(() => {
    if (prevOrderCount.current !== null && orders.length > prevOrderCount.current && !muted) playCall();
    prevOrderCount.current = orders.length;
  }, [orders.length, muted, playCall]);

  const clearCall = useMutation({
    mutationFn: async (tableId: string) => staffFetch(`${API_BASE}/waiter-calls/${tableId}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["waiter-calls"] })
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      const r = await staffFetch(`${API_BASE}/orders/${id}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      return r.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["waiter-orders"] })
  });

  const deleteOrder = useMutation({
    mutationFn: async (id: string) => staffFetch(`${API_BASE}/orders/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["waiter-orders"] })
  });

  const nextStatus: Record<OrderStatus, OrderStatus | null> = {
    pending: "preparing", preparing: "ready", ready: "delivered", delivered: null, cancelled: null,
  };
  const nextLabel: Record<OrderStatus, string> = {
    pending: wt("markPreparing", lang), preparing: wt("markReady", lang),
    ready: wt("markDelivered", lang), delivered: "", cancelled: "",
  };

  return (
    <div className="h-[100dvh] bg-[#F4F6FA] flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="bg-[#1B2A4A] sticky top-0 z-20 flex-shrink-0"
        style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="flex items-center px-3 sm:px-5 h-12">
          <div className="flex items-center gap-2 flex-1">
            <Bell className="w-4 h-4 text-white" />
            <span className="text-white font-semibold text-sm">{wt("title", lang)}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="hidden sm:flex items-center gap-1 text-white/30 px-2">
              <span className={cn("w-1.5 h-1.5 rounded-full", isFetching ? "bg-amber-400 animate-pulse" : "bg-green-400")} />
              <Wifi className="w-3 h-3" />
            </div>
            {/* Header lang dropdown */}
            <div className="relative">
              <button onClick={() => setLangOpen(o => !o)}
                className="flex items-center gap-1 text-white/40 hover:text-white p-2.5 rounded-xl text-xs font-bold touch-manipulation">
                <Globe className="w-3.5 h-3.5" />
                {lang === "en" ? "EN" : lang === "am" ? "AM" : "OM"}
                <ChevronDown className="w-3 h-3" />
              </button>
              <AnimatePresence>
                {langOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setLangOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-1 bg-white border border-stone-200 rounded-xl shadow-xl overflow-hidden min-w-[120px] z-40"
                    >
                      {([["en", "🇬🇧", "English"], ["am", "🇪🇹", "አማርኛ"], ["om", "🇪🇹", "Oromiffa"]] as const).map(([l, flag, label]) => (
                        <button key={l} onClick={() => { setLang(l); setLangOpen(false); }}
                          className={cn("w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold hover:bg-stone-50 transition-colors text-left",
                            lang === l ? "text-[#1B2A4A] bg-stone-50" : "text-stone-600")}>
                          <span>{flag}</span>{label}
                          {lang === l && <CheckCircle className="w-3 h-3 ml-auto text-[#1B2A4A]" />}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            <button onClick={() => setMuted(m => !m)}
              className={cn("p-2.5 rounded-xl touch-manipulation", muted ? "text-red-400" : "text-white/40 hover:text-white")}>
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button onClick={() => { queryClient.invalidateQueries(); }}
              className="text-white/40 hover:text-white p-2.5 rounded-xl touch-manipulation">
              <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} />
            </button>
            <button onClick={onLogout} className="flex items-center gap-1.5 text-white/40 hover:text-white py-3 px-2.5 touch-manipulation">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-t border-white/10">
          {(["calls", "orders"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-colors",
                activeTab === tab ? "text-white border-b-2 border-[#C1440E]" : "text-white/40 hover:text-white/70"
              )}>
              {tab === "calls" ? <Bell className="w-3.5 h-3.5" /> : <ClipboardList className="w-3.5 h-3.5" />}
              {wt(tab, lang)}
              {tab === "calls" && callCount > 0 && (
                <span className="bg-[#C1440E] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                  {callCount}
                </span>
              )}
              {tab === "orders" && activeOrders.length > 0 && (
                <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                  {activeOrders.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto overscroll-contain"
        style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
        <div className="p-3 sm:p-5 max-w-6xl mx-auto space-y-3">

          {/* ── CALLS TAB ── */}
          {activeTab === "calls" && (
            <>
              {callCount === 0 ? (
                <div className="bg-white border border-stone-200 rounded-2xl p-10 sm:p-16 flex flex-col items-center text-center mt-4">
                  <Bell className="w-10 h-10 text-stone-300 mb-4 opacity-50" />
                  <p className="text-stone-600 font-semibold text-sm">{wt("noCalls", lang)}</p>
                  <p className="text-stone-400 text-xs mt-1">{wt("noCallsSub", lang)}</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-1">
                  <AnimatePresence>
                    {(calls as any[]).map((call: any) => {
                      const tbl = tableMap.get(call.tableId);
                      const tableNum = tbl ? tbl.number : "—";
                      const tableLoc = tbl?.location || "";
                      return (
                        <motion.div key={call.tableId}
                          initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }}
                          className="bg-white rounded-2xl border-2 border-amber-300 shadow-sm shadow-amber-100/60 p-4 flex flex-col gap-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-stone-400 text-[9px] font-semibold uppercase tracking-widest">{wt("table", lang)}</p>
                              <p className="text-[#1B2A4A] font-black text-4xl leading-none mt-0.5">{tableNum}</p>
                              {tableLoc && <p className="text-stone-400 text-[10px] mt-0.5 leading-none">{tableLoc}</p>}
                            </div>
                            <div className="flex flex-col items-end gap-1 mt-0.5">
                              <span className="flex items-center gap-1 bg-amber-100 text-amber-700 text-[9px] font-bold px-2 py-1 rounded-full border border-amber-200">
                                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                                {wt("calling", lang)}
                              </span>
                              {(call.count || 1) > 1 && (
                                <span className="bg-[#C1440E] text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                                  {call.count}{wt("calledTimes", lang)}
                                </span>
                              )}
                            </div>
                          </div>
                          <button onClick={() => clearCall.mutate(call.tableId)}
                            className="w-full flex items-center justify-center gap-2 bg-[#1B2A4A] hover:bg-[#243760] text-white font-bold py-3 rounded-xl text-sm transition-colors touch-manipulation">
                            <CheckCircle className="w-4 h-4" />{wt("arrived", lang)}
                          </button>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </>
          )}

          {/* ── ORDERS TAB ── */}
          {activeTab === "orders" && (() => {
            const avgMins = activeOrders.length > 0
              ? Math.round(activeOrders.reduce((s, o) => s + (Date.now() - o.createdAt) / 60000, 0) / activeOrders.length)
              : 0;

            const KANBAN_COLS: { status: OrderStatus; dot: string }[] = [
              { status: "pending",   dot: "#185fa5" },
              { status: "preparing", dot: "#854f0b" },
              { status: "ready",     dot: "#3b6d11" },
              { status: "delivered", dot: "#888780" },
            ];

            const colLabel = (s: OrderStatus): string => {
              if (s === "pending")   return lang === "en" ? "New"       : lang === "am" ? "አዲስ"    : "Haaraa";
              if (s === "preparing") return lang === "en" ? "Preparing" : lang === "am" ? "እየተዘጋጀ ነው"   : "Qophaa'aa jira";
              if (s === "ready")     return lang === "en" ? "Ready"     : lang === "am" ? "ዝግጁ ነው"    : "Qophee";
              return                        lang === "en" ? "Delivered" : lang === "am" ? "ተሰጥቷል"  : "Kennameera";
            };

            return (
              <div className="pt-1 space-y-3">

                {/* Stats bar */}
                <div className="flex gap-2">
                  <div className="bg-white border border-stone-200 rounded-xl px-3 py-2 min-w-[92px]">
                    <p className="text-[11px] text-stone-400 mb-0.5 leading-tight">
                      {lang === "en" ? "Active orders" : lang === "am" ? "ንቁ ትዕዛዞች" : "Ajajawwan"}
                    </p>
                    <p className="text-xl font-medium text-[#1B2A4A]">{activeOrders.length}</p>
                  </div>
                  <div className="bg-white border border-stone-200 rounded-xl px-3 py-2 min-w-[92px]">
                    <p className="text-[11px] text-stone-400 mb-0.5 leading-tight">
                      {lang === "en" ? "Avg. time" : lang === "am" ? "አማካይ ጊዜ" : "Avg. time"}
                    </p>
                    <p className="text-xl font-medium text-[#1B2A4A]">{avgMins} {wt("minute", lang)}</p>
                  </div>
                </div>

                {/* Kanban board — horizontal scroll on mobile */}
                <div className="overflow-x-auto -mx-3 sm:-mx-5 px-3 sm:px-5">
                  <div
                    className="grid gap-3 pb-2"
                    style={{ gridTemplateColumns: "repeat(4, minmax(158px, 1fr))", minWidth: "660px" }}
                  >
                    {KANBAN_COLS.map(({ status, dot }) => {
                      const colOrders = orders
                        .filter(o => o.status === status)
                        .sort((a, b) => a.createdAt - b.createdAt);
                      const isDelivered = status === "delivered";

                      // badge inline colours (avoids dynamic Tailwind class generation)
                      const badgeBg  = status === "preparing" ? "#faeeda"
                                     : status === "ready"     ? "#eaf3de"
                                     : status === "pending"   ? "#e6f1fb"
                                     : "transparent";
                      const badgeClr = status === "preparing" ? "#854f0b"
                                     : status === "ready"     ? "#3b6d11"
                                     : status === "pending"   ? "#185fa5"
                                     : "#888780";

                      return (
                        <div key={status} className="flex flex-col">

                          {/* Column header */}
                          <div className="flex items-center gap-1.5 mb-2.5">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: dot }} />
                            <span className="text-[13px] font-semibold text-stone-700 flex-1 truncate">{colLabel(status)}</span>
                            <span className="text-[12px] text-stone-400">{colOrders.length}</span>
                          </div>

                          {/* Cards */}
                          <div className="flex flex-col gap-2 min-h-[40px]">
                            {colOrders.length === 0 ? (
                              <p className="text-xs text-stone-400 py-1 px-1">
                                {lang === "en" ? "Empty" : lang === "am" ? "ባዶ" : "Duwwaa"}
                              </p>
                            ) : (
                              <AnimatePresence initial={false}>
                                {colOrders.map(order => {
                                  const next      = nextStatus[order.status];
                                  const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);
                                  const total     = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
                                  const mins      = Math.floor((Date.now() - order.createdAt) / 60000);
                                  const timeLabel = isDelivered
                                    ? wt("completed", lang)
                                    : mins < 1
                                    ? wt("justNow", lang)
                                    : `${mins} ${wt("minute", lang)}`;
                                  const tableNumber = order.tableNumber ||
                                    (tableMap.get(order.tableId) as { number?: number } | undefined)?.number;

                                  return (
                                    <motion.div
                                      key={order.id}
                                      initial={{ opacity: 0, y: -6 }}
                                      animate={{ opacity: isDelivered ? 0.65 : 1, y: 0 }}
                                      exit={{ opacity: 0, scale: 0.95 }}
                                      className="bg-white rounded-xl border border-stone-200 p-3 shadow-sm"
                                    >
                                      {/* Card title */}
                                      <p className="text-[13px] font-semibold text-[#1B2A4A] mb-0.5 truncate">
                                        {tableNumber
                                          ? `${wt("table", lang)} ${tableNumber}`
                                          : wt("tableUnavailable", lang)}
                                      </p>

                                      {/* Item summary */}
                                      <p className="text-[12px] text-stone-500 mb-2">
                                        {itemCount} {wt(itemCount === 1 ? "item" : "items", lang)} · {total.toLocaleString()} ETB
                                      </p>

                                      <div className="space-y-1 mb-2">
                                        {order.items.map((item, index) => (
                                          <div key={`${order.id}-${item.menuItemId}-${index}`} className="flex justify-between gap-2 text-[11px] text-stone-600">
                                            <span className="min-w-0 truncate">
                                              {item.quantity} × {item.name?.[lang] || item.name?.en || ""}
                                            </span>
                                            <span className="flex-shrink-0">
                                              {(item.price * item.quantity).toLocaleString()} ETB
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                      {order.note && (
                                        <p className="text-[11px] text-stone-600 bg-stone-50 rounded-lg px-2 py-1.5 mb-2 break-words">
                                          <span className="font-semibold">{wt("note", lang)}:</span> {order.note}
                                        </p>
                                      )}

                                      {/* Time badge */}
                                      {!isDelivered && (
                                        <span
                                          className="text-[11px] font-semibold px-2 py-0.5 rounded-full inline-block mb-2"
                                          style={{ background: badgeBg, color: badgeClr }}
                                        >
                                          {timeLabel}
                                        </span>
                                      )}

                                      {/* Footer */}
                                      {isDelivered ? (
                                        <div className="flex items-center justify-between mt-1">
                                          <p className="text-[11px] text-stone-400">✓ {timeLabel}</p>
                                          <button
                                            onClick={() => deleteOrder.mutate(order.id)}
                                            disabled={deleteOrder.isPending}
                                            title={lang === "en" ? "Delete" : lang === "am" ? "ሰርዝ" : "Haquu"}
                                            className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors touch-manipulation disabled:opacity-40"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                            {lang === "en" ? "Delete" : lang === "am" ? "ሰርዝ" : "Haquu"}
                                          </button>
                                        </div>
                                      ) : next ? (
                                        <button
                                          onClick={() => updateStatus.mutate({ id: order.id, status: next })}
                                          disabled={updateStatus.isPending}
                                          className="w-full flex items-center justify-center gap-1 text-[12px] font-semibold py-1.5 rounded-lg text-white transition-opacity touch-manipulation disabled:opacity-50 active:scale-95 mt-0.5"
                                          style={{ backgroundColor: STATUS_CONFIG[next].accent }}
                                        >
                                          {nextLabel[order.status]} →
                                        </button>
                                      ) : null}
                                    </motion.div>
                                  );
                                })}
                              </AnimatePresence>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}

        </div>
      </main>
    </div>
  );
}
