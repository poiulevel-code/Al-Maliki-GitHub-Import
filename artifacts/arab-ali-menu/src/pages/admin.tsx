import React, { useState, useEffect, useMemo } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from "recharts";
import { INITIAL_MENU, INITIAL_CATEGORIES } from "@/lib/initial-data";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useClerk } from "@clerk/react";
import {
  LogOut, UtensilsCrossed, Table2, Layers, Plus, Pencil, Trash2,
  Check, X, Download, LayoutDashboard, Bell,
  Package, AlertCircle,
  Camera, Save, ChevronDown, Search, Eye, EyeOff, Menu as MenuIcon,
  Circle, Shield, TrendingUp, MousePointerClick, DollarSign, Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { QRCodeCanvas } from "qrcode.react";
const API_BASE = "/api";

type Tab = "dashboard" | "menu" | "categories" | "tables" | "reviews" | "settings";
type Lang = "en" | "am" | "om";
type AdminLang = "en" | "am" | "om";

const T: Record<string, Record<AdminLang, string>> = {
  verifying:         { en: "Signing in...",                      am: "እየገባ...",                  om: "Seenaa jira..."                 },
  emailLabel:        { en: "Email",                              am: "ኢሜል",                     om: "Imeelii"                        },
  passwordLabel:     { en: "Password",                           am: "የይለፍ ቃል",                 om: "Jecha Darbii"                   },
  backHome:          { en: "← Back to Home",                    am: "← ወደ ዋና ገጽ",              om: "← Mana Deebi'i"                 },
  logout:            { en: "Logout",                             am: "ውጣ",                       om: "Ba'i"                           },
  dashboard:         { en: "Dashboard",                          am: "ዳሽቦርድ",                   om: "Daashboordii"                   },
  menuMgmt:          { en: "Menu Management",                    am: "ሜኑ አስተዳደር",               om: "Toannaa Menu"                    },
  categories:        { en: "Categories",                         am: "ምድቦች",                    om: "Kategori"                       },
  tableMgmt:         { en: "Table Management",                   am: "ጠረጴዛ አስተዳደር",             om: "Toannaa Xarabbezoota"            },
  menuShort:         { en: "Menu",                               am: "ሜኑ",                      om: "Menu"                           },
  tablesShort:       { en: "Tables",                             am: "ጠረጴዛዎች",                 om: "Xarabbezota"                    },
  totalItems:        { en: "Total Items",                        am: "ጠቅላላ ምርቶች",              om: "Walii Gala Menu Dha"             },
  occupiedTbl:       { en: "Occupied Tables",                    am: "ተያዙ ጠረጴዛዎች",              om: "Xarabbeaza Guuteme"              },
  quickActions:      { en: "Quick Actions",                      am: "ፈጣን ድርጊቶች",              om: "Tarkaanfiiwwan Hatattamaa"        },
  addMenuItem:       { en: "Add Menu Item",                      am: "ሜኑ ምርት ጨምር",             om: "Menu Dabali"                     },
  addTable:          { en: "Add Table",                          am: "ጠረጴዛ ጨምር",               om: "Xarabezza Dabali"                },
  all:               { en: "All",                                am: "ሁሉም",                     om: "Hunda"                          },
  hidden:            { en: "Hidden",                             am: "የተደበቀ",                   om: "Dhokate"                        },
  searchItems:       { en: "Search items…",                      am: "ምርቶች ፈልግ…",               om: "Wantoota barbaadi…"              },
  addItem:           { en: "Add Item",                           am: "ምርት ጨምር",                om: "Wanta Dabaluu"                  },
  add:               { en: "Add",                                am: "ጨምር",                     om: "Dabaluu"                        },
  noItems:           { en: "No items found",                     am: "ምንም ምርት አልተገኘም",         om: "Wanti argame hin jiru"           },
  noDesc:            { en: "No description",                     am: "መግለጫ የለም",               om: "Ibsa hin jiru"                  },
  show:              { en: "Show",                               am: "አሳይ",                     om: "Mul'isi"                        },
  hide:              { en: "Hide",                               am: "ደብቅ",                     om: "Dhoki"                          },
  edit:              { en: "Edit",                               am: "አርትዕ",                   om: "Gulaali"                        },
  delete:            { en: "Delete",                             am: "ሰርዝ",                    om: "Haqi"                           },
  editItem:          { en: "Edit Item",                          am: "ምርት አርትዕ",               om: "Wanta Gulaali"                  },
  newItem:           { en: "New Item",                           am: "አዲስ ምርት",               om: "Wanta Haaraa"                   },
  photo:             { en: "Photo",                              am: "ፎቶ",                     om: "Fakkii"                         },
  uploading:         { en: "Uploading…",                         am: "እየጫነ...",                 om: "Fe'aa jira…"                    },
  selectPhoto:       { en: "Select photo",                       am: "ፎቶ ምረጥ",                om: "Fakkii Filadhu"                  },
  uploadFailed:      { en: "Upload failed. Try again.",          am: "ጭነት አልተሳካም። እንደገና ሞክር።", om: "Fe'uun hin milkoofne. Irra deebi'i." },
  orPasteUrl:        { en: "or paste URL…",                      am: "ወይም URL ለጥፍ…",           om: "ykn URL maxxansi…"               },
  price:             { en: "Price (Br)",                         am: "ዋጋ (Br)",                om: "Gatii (Br)"                     },
  category:          { en: "Category",                           am: "ምድብ",                    om: "Kutaa"                          },
  nameDesc:          { en: "Name & Description",                 am: "ስም እና መግለጫ",             om: "Maqaa fi Ibsa"                  },
  itemName:          { en: "ITEM NAME",                          am: "የምርት ስም",               om: "MAQAA WANTAA"                   },
  description:       { en: "DESCRIPTION",                        am: "መግለጫ",                  om: "IBSA"                           },
  requiredField:     { en: "Required field…",                    am: "አስፈላጊ መስክ…",             om: "Dirree barbaachisaa…"            },
  cancel:            { en: "Cancel",                             am: "ሰርዝ",                    om: "Dhiisi"                         },
  saving:            { en: "Saving...",                          am: "እያስቀምጡ...",              om: "Olkaa'aa jira..."               },
  save:              { en: "Save",                               am: "አስቀምጥ",                 om: "Olkaa'i"                        },
  changePhoto:       { en: "Change",                             am: "ቀይር",                   om: "Jijjiiri"                       },
  noCats:            { en: "No categories yet",                  am: "ምንም ምድብ የለም",           om: "Kutaa hin jiru"                 },
  addFirstCat:       { en: "+ Add first category",              am: "+ የመጀመሪያ ምድብ ጨምር",      om: "+ Kutaa jalqabaa dabaluu"        },
  addCat:            { en: "Add Category",                       am: "ምድብ ጨምር",               om: "Kutaa Dabaluu"                  },
  editCatTitle:      { en: "Edit Category",                      am: "ምድብ አርትዕ",              om: "Kutaa Gulaali"                  },
  newCat:            { en: "New Category",                       am: "አዲስ ምድብ",              om: "Kutaa Haaraa"                   },
  tableCount:        { en: "tables registered",                  am: "ጠረጴዛዎች ተመዝግቧል",        om: "xarabbezota galmeeffame"         },
  newTable:          { en: "New Table",                          am: "አዲስ ጠረጴዛ",             om: "Xarabbeza Haaraa"               },
  location:          { en: "Location",                           am: "ቦታ",                    om: "Bakka"                          },
  optional:          { en: "(optional)",                         am: "(አማራጭ)",               om: "(dirqama miti)"                 },
  locPlaceholder:    { en: "E.g: Garden, Window, Indoor...",     am: "ምሳሌ: አትክልት፣ መስኮት፣ ውስጥ...", om: "Fkn: Biqiltuu, Foddaa, Keessaa..." },
  adding:            { en: "Adding...",                          am: "እየጨመረ...",               om: "Dabalachaa jira..."             },
  noTables:          { en: "No tables yet",                      am: "ምንም ጠረጴዛ የለም",         om: "Xarabbeza hin jiru"             },
  noTablesSub:       { en: "Click \"Add Table\" above",          am: "ላይ ያለውን \"ጠረጴዛ ጨምር\" ይጫኑ", om: "Olitti \"Xarabbeza Dabaluu\" tuqi" },
  table:             { en: "Table",                              am: "ጠረጴዛ",                  om: "Xarabbeza"                      },
  downloadQr:        { en: "Download QR",                        am: "QR አውርድ",               om: "QR Buusi"                       },
  stAvailable:       { en: "Available",                          am: "ነጻ",                    om: "Bilisa"                         },
  stOccupied:        { en: "Occupied",                           am: "ተያዟል",                  om: "Guutameera"                     },
  stReserved:        { en: "Reserved",                           am: "ተጠብቋል",                 om: "Qabamee jira"                   },
  confirmDelItem:    { en: "Delete this item?",                  am: "ይህን ምርት ሰርዝ?",          om: "Wanta kana haquu?"              },
  confirmDelCat:     { en: "Delete this category?",              am: "ይህን ምድብ ሰርዝ?",          om: "Kutaa kana haquu?"              },
  confirmDelTable:   { en: "Delete this table?",                 am: "ይህን ጠረጴዛ ሰርዝ?"         , om: "Xarabbeza kana haquu?"          },
  catLabel:          { en: "Categories",                         am: "ምድቦች",                  om: "Kategori"                       },
  catCountLabel:     { en: "categories",                         am: "ምድቦች",                  om: "kategori"                       },
  settings:          { en: "Settings",                           am: "ቅንብሮች",                 om: "Qindaa'ina"                     },
  changing:          { en: "Saving…",                            am: "እያስቀምጡ...",              om: "Olkaa'aa jira…"                 },
  logoSection:       { en: "Restaurant Logo",                    am: "የሬስቶራንት አርማ",            om: "Mallattoo Mana Nyaataa"          },
  logoDesc:          { en: "Shown in the menu header on every table",am: "በሁሉም ጠረጴዛ ሜኑ ርዕስ ላይ ይታያል", om: "Mata-duree nyaataa teessuma hundatti mul'ata" },
  uploadLogo:        { en: "Upload Logo",                        am: "አርማ ጫን",                om: "Mallattoo Fe'i"                 },
  changeLogo:        { en: "Change Logo",                        am: "አርማ ቀይር",               om: "Mallattoo Jijjiiri"             },
  removeLogo:        { en: "Remove Logo",                        am: "አርማ አስወግድ",             om: "Mallattoo Haqi"                 },
  logoUpdated:       { en: "Logo updated!",                      am: "አርማ ተቀይሯል!",            om: "Mallattoon haaromfame!"         },
  logoRemoved:       { en: "Logo removed.",                      am: "አርማ ተወግዷል።",            om: "Mallattoon haqame."             },
  logoFailed:        { en: "Upload failed. Try again.",          am: "ጭነት አልተሳካም። እንደገና ሞክር።", om: "Fe'uun hin milkoofne. Irra deebi'i." },
  noLogo:            { en: "No logo set",                        am: "አርማ አልተቀናጀም",           om: "Mallattoo hin qabamu"           },
  restaurantName:    { en: "Restaurant Name",                    am: "የሬስቶራንት ስም",               om: "Maqaa Mana Nyaataa"              },
  restaurantNameDesc:{ en: "This name appears on the staff entry screen and customer menu.", am: "ይህ ስም በሰራተኞች መግቢያ እና በደንበኞች ሜኑ ላይ ይታያል።", om: "Maqaan kun fuula seensa hojjettootaa fi menu maamilaa irratti mul'ata." },
  restaurantNamePlaceholder: { en: "Enter restaurant name", am: "የሬስቶራንቱን ስም ያስገቡ", om: "Maqaa mana nyaataa galchi" },
  restaurantNameSaved: { en: "Restaurant name updated!", am: "የሬስቶራንቱ ስም ተዘምኗል!", om: "Maqaan mana nyaataa haaromfameera!" },
  restaurantNameRequired: { en: "Please enter a restaurant name.", am: "እባክዎ የሬስቶራንቱን ስም ያስገቡ።", om: "Maaloo maqaa mana nyaataa galchi." },
  reviews:           { en: "Reviews",                            am: "አስተያየቶች",                om: "Yaadawwan"                      },
  reviewsMgmt:       { en: "Customer Reviews",                   am: "የደንበኛ አስተያየቶች",          om: "Yadawwan Mammiloota"            },
  totalReviews:      { en: "reviews",                            am: "አስተያየቶች",                om: "yaadawwan"                      },
  avgRating:         { en: "Avg Rating",                         am: "አማካይ ደረጃ",              om: "Sadarkaa Giddu-galeessaa"        },
  noReviews:         { en: "No reviews yet",                     am: "ምንም አስተያየት የለም",        om: "Yaada hin jiru"                 },
  noReviewsSub:      { en: "Customer reviews will appear here",  am: "የደንበኛ አስተያየቶች እዚህ ይታያሉ", om: "Yaadawwan maamilaa asitti mul'atu" },
  deleteReview:      { en: "Delete review",                      am: "አስተያየት ሰርዝ",            om: "Yaada Haqi"                     },
};

interface LangMap { en: string; am: string; om?: string; }
interface MenuItem { id: string; name: LangMap; description: LangMap; price: number; category: string; image: string; hidden?: boolean; }
interface Category { id: string; name: LangMap; order: number; }
interface Table { id: string; number: number; location: string; status: string; activeOrderCount: number; }
interface Review { id: string; tableId: string; tableNumber: number; mood: string | null; stars: number; comment: string; createdAt: number; }

function authFetch(url: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  return fetch(url, { ...options, credentials: "same-origin", headers });
}
async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("image", file);
  const res = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    credentials: "same-origin",
    body: form,
  });
  if (!res.ok) throw new Error("Upload failed");
  const data = await res.json() as { url: string };
  return data.url;
}

function resizeImageToBlob(file: File, scale: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 900;
      const factor = Math.min(MAX / img.width, MAX / img.height, 1) * scale;
      const w = Math.max(1, Math.round(img.width * factor));
      const h = Math.max(1, Math.round(img.height * factor));
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(objectUrl); reject(new Error("no ctx")); return; }
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(objectUrl);
      canvas.toBlob(b => b ? resolve(b) : reject(new Error("blob failed")), "image/jpeg", 0.88);
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("load failed")); };
    img.src = objectUrl;
  });
}

function t(key: string, lang: AdminLang): string {
  return T[key]?.[lang] ?? key;
}

export default function AdminPage() {
  const { signOut } = useClerk();
  const [, navigate] = useLocation();
  const [lang, setLang] = useState<AdminLang>(() => {
    try { const s = localStorage.getItem("admin_lang") as AdminLang; return (s === "en" || s === "am" || s === "om") ? s : "en"; } catch { return "en"; }
  });
  const updateLang = (l: AdminLang) => { setLang(l); try { localStorage.setItem("admin_lang", l); } catch {} };
  return (
    <AdminDashboard
      lang={lang}
      updateLang={updateLang}
      onLogout={async () => {
        await signOut();
        navigate("/");
      }}
    />
  );
}

/* ═══════════════════════ LAYOUT ═══════════════════════ */
function AdminDashboard({ onLogout, lang, updateLang }: { onLogout: () => void; lang: AdminLang; updateLang: (l: AdminLang) => void }) {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => { setSidebarOpen(false); }, [activeTab]);

  const navItems: { id: Tab; label: string; shortLabel: string; icon: React.ReactNode }[] = [
    { id: "dashboard",  label: t("dashboard", lang),   shortLabel: lang === "en" ? "Dash" : lang === "am" ? "ዳሽ" : "Daash", icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
    { id: "menu",       label: t("menuShort", lang),   shortLabel: t("menuShort", lang),                                         icon: <UtensilsCrossed className="w-[18px] h-[18px]" /> },
    { id: "categories", label: t("categories", lang),  shortLabel: lang === "en" ? "Cat." : lang === "am" ? "ምድ." : "Kat.",       icon: <Layers className="w-[18px] h-[18px]" /> },
    { id: "tables",     label: t("tablesShort", lang), shortLabel: lang === "en" ? "Tbl." : lang === "am" ? "ጠ." : "Xar.",        icon: <Table2 className="w-[18px] h-[18px]" /> },
    { id: "reviews",    label: t("reviews", lang),     shortLabel: lang === "en" ? "Rev." : lang === "am" ? "አስ." : "Yad.",        icon: <Star className="w-[18px] h-[18px]" /> },
    { id: "settings",   label: t("settings", lang),    shortLabel: lang === "en" ? "Set." : lang === "am" ? "ቅን." : "Qin.",        icon: <Shield className="w-[18px] h-[18px]" /> },
  ];

  const titles: Record<Tab, string> = {
    dashboard: t("dashboard", lang), menu: t("menuMgmt", lang), categories: t("categories", lang),
    tables: t("tableMgmt", lang), reviews: t("reviewsMgmt", lang), settings: t("settings", lang),
  };

  const activeItem = navItems.find(n => n.id === activeTab)!;

  return (
    <div className="h-[100dvh] bg-[#F0F2F5] flex overflow-hidden">

      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-[2px]"
          />
        )}
      </AnimatePresence>

      <aside className={cn(
        "fixed top-0 left-0 h-full w-[240px] bg-[#0f172a] flex flex-col z-50 transition-transform duration-300 ease-in-out",
        "lg:translate-x-0 lg:relative lg:flex lg:flex-shrink-0",
        sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
      )}>
        <div className="px-4 py-4 flex items-center justify-end flex-shrink-0"
          style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white/30 hover:text-white/70 transition-colors p-1.5 rounded-lg touch-manipulation">
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {navItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left touch-manipulation",
                  isActive
                    ? "bg-white/10 text-white font-medium border border-white/8"
                    : "text-white/40 hover:text-white/70 hover:bg-white/5 active:bg-white/8"
                )}
              >
                <span className={cn("flex-shrink-0 w-[18px] h-[18px]", isActive ? "text-[#C1440E]" : "text-white/35")}>{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {isActive && <span className="w-1 h-4 bg-[#C1440E] rounded-full flex-shrink-0" />}
              </button>
            );
          })}
        </nav>

        <div className="mx-3 border-t border-white/8" />

        <div className="px-3 py-3 flex-shrink-0"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
          <button
            onClick={() => updateLang(lang === "en" ? "am" : lang === "am" ? "om" : "en")}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/35 hover:text-white/60 hover:bg-white/5 transition-all touch-manipulation mb-1"
          >
            <span className="text-base">{lang === "om" ? "🇪🇹" : lang === "en" ? "🇬🇧" : "🇪🇹"}</span>
            <span>{lang === "en" ? "English" : lang === "am" ? "አማርኛ" : "Afaan Oromoo"}</span>
          </button>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/35 hover:text-white/60 hover:bg-white/5 transition-all touch-manipulation"
          >
            <LogOut className="w-4 h-4" />{t("logout", lang)}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="lg:hidden bg-[#0f172a] px-4 flex items-center gap-3 sticky top-0 z-30 flex-shrink-0"
          style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))", paddingBottom: "0.75rem" }}>
          <button onClick={() => setSidebarOpen(true)} className="text-white/50 hover:text-white transition-colors p-2 -ml-2 rounded-lg touch-manipulation">
            <MenuIcon className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-[#C1440E] flex-shrink-0">{activeItem.icon}</span>
            <h1 className="text-white font-semibold text-base truncate">{titles[activeTab]}</h1>
          </div>
        </header>

        <header className="hidden lg:flex bg-white border-b border-slate-200/60 px-8 py-3.5 items-center gap-4 sticky top-0 z-10 flex-shrink-0 shadow-sm shadow-slate-100">
          <div className="flex-1 flex items-center gap-3">
            <span className="text-[#C1440E]">{activeItem.icon}</span>
            <h1 className="text-lg font-bold text-slate-800">{titles[activeTab]}</h1>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overscroll-contain" style={{
          paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))"
        }}>
          <div className="p-4 sm:p-5 lg:p-7 max-w-7xl mx-auto w-full">
            <div>
              {activeTab === "dashboard"  && <DashboardTab setActiveTab={setActiveTab} lang={lang} />}
              {activeTab === "menu"       && <MenuTab lang={lang} />}
              {activeTab === "categories" && <CategoriesTab lang={lang} />}
              {activeTab === "tables"     && <TablesTab lang={lang} />}
              {activeTab === "reviews"    && <ReviewsTab lang={lang} />}
              {activeTab === "settings"   && <SettingsTab lang={lang} />}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

/* ═══════════════════════ DASHBOARD TAB ═══════════════════════ */
interface PopularItem { id: string; clicks: number; name?: { en: string; am: string; om?: string }; image?: string; price?: number; }
interface OrderItem   { menuItemId: string; name: { en: string; am: string; om?: string }; price: number; quantity: number; }
interface OrderData   { id: string; tableNumber: number; status: "pending" | "preparing" | "ready" | "delivered"; items: OrderItem[]; createdAt: number; note?: string; }

function orderTotal(o: OrderData) {
  return o.items.reduce((s, it) => s + it.price * it.quantity, 0);
}

/* ═══════════════════════ REVENUE CARD ═══════════════════════ */
const STATUS_DEF = [
  { key: "delivered" as const, label: { en: "✅ Delivered",  am: "✅ ተረክቧል",  om: "✅ Kennameera"     }, color: "#10b981" },
  { key: "ready"     as const, label: { en: "🚚 On the way", am: "🚚 ተዘጋጅቷል", om: "🚚 Karaa jira"     }, color: "#3b82f6" },
  { key: "preparing" as const, label: { en: "👨‍🍳 Preparing", am: "👨‍🍳 እየተዘጋጀ", om: "👨‍🍳 Qophaa'aa"    }, color: "#f59e0b" },
  { key: "pending"   as const, label: { en: "🟡 New Order",  am: "🟡 በጠብቃ",   om: "🟡 Ajaja Haaraa"  }, color: "#ef4444" },
];

function RevenueCard({ orders, lang }: { orders: OrderData[]; lang: AdminLang }) {
  const revenueTotal     = orders.reduce((s, o) => s + orderTotal(o), 0);
  const revenueDelivered = orders.filter(o => o.status === "delivered").reduce((s, o) => s + orderTotal(o), 0);
  const totalItems       = orders.reduce((s, o) => s + o.items.reduce((ss, i) => ss + i.quantity, 0), 0);

  const tableRevMap = new Map<number, number>();
  for (const o of orders) {
    tableRevMap.set(o.tableNumber, (tableRevMap.get(o.tableNumber) ?? 0) + orderTotal(o));
  }
  const topTables = [...tableRevMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);

  const R = 44, cx = 52, cy = 52, strokeW = 9;
  const circumference = 2 * Math.PI * R;
  let accPct = 0;
  const segments = STATUS_DEF.map(s => {
    const rev = orders.filter(o => o.status === s.key).reduce((ss, o) => ss + orderTotal(o), 0);
    const pct = revenueTotal > 0 ? rev / revenueTotal : 0;
    const dasharray  = circumference * pct;
    const dashoffset = -(accPct * circumference);
    accPct += pct;
    return { ...s, rev, pct, dasharray, dashoffset };
  }).filter(s => s.pct > 0);

  const donePct = revenueTotal > 0 ? Math.round((revenueDelivered / revenueTotal) * 100) : 0;

  return (
    <div className="rounded-3xl overflow-hidden shadow-md border border-slate-100/60">
      {/* ── Dark header ── */}
      <div style={{ background: "linear-gradient(135deg,#0f172a 0%,#1a3050 60%,#0f2744 100%)" }} className="px-5 pt-5 pb-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-0.5">
              {lang === "en" ? "Revenue" : lang === "am" ? "ገቢ" : "Galii"}
            </p>
            <p className="text-slate-500 text-[11px]">
              {lang === "en" ? "Based on current orders" : lang === "am" ? "ወቅታዊ ትዕዛዞች ላይ ተመስርቶ" : "Ajajawwan jiran irratti hundaa'uun"}
            </p>
          </div>
          <span className="flex items-center gap-1.5 bg-emerald-500/15 text-emerald-400 text-[11px] font-semibold px-2.5 py-1.5 rounded-full border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {lang === "en" ? "Live" : lang === "am" ? "ቀጥታ" : "Kallattiin"}
          </span>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <motion.p
              key={revenueTotal}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-[42px] font-black text-white leading-none tracking-tight tabular-nums"
            >
              {revenueTotal.toLocaleString()}
            </motion.p>
            <p className="text-slate-400 text-xs font-semibold mt-1 tracking-widest">ETB</p>
          </div>

          <div className="flex gap-4 mb-1">
            <div className="text-right">
              <p className="text-white font-black text-xl leading-none">{orders.length}</p>
              <p className="text-slate-400 text-[11px] mt-0.5">{lang === "en" ? "orders" : lang === "am" ? "ትዕዛዞች" : "ajajawwan"}</p>
            </div>
            <div className="text-right">
              <p className="text-white font-black text-xl leading-none">{totalItems}</p>
              <p className="text-slate-400 text-[11px] mt-0.5">{lang === "en" ? "items" : lang === "am" ? "ምርቶች" : "wantoota"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="bg-white p-5 space-y-5">
        {orders.length === 0 ? (
          <div className="py-10 text-center">
            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-slate-100">
              <DollarSign className="w-7 h-7 text-slate-300" />
            </div>
            <p className="text-slate-400 text-sm font-medium">
              {lang === "en" ? "No orders yet" : lang === "am" ? "ዛሬ ምንም ትዕዛዝ የለም" : "Ajajni hin jiru"}
            </p>
          </div>
        ) : (
          <>
            {/* ── Donut + breakdown ── */}
            <div className="flex items-center gap-5">
              <div className="flex-shrink-0 relative">
                <svg width="104" height="104" viewBox="0 0 104 104">
                  <circle cx={cx} cy={cy} r={R} fill="none" stroke="#f1f5f9" strokeWidth={strokeW} />
                  {segments.map((s, i) => (
                    <motion.circle
                      key={s.key}
                      cx={cx} cy={cy} r={R}
                      fill="none"
                      stroke={s.color}
                      strokeWidth={strokeW}
                      strokeLinecap="butt"
                      strokeDasharray={`${s.dasharray} ${circumference}`}
                      initial={{ strokeDashoffset: s.dashoffset - circumference }}
                      animate={{ strokeDashoffset: s.dashoffset }}
                      transition={{ duration: 0.7, delay: i * 0.1, ease: "easeOut" }}
                      transform={`rotate(-90 ${cx} ${cy})`}
                    />
                  ))}
                  <text x={cx} y={cy - 5} textAnchor="middle" fill="#1B2A4A" fontSize="13" fontWeight="900">
                    {donePct}%
                  </text>
                  <text x={cx} y={cy + 9} textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="600">
                    {lang === "en" ? "done" : lang === "am" ? "ተጠናቅ" : "xumurame"}
                  </text>
                </svg>
              </div>

              <div className="flex-1 space-y-2.5">
                {STATUS_DEF.map(s => {
                  const rev   = orders.filter(o => o.status === s.key).reduce((ss, o) => ss + orderTotal(o), 0);
                  const count = orders.filter(o => o.status === s.key).length;
                  if (count === 0) return null;
                  const pct = revenueTotal > 0 ? (rev / revenueTotal) * 100 : 0;
                  return (
                    <div key={s.key}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                          <span className="text-[11px] font-semibold text-slate-600">{s.label[lang]}</span>
                          <span className="text-[11px] text-slate-400 font-medium">×{count}</span>
                        </div>
                        <span className="text-[11px] font-bold text-[#1B2A4A] tabular-nums">{rev.toLocaleString()}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          className="h-full rounded-full"
                          style={{ background: s.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Confirmed income ── */}
            {revenueDelivered > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ background: "linear-gradient(135deg,#f0fdf4,#dcfce7)" }}
                className="rounded-2xl p-4 flex items-center justify-between border border-emerald-100"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm shadow-emerald-200">
                    <Check className="w-4 h-4 text-white" strokeWidth={3} />
                  </div>
                  <div>
                    <p className="text-emerald-800 text-xs font-bold leading-tight">
                      {lang === "en" ? "Confirmed Income" : lang === "am" ? "ተረጋጋጠ ገቢ" : "Galii Mirkana'e"}
                    </p>
                    <p className="text-emerald-500 text-[11px]">
                      {lang === "en" ? "Delivered orders" : lang === "am" ? "የተረከቡ ትዕዛዞች" : "Ajajawwan kennaman"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-emerald-700 text-[22px] font-black leading-none tabular-nums">
                    {revenueDelivered.toLocaleString()}
                  </p>
                  <p className="text-emerald-500 text-[10px] font-bold tracking-widest mt-0.5">ETB</p>
                </div>
              </motion.div>
            )}

          </>
        )}
      </div>
    </div>
  );
}

/* ─── Period Dropdown ─── */
type ChartPeriod = "daily" | "weekly" | "monthly" | "yearly";

function PeriodDropdown({ period, setPeriod, periodLabels, lang }: {
  period: ChartPeriod;
  setPeriod: (p: ChartPeriod) => void;
  periodLabels: Record<ChartPeriod, { en: string; am: string; om: string }>;
  lang: AdminLang;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative flex-shrink-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-[11px] font-bold text-[#1B2A4A] transition-colors"
      >
        {periodLabels[period][lang]}
        <ChevronDown className={cn("w-3 h-3 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-50 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden min-w-[110px] py-1">
            {(["daily","weekly","monthly","yearly"] as ChartPeriod[]).map(p => (
              <button key={p}
                onClick={() => { setPeriod(p); setOpen(false); }}
                className={cn(
                  "w-full text-left px-4 py-2.5 text-xs font-semibold transition-colors",
                  period === p ? "bg-violet-50 text-violet-700" : "text-slate-600 hover:bg-slate-50"
                )}>
                {periodLabels[p][lang]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Restaurant Charts ─── */

function RestaurantCharts({ orders, lang }: { orders: OrderData[]; lang: AdminLang }) {
  const [period, setPeriod] = useState<ChartPeriod>("monthly");
  const totalOrders = orders.length;

  const now = new Date();
  const currentYear  = now.getFullYear();
  const currentMonth = now.getMonth();
  const today        = now.getDate();
  const currentHour  = now.getHours();
  const currentDow   = now.getDay(); // 0=Sun

  const chartData = useMemo(() => {
    if (period === "daily") {
      const hourMap = new Map<number, { orders: number; revenue: number }>();
      for (const o of orders) {
        const d = new Date(o.createdAt);
        if (d.getFullYear() === currentYear && d.getMonth() === currentMonth && d.getDate() === today) {
          const h = d.getHours();
          const cur = hourMap.get(h) ?? { orders: 0, revenue: 0 };
          hourMap.set(h, { orders: cur.orders + 1, revenue: cur.revenue + orderTotal(o) });
        }
      }
      return Array.from({ length: currentHour + 1 }, (_, h) => {
        const data = hourMap.get(h) ?? { orders: 0, revenue: 0 };
        return { day: `${h}:00`, orders: data.orders, revenue: data.revenue };
      });
    }

    if (period === "weekly") {
      const monOffset = (currentDow + 6) % 7; // Mon=0 … Sun=6
      const startOfWeek = new Date(now);
      startOfWeek.setDate(today - monOffset);
      startOfWeek.setHours(0, 0, 0, 0);
      const dayNamesEn = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
      const dayNamesAm = ["ሰ","ማ","ረ","ሐ","ዓ","ቅ","እ"];
      const dayNamesOm = ["Wix","Kib","Rob","Ham","Jim","San","Dil"];
      const dayMap = new Map<number, { orders: number; revenue: number }>();
      for (const o of orders) {
        const d = new Date(o.createdAt);
        if (d >= startOfWeek && d <= now) {
          const dow = (d.getDay() + 6) % 7;
          const cur = dayMap.get(dow) ?? { orders: 0, revenue: 0 };
          dayMap.set(dow, { orders: cur.orders + 1, revenue: cur.revenue + orderTotal(o) });
        }
      }
      const daysCount = monOffset + 1;
      return Array.from({ length: daysCount }, (_, i) => {
        const data = dayMap.get(i) ?? { orders: 0, revenue: 0 };
        const lbl = lang === "en" ? dayNamesEn[i] : lang === "am" ? dayNamesAm[i] : dayNamesOm[i];
        return { day: lbl, orders: data.orders, revenue: data.revenue };
      });
    }

    if (period === "monthly") {
      const dayMap = new Map<number, { orders: number; revenue: number }>();
      for (const o of orders) {
        const d = new Date(o.createdAt);
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
          const day = d.getDate();
          const cur = dayMap.get(day) ?? { orders: 0, revenue: 0 };
          dayMap.set(day, { orders: cur.orders + 1, revenue: cur.revenue + orderTotal(o) });
        }
      }
      return Array.from({ length: today }, (_, i) => {
        const d = i + 1;
        const data = dayMap.get(d) ?? { orders: 0, revenue: 0 };
        return { day: `${d}`, orders: data.orders, revenue: data.revenue };
      });
    }

    // yearly
    const mNamesEn = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const mNamesAm = ["ጃን","ፌብ","ማር","ኤፕ","ሜይ","ጁን","ጁላ","ኦግ","ሴፕ","ኦክ","ኖቭ","ዲሴ"];
    const mNamesOm = ["Ama","Gur","Bit","Elb","Cam","Wax","Ado","Hag","Ful","Onk","Sad","Mud"];
    const monthMap = new Map<number, { orders: number; revenue: number }>();
    for (const o of orders) {
      const d = new Date(o.createdAt);
      if (d.getFullYear() === currentYear) {
        const m = d.getMonth();
        const cur = monthMap.get(m) ?? { orders: 0, revenue: 0 };
        monthMap.set(m, { orders: cur.orders + 1, revenue: cur.revenue + orderTotal(o) });
      }
    }
    return Array.from({ length: currentMonth + 1 }, (_, m) => {
      const data = monthMap.get(m) ?? { orders: 0, revenue: 0 };
      const lbl = lang === "en" ? mNamesEn[m] : lang === "am" ? mNamesAm[m] : mNamesOm[m];
      return { day: lbl, orders: data.orders, revenue: data.revenue };
    });
  }, [period, orders, lang, currentYear, currentMonth, today, currentHour, currentDow]);

  const hasData = totalOrders > 0;

  const periodLabels: Record<ChartPeriod, { en: string; am: string; om: string }> = {
    daily:   { en: "Daily",   am: "ዕለታዊ",   om: "Guyyaa"  },
    weekly:  { en: "Weekly",  am: "ሳምንታዊ",  om: "Torban"  },
    monthly: { en: "Monthly", am: "ወርሃዊ",    om: "Ji'aa"   },
    yearly:  { en: "Yearly",  am: "ዓመታዊ",   om: "Waggaa"  },
  };

  const chartTitle = {
    daily:   { en: "Today's Activity",       am: "የዛሬ እንቅስቃሴ",      om: "Socho'aa Har'aa"       },
    weekly:  { en: "This Week's Activity",   am: "የሳምንቱ እንቅስቃሴ",    om: "Socho'aa Torban Kanaa" },
    monthly: { en: "This Month's Activity",  am: "የወሩ እንቅስቃሴ",      om: "Socho'insa Ji'a Kana"   },
    yearly:  { en: "This Year's Activity",   am: "የዓመቱ እንቅስቃሴ",    om: "Socho'aa Waggaa Kanaa" },
  };

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-slate-100 rounded-xl shadow-lg p-3 text-xs">
        <p className="font-bold text-slate-500 mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="font-semibold text-[#1B2A4A]">
            {p.name === "orders"
              ? `${p.value} ${lang === "en" ? "orders" : lang === "am" ? "ትዕዛዞች" : "ajajawwan"}`
              : `${p.value.toLocaleString()} ETB`}
          </p>
        ))}
      </div>
    );
  };

  return (
    <>
      {/* Activity Area Chart with period selector */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <div className="flex items-start justify-between mb-3 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 bg-violet-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-4 h-4 text-violet-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#1B2A4A] leading-tight truncate">
                {chartTitle[period][lang]}
              </p>
              <p className="text-[11px] text-slate-400">
                {lang === "en" ? "Orders & revenue" : lang === "am" ? "ትዕዛዞችና ገቢ" : "Ajajawwan fi galii"}
              </p>
            </div>
          </div>
          {/* Period selector dropdown */}
          <PeriodDropdown period={period} setPeriod={setPeriod} periodLabels={periodLabels} lang={lang} />
        </div>
        <div className="flex items-center gap-3 text-[10px] font-semibold mb-3">
          <span className="flex items-center gap-1 text-violet-500"><span className="w-2 h-2 rounded-full bg-violet-500 inline-block" />{lang === "en" ? "Orders" : lang === "am" ? "ትዕዛዞች" : "Ajajawwan"}</span>
          <span className="flex items-center gap-1 text-emerald-500"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />{lang === "en" ? "Revenue" : lang === "am" ? "ገቢ" : "Galii"}</span>
        </div>
        {!hasData ? (
          <div className="py-8 flex flex-col items-center justify-center text-slate-300">
            <TrendingUp className="w-10 h-10 mb-2" />
            <p className="text-sm font-medium">{lang === "en" ? "No activity yet" : lang === "am" ? "ምንም እንቅስቃሴ የለም" : "Socho'aan hin jiru"}</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="gradOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} interval={Math.max(0, Math.floor(chartData.length / 10) - 1)} />
              <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="orders"  stroke="#8b5cf6" strokeWidth={2} fill="url(#gradOrders)"  dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
              <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fill="url(#gradRevenue)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </>
  );
}

function DashboardTab({ setActiveTab, lang }: { setActiveTab: (t: Tab) => void; lang: AdminLang }) {
  const { data: menu = [] }   = useQuery<MenuItem[]>({ queryKey: ["admin-menu"],   queryFn: async () => { const r = await authFetch(`${API_BASE}/menu`, { cache: "no-store" }); const data = await r.json(); return Array.isArray(data) ? data : []; }, placeholderData: INITIAL_MENU as unknown as MenuItem[], staleTime: 0, gcTime: 30 * 60_000 });
  const { data: tables = [] } = useQuery<Table[]>({    queryKey: ["admin-tables"], queryFn: async () => { const r = await authFetch(`${API_BASE}/tables`, { cache: "no-store" }); const data = await r.json(); return Array.isArray(data) ? data : []; }, staleTime: 0, gcTime: 30 * 60_000 });

  const { data: orders = [] } = useQuery<OrderData[]>({
    queryKey: ["admin-orders-dash"],
    queryFn: async () => {
      const r = await authFetch(`${API_BASE}/orders?includeArchived=1`);
      if (!r.ok) return [];
      return r.json();
    },
    staleTime: 0,
    refetchInterval: 4_000,
  });

  const { data: popular = [], isLoading: popularLoading } = useQuery<PopularItem[]>({
    queryKey: ["admin-popular"],
    queryFn: async () => {
      const r = await authFetch(`${API_BASE}/menu-stats/popular?limit=10`);
      if (!r.ok) return [];
      const raw = await r.json() as PopularItem[];
      const menuMap = new Map((menu as MenuItem[]).map((m: MenuItem) => [m.id, m]));
      return raw
        .filter(p => p && p.id)
        .map(p => ({
          ...p,
          name:  menuMap.get(p.id)?.name  ?? p.name,
          image: menuMap.get(p.id)?.image ?? p.image,
          price: menuMap.get(p.id)?.price ?? p.price,
        }))
        .sort((a, b) => b.clicks - a.clicks);
    },
    enabled: menu.length > 0,
    staleTime: 0,
    refetchInterval: 4_000,
  });

  const occupiedTables = tables.filter(tb => tb.status === "occupied").length;
  const maxClicks = popular.length > 0 ? Math.max(...popular.map(p => p.clicks), 1) : 1;


  const itemName = (p: PopularItem) => p.name?.[lang] || p.name?.en || p.id;

  return (
    <div className="space-y-5">
      {/* Revenue + Stats yan yana */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-stretch">
        {/* Revenue card */}
        <RevenueCard orders={orders} lang={lang} />

        {/* Stat cards — fill height of Revenue card */}
        <div className="flex flex-col gap-3">
          {/* Total Items */}
          <div
            onClick={() => setActiveTab("menu")}
            className="flex-1 rounded-2xl overflow-hidden shadow-sm border border-violet-100 cursor-pointer hover:shadow-md active:scale-[0.99] transition-all touch-manipulation"
            style={{ background: "linear-gradient(135deg,#f5f3ff 0%,#ede9fe 100%)" }}
          >
            <div className="p-5 flex flex-col h-full justify-between gap-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center shadow-md shadow-violet-200">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <span className="text-[10px] font-bold text-violet-400 uppercase tracking-[0.15em]">
                  {lang === "en" ? "Menu" : lang === "am" ? "ሜኑ" : "Menu"}
                </span>
              </div>
              <div>
                <p className="text-4xl font-black text-violet-700 leading-none tabular-nums">{menu.length}</p>
                <p className="text-violet-500 text-sm font-semibold mt-1.5">{t("totalItems", lang)}</p>
                <p className="text-violet-400 text-xs mt-0.5">
                  {lang === "en" ? "Active menu items" : lang === "am" ? "ንቁ የሜኑ ምርቶች" : "Walii Gala Menu Dha"}
                </p>
              </div>
            </div>
          </div>

          {/* Occupied Tables */}
          <div
            onClick={() => setActiveTab("tables")}
            className="flex-1 rounded-2xl overflow-hidden shadow-sm border border-blue-100 cursor-pointer hover:shadow-md active:scale-[0.99] transition-all touch-manipulation"
            style={{ background: "linear-gradient(135deg,#eff6ff 0%,#dbeafe 100%)" }}
          >
            <div className="p-5 flex flex-col h-full justify-between gap-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-200">
                  <Table2 className="w-5 h-5 text-white" />
                </div>
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.15em]">
                  {lang === "en" ? "Tables" : lang === "am" ? "ጠረጴዛዎች" : "Xarabbezota"}
                </span>
              </div>
              <div>
                <div className="flex items-end gap-1.5">
                  <p className="text-4xl font-black text-blue-700 leading-none tabular-nums">{occupiedTables}</p>
                  <p className="text-blue-400 font-bold text-lg leading-none mb-0.5">/ {tables.length}</p>
                </div>
                <p className="text-blue-500 text-sm font-semibold mt-1.5">{t("occupiedTbl", lang)}</p>
                <p className="text-blue-400 text-xs mt-0.5">
                  {lang === "en" ? "Tables currently in use" : lang === "am" ? "አሁን ጥቅም ላይ ያሉ" : "Amma fayyadama jiran"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Charts ── */}
      <RestaurantCharts orders={orders} lang={lang} />

      {/* ── Popular items ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h3 className="font-bold text-[#1B2A4A] text-sm leading-tight">
              {lang === "en" ? "Popular Items" : lang === "am" ? "ታዋቂ ምርቶች" : "Menule Bebbekkamaa"}
            </h3>
            <p className="text-slate-400 text-[11px]">
              {lang === "en" ? "Most viewed by customers" : lang === "am" ? "ደምበኞች ብዙ የተመለከቱ" : "Mammilotan Hedu Ilalaame"}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1 text-slate-300 text-[11px]">
            <MousePointerClick className="w-3 h-3" />
            {lang === "en" ? "clicks" : lang === "am" ? "ጠቅታዎች" : "cuqaasaa"}
          </div>
        </div>

        {popularLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-xl bg-slate-100 flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-slate-100 rounded-full w-2/3" />
                  <div className="h-2 bg-slate-100 rounded-full" />
                </div>
                <div className="w-8 h-4 bg-slate-100 rounded-full flex-shrink-0" />
              </div>
            ))}
          </div>
        ) : popular.length === 0 ? (
          <div className="py-8 text-center">
            <MousePointerClick className="w-8 h-8 text-slate-200 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">
              {lang === "en" ? "No data yet — customers haven't browsed the menu" : lang === "am" ? "ገና ምንም ዳታ የለም — ደምበኞች ሜኑ አልጎበኙም" : "Deetaa hin jiru — maamilootni menu hin ilaalin"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {popular.map((p, i) => {
              const pct = Math.round((p.clicks / maxClicks) * 100);
              const barColor =
                i === 0 ? "bg-amber-500" :
                i === 1 ? "bg-slate-400" :
                i === 2 ? "bg-orange-600" :
                "bg-[#C1440E]/50";
              return (
                <div key={p.id} className="flex items-center gap-3">
                  <div className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black flex-shrink-0",
                    i === 0 ? "bg-amber-100 text-amber-700" :
                    i === 1 ? "bg-slate-100 text-slate-500" :
                    i === 2 ? "bg-orange-100 text-orange-700" :
                    "bg-slate-50 text-slate-400"
                  )}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                  </div>
                  {p.image ? (
                    <img src={p.image} alt={itemName(p)}
                      className="w-9 h-9 rounded-xl object-cover flex-shrink-0 border border-slate-100" />
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 text-base">🍽</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-1">
                      <p className="text-[12px] font-semibold text-[#1B2A4A] truncate leading-tight">{itemName(p)}</p>
                      {p.price ? <span className="text-[10px] text-slate-400 flex-shrink-0">{p.price} ETB</span> : null}
                    </div>
                    <div className="mt-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, delay: i * 0.05, ease: "easeOut" }}
                        className={cn("h-full rounded-full", barColor)}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-500 flex-shrink-0 min-w-[28px] text-right">{p.clicks}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 space-y-2">
        <h3 className="font-bold text-[#1B2A4A] text-sm mb-3">{t("quickActions", lang)}</h3>
        {[
          { label: t("addMenuItem", lang), tab: "menu" as Tab,   icon: <UtensilsCrossed className="w-4 h-4" /> },
          { label: t("addTable", lang),    tab: "tables" as Tab, icon: <Table2 className="w-4 h-4" /> },
        ].map((a, i) => (
          <button key={i} onClick={() => setActiveTab(a.tab)}
            className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-[#1B2A4A] hover:text-white active:bg-[#1B2A4A] active:text-white rounded-xl text-sm font-medium text-slate-600 transition-colors group touch-manipulation">
            <span className="text-[#1B2A4A] group-hover:text-white group-active:text-white transition-colors">{a.icon}</span>
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════ MENU TAB ═══════════════════════ */
function MenuTab({ lang }: { lang: AdminLang }) {
  const queryClient = useQueryClient();
  const [editItem, setEditItem]     = useState<MenuItem | null>(null);
  const [showForm, setShowForm]     = useState(false);
  const [filterCat, setFilterCat]   = useState("all");
  const [showHidden, setShowHidden] = useState(false);
  const [search, setSearch]         = useState("");

  const { data: menu = [] } = useQuery<MenuItem[]>({
    queryKey: ["admin-menu"],
    queryFn: async () => { const r = await authFetch(`${API_BASE}/menu?showHidden=1`); return r.json(); },
    placeholderData: INITIAL_MENU as unknown as MenuItem[],
    staleTime: 30_000,
  });
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["admin-categories"],
    queryFn: async () => { const r = await authFetch(`${API_BASE}/categories`); return r.json(); },
    placeholderData: INITIAL_CATEGORIES as unknown as Category[],
    staleTime: 30_000,
  });

  function clearBundleCache() {
    try {
      localStorage.removeItem("al_bundle_v2");
      localStorage.removeItem("al_bundle_v3");
    } catch {}
  }

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await authFetch(`${API_BASE}/menu/${id}`, { method: "DELETE" }); },
    onSuccess: async () => { await queryClient.refetchQueries({ queryKey: ["admin-menu"] }); clearBundleCache(); }
  });
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const isEdit = !!data.id && menu.some(m => m.id === data.id);
      await authFetch(isEdit ? `${API_BASE}/menu/${data.id}` : `${API_BASE}/menu`, { method: isEdit ? "PUT" : "POST", body: JSON.stringify(data) });
    },
    onSuccess: async () => { await queryClient.refetchQueries({ queryKey: ["admin-menu"] }); clearBundleCache(); setShowForm(false); setEditItem(null); }
  });
  const toggleHiddenMutation = useMutation({
    mutationFn: async ({ id, hidden }: { id: string; hidden: boolean }) => {
      await authFetch(`${API_BASE}/menu/${id}`, { method: "PATCH", body: JSON.stringify({ hidden }) });
    },
    onSuccess: async () => { await queryClient.refetchQueries({ queryKey: ["admin-menu"] }); clearBundleCache(); }
  });

  const visibleMenu = menu.filter(m => !m.hidden);
  const hiddenItems = menu.filter(m => m.hidden);

  const q = search.trim().toLowerCase();
  const displayItems = (showHidden ? hiddenItems : visibleMenu).filter(item => {
    if (filterCat !== "all" && item.category !== filterCat) return false;
    if (q && !item.name?.en?.toLowerCase().includes(q) && !item.name?.am?.toLowerCase().includes(q)) return false;
    return true;
  });

  function catCount(catId: string) {
    const src = showHidden ? hiddenItems : visibleMenu;
    return catId === "all" ? src.length : src.filter(m => m.category === catId).length;
  }

  const itemName = (item: MenuItem) => item.name?.[lang] || item.name?.en || "";
  const itemDesc = (item: MenuItem) => item.description?.[lang] || item.description?.en || "";
  const catName  = (cat: Category) => cat.name?.[lang] || cat.name?.en || cat.id;

  return (
    <div className="flex gap-5 min-h-[70vh]">
      <aside className="hidden lg:flex flex-col w-52 flex-shrink-0 gap-1">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-1">{t("catLabel", lang)}</p>

        <button
          onClick={() => { setFilterCat("all"); setShowHidden(false); }}
          className={cn(
            "flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left touch-manipulation",
            !showHidden && filterCat === "all"
              ? "bg-[#C1440E] text-white shadow-sm shadow-[#C1440E]/20"
              : "text-slate-600 hover:bg-white hover:shadow-sm"
          )}
        >
          <span>{t("all", lang)}</span>
          <span className={cn("text-xs font-bold px-1.5 py-0.5 rounded-md", !showHidden && filterCat === "all" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500")}>
            {visibleMenu.length}
          </span>
        </button>

        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => { setFilterCat(cat.id); setShowHidden(false); }}
            className={cn(
              "flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left touch-manipulation",
              !showHidden && filterCat === cat.id
                ? "bg-[#C1440E] text-white shadow-sm shadow-[#C1440E]/20"
                : "text-slate-600 hover:bg-white hover:shadow-sm"
            )}
          >
            <span className="truncate">{catName(cat)}</span>
            <span className={cn("text-xs font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 ml-1", !showHidden && filterCat === cat.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500")}>
              {catCount(cat.id)}
            </span>
          </button>
        ))}

        {hiddenItems.length > 0 && (
          <>
            <div className="my-2 border-t border-slate-200" />
            <button
              onClick={() => { setShowHidden(true); setFilterCat("all"); }}
              className={cn(
                "flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left touch-manipulation",
                showHidden
                  ? "bg-slate-700 text-white"
                  : "text-slate-500 hover:bg-white hover:shadow-sm"
              )}
            >
              <span className="flex items-center gap-1.5"><EyeOff className="w-3.5 h-3.5" />{t("hidden", lang)}</span>
              <span className={cn("text-xs font-bold px-1.5 py-0.5 rounded-md", showHidden ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500")}>
                {hiddenItems.length}
              </span>
            </button>
          </>
        )}
      </aside>

      <div className="flex-1 min-w-0 space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t("searchItems", lang)}
              className="w-full bg-white border border-stone-200 focus:border-[#C1440E] rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-700 outline-none transition-colors"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 touch-manipulation">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={() => { setEditItem(null); setShowForm(true); }}
            className="flex items-center gap-2 bg-[#C1440E] hover:bg-[#a83a0c] text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm shadow-[#C1440E]/20 touch-manipulation flex-shrink-0"
          >
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">{t("addItem", lang)}</span><span className="sm:hidden">{t("add", lang)}</span>
          </button>
        </div>

        {/* Mobile category pills */}
        <div className="lg:hidden -mx-1 px-1 overflow-x-auto">
          <div className="flex gap-2 pb-1" style={{ width: "max-content" }}>
            <button
              onClick={() => { setFilterCat("all"); setShowHidden(false); }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap touch-manipulation",
                !showHidden && filterCat === "all"
                  ? "bg-[#C1440E] text-white"
                  : "bg-white border border-stone-200 text-slate-600"
              )}
            >
              {t("all", lang)} <span className="text-[11px] opacity-70">({visibleMenu.length})</span>
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => { setFilterCat(cat.id); setShowHidden(false); }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap touch-manipulation",
                  !showHidden && filterCat === cat.id
                    ? "bg-[#C1440E] text-white"
                    : "bg-white border border-stone-200 text-slate-600"
                )}
              >
                {catName(cat)} <span className="text-[11px] opacity-70">({visibleMenu.filter(m => m.category === cat.id).length})</span>
              </button>
            ))}
            {hiddenItems.length > 0 && (
              <button
                onClick={() => { setShowHidden(true); setFilterCat("all"); }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap touch-manipulation flex items-center gap-1.5",
                  showHidden
                    ? "bg-slate-700 text-white"
                    : "bg-white border border-dashed border-slate-300 text-slate-500"
                )}
              >
                <EyeOff className="w-3.5 h-3.5" /> {t("hidden", lang)} <span className="text-[11px] opacity-70">({hiddenItems.length})</span>
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          {displayItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-stone-300">
              <Search className="w-10 h-10 mb-3" />
              <p className="text-stone-400 font-semibold text-sm">{t("noItems", lang)}</p>
            </div>
          ) : (
            <div className="divide-y divide-stone-50">
              <AnimatePresence initial={false}>
                {displayItems.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0, overflow: "hidden" }}
                    transition={{ duration: 0.12, delay: idx * 0.01 }}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 hover:bg-slate-50/80 transition-colors group",
                      showHidden && "opacity-60"
                    )}
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-stone-100">
                      {item.image
                        ? <img src={item.image} alt={itemName(item)} className="w-full h-full object-cover" loading="lazy" />
                        : <div className="w-full h-full flex items-center justify-center"><Camera className="w-5 h-5 text-stone-300" /></div>
                      }
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm truncate">{itemName(item)}</p>
                      <p className="text-stone-400 text-xs truncate mt-0.5">
                        {itemDesc(item) || <span className="italic">{t("noDesc", lang)}</span>}
                      </p>
                    </div>

                    <span className="font-bold text-[#C1440E] text-sm flex-shrink-0 w-16 text-right">
                      {item.price} Br
                    </span>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      {showHidden ? (
                        <button
                          onClick={() => toggleHiddenMutation.mutate({ id: item.id, hidden: false })}
                          title={t("show", lang)}
                          className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors touch-manipulation"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => toggleHiddenMutation.mutate({ id: item.id, hidden: true })}
                          title={t("hide", lang)}
                          className="p-2 rounded-lg bg-amber-50 text-amber-500 hover:bg-amber-100 transition-colors touch-manipulation"
                        >
                          <EyeOff className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => { setEditItem(item); setShowForm(true); }}
                        title={t("edit", lang)}
                        className="p-2 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors touch-manipulation"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { if (confirm(t("confirmDelItem", lang))) deleteMutation.mutate(item.id); }}
                        title={t("delete", lang)}
                        className="p-2 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors touch-manipulation"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <MenuItemForm
          categories={categories}
          initialData={editItem}
          onSave={d => saveMutation.mutate(d)}
          onCancel={() => { setShowForm(false); setEditItem(null); }}
          isSaving={saveMutation.isPending}
          lang={lang}
        />
      )}
    </div>
  );
}

/* ─── Input style (shared) ─── */
const inputCls = "w-full border-2 border-slate-200 focus:border-[#C1440E] bg-slate-50 focus:bg-white rounded-lg px-3 py-2 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-300";
const selectCls = "w-full border-2 border-slate-200 focus:border-[#C1440E] bg-slate-50 focus:bg-white rounded-lg px-3 py-2 text-sm text-slate-800 outline-none transition-colors appearance-none";

function MenuItemForm({ categories, initialData, onSave, onCancel, isSaving, lang }: {
  categories: Category[]; initialData: MenuItem | null;
  onSave: (d: any) => void; onCancel: () => void; isSaving: boolean; lang: AdminLang;
}) {
  const [price, setPrice]   = useState(initialData?.price?.toString() || "");
  const [category, setCat]  = useState(initialData?.category || categories[0]?.id || "");
  const [image, setImage]   = useState(initialData?.image || "");
  const [nameEn, setNameEn] = useState(initialData?.name?.en || "");
  const [nameAm, setNameAm] = useState(initialData?.name?.am || "");
  const [nameOm, setNameOm] = useState(initialData?.name?.om || "");
  const [descEn, setDescEn] = useState(initialData?.description?.en || "");
  const [descAm, setDescAm] = useState(initialData?.description?.am || "");
  const [descOm, setDescOm] = useState(initialData?.description?.om || "");
  const [uploading, setUploading]     = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl]   = useState("");
  const [cropScale, setCropScale]     = useState(1);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!pendingFile) { setPreviewUrl(""); return; }
    const url = URL.createObjectURL(pendingFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingFile]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");
    setPendingFile(file);
    setCropScale(1);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleCropUpload() {
    if (!pendingFile) return;
    setUploading(true); setUploadError("");
    try {
      const blob = await resizeImageToBlob(pendingFile, cropScale);
      const resized = new File([blob], pendingFile.name, { type: "image/jpeg" });
      const url = await uploadImage(resized);
      setImage(url);
      setPendingFile(null);
    } catch {
      setUploadError(t("uploadFailed", lang));
    } finally {
      setUploading(false);
    }
  }

  const catName = (cat: Category) => cat.name?.[lang] || cat.name?.en || cat.id;

  function handleSave() {
    const base = nameEn || nameAm || `item-${Date.now()}`;
    const id = initialData?.id || base.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 48) || `item-${Date.now()}`;
    const nameMap: LangMap = { en: nameEn, am: nameAm, om: nameOm || undefined };
    const descMap: LangMap = { en: descEn, am: descAm, om: descOm || undefined };
    onSave({ id, name: nameMap, description: descMap, price: Number(price), category, image });
  }

  const canSave = !isSaving && !!nameEn && !!price;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={e => e.target === e.currentTarget && onCancel()}
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-xl overflow-hidden flex flex-col"
        style={{ maxHeight: "94dvh" }}
      >
        {/* Drag handle — mobile */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-stone-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 flex-shrink-0">
          <h3 className="font-bold text-[#1B2A4A] text-sm">{initialData ? t("editItem", lang) : t("newItem", lang)}</h3>
          <button onClick={onCancel} className="p-1.5 hover:bg-stone-100 rounded-lg text-stone-400 transition-colors touch-manipulation">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 overscroll-contain">
          <div className="p-4 space-y-4">

            {/* ── Row 1: Photo + Price & Category side by side ── */}
            <div className="flex gap-3">
              {/* Photo */}
              <div className="flex-shrink-0">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{t("photo", lang)}</p>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="hidden" onChange={handleFileChange} />
                <div
                  onClick={() => !uploading && fileInputRef.current?.click()}
                  className={cn(
                    "relative w-24 h-24 rounded-xl border-2 border-dashed overflow-hidden cursor-pointer transition-colors group touch-manipulation",
                    image ? "border-slate-200" : "border-slate-300 hover:border-[#C1440E]/60 bg-slate-50"
                  )}
                >
                  {image ? (
                    <>
                      <img src={image} alt="" className="w-full h-full object-cover group-hover:opacity-70 transition-opacity" loading="lazy" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                        <Camera className="w-5 h-5 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                      {uploading
                        ? <div className="w-5 h-5 border-2 border-[#C1440E]/40 border-t-[#C1440E] rounded-full animate-spin" />
                        : <Camera className="w-6 h-6 text-slate-300" />}
                      <span className="text-[10px] text-slate-400 text-center leading-tight px-1">
                        {uploading ? t("uploading", lang) : t("selectPhoto", lang)}
                      </span>
                    </div>
                  )}
                </div>
                {uploadError && <p className="text-red-500 text-[10px] mt-1">{uploadError}</p>}

                {/* Image resize/preview modal */}
                {pendingFile && previewUrl && (
                  <div className="fixed inset-0 bg-black/75 z-[200] flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                        <h4 className="font-bold text-[#1B2A4A] text-sm">
                          {lang === "en" ? "Adjust Photo" : lang === "am" ? "ፎቶ አስተካክል" : "Fakkii Sirreessi"}
                        </h4>
                        <button onClick={() => setPendingFile(null)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="rounded-xl overflow-hidden bg-slate-100" style={{ aspectRatio: "1/1" }}>
                          <img
                            src={previewUrl}
                            alt=""
                            className="w-full h-full object-cover transition-transform"
                            style={{ transform: `scale(${cropScale})`, transformOrigin: "center" }}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[11px] text-slate-500">
                            <span>{lang === "en" ? "Zoom" : lang === "am" ? "ማጉሊያ" : "Guddisi"}</span>
                            <span>{Math.round(cropScale * 100)}%</span>
                          </div>
                          <input
                            type="range" min="1" max="2.5" step="0.05"
                            value={cropScale}
                            onChange={e => setCropScale(Number(e.target.value))}
                            className="w-full accent-[#C1440E] h-1.5 cursor-pointer"
                          />
                          <div className="flex justify-between text-[10px] text-slate-400">
                            <span>1×</span><span>2.5×</span>
                          </div>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => setPendingFile(null)}
                            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 font-medium touch-manipulation"
                          >
                            {t("cancel", lang)}
                          </button>
                          <button
                            onClick={handleCropUpload}
                            disabled={uploading}
                            className="flex-1 py-2.5 rounded-xl bg-[#C1440E] text-white text-sm font-semibold touch-manipulation disabled:opacity-60 flex items-center justify-center gap-2"
                          >
                            {uploading
                              ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />{t("uploading", lang)}</>
                              : (lang === "en" ? "Upload" : lang === "am" ? "ጫን" : "Fe'i")}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Price + Category stacked */}
              <div className="flex-1 flex flex-col gap-2 justify-center">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                    {t("price", lang)} <span className="text-[#C1440E]">*</span>
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    className={inputCls}
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{t("category", lang)}</label>
                  <div className="relative">
                    <select value={category} onChange={e => setCat(e.target.value)} className={selectCls}>
                      {categories.map(c => <option key={c.id} value={c.id}>{catName(c)}</option>)}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Row 2: English, Amharic & Oromo ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* English */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-base">🇬🇧</span>
                  <span className="text-xs font-bold text-[#1B2A4A]">English</span>
                  <span className="text-[#C1440E] text-xs font-bold">*</span>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">{t("itemName", lang)}</label>
                  <input
                    value={nameEn}
                    onChange={e => setNameEn(e.target.value)}
                    className={inputCls}
                    placeholder="e.g. Grilled Chicken"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">{t("description", lang)}</label>
                  <textarea
                    value={descEn}
                    onChange={e => setDescEn(e.target.value)}
                    className={cn(inputCls, "resize-none")}
                    rows={3}
                    placeholder="e.g. Tender grilled chicken with herbs"
                  />
                </div>
              </div>

              {/* Amharic */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-base">🇪🇹</span>
                  <span className="text-xs font-bold text-[#1B2A4A]">አማርኛ</span>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">{t("itemName", lang)}</label>
                  <input
                    value={nameAm}
                    onChange={e => setNameAm(e.target.value)}
                    className={inputCls}
                    placeholder="ምሳሌ፦ የተጠበሰ ዶሮ"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">{t("description", lang)}</label>
                  <textarea
                    value={descAm}
                    onChange={e => setDescAm(e.target.value)}
                    className={cn(inputCls, "resize-none")}
                    rows={3}
                    placeholder="ምሳሌ፦ ከዕፅዋት ጋር የተጠበሰ ዶሮ"
                  />
                </div>
              </div>

              {/* Oromo */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-base">🟢</span>
                  <span className="text-xs font-bold text-[#1B2A4A]">Afaan Oromoo</span>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">{t("itemName", lang)}</label>
                  <input
                    value={nameOm}
                    onChange={e => setNameOm(e.target.value)}
                    className={inputCls}
                    placeholder="fkn. Loonii Qanafame"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">{t("description", lang)}</label>
                  <textarea
                    value={descOm}
                    onChange={e => setDescOm(e.target.value)}
                    className={cn(inputCls, "resize-none")}
                    rows={3}
                    placeholder="fkn. Loonii qanafame mi'aawoo dabalatee"
                  />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div
          className="px-4 py-3 border-t border-stone-100 flex items-center justify-end gap-2 flex-shrink-0 bg-white"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <button onClick={onCancel} className="px-4 py-2 text-stone-500 hover:bg-stone-100 rounded-lg text-sm transition-colors font-medium touch-manipulation">
            {t("cancel", lang)}
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="flex items-center gap-1.5 bg-[#C1440E] hover:bg-[#a83a0c] text-white px-5 py-2 rounded-lg font-semibold text-sm disabled:opacity-40 transition-colors shadow-sm shadow-[#C1440E]/20 touch-manipulation"
          >
            <Save className="w-3.5 h-3.5" />{isSaving ? t("saving", lang) : t("save", lang)}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* Numbered section header */
function SectionHeader({ n, label, flag }: { n: number; label: string; flag?: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <span className="w-6 h-6 rounded-full bg-[#1B2A4A] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">
        {n}
      </span>
      {flag && <span className="text-base">{flag}</span>}
      <span className="text-sm font-bold text-[#1B2A4A]">{label}</span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  );
}

function FormField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline gap-1.5">
        <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide">{label}</label>
        {hint && <span className="text-[#C1440E] text-xs font-bold">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

/* ═══════════════════════ CATEGORIES TAB ═══════════════════════ */
function CategoriesTab({ lang }: { lang: AdminLang }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editCat, setEditCat]   = useState<Category | null>(null);
  const [form, setForm]         = useState({ id: "", en: "", am: "", om: "" });

  const { data: categories = [] } = useQuery<Category[]>({ queryKey: ["admin-categories"], queryFn: async () => { const r = await authFetch(`${API_BASE}/categories`, { cache: "no-store" }); return r.json(); }, placeholderData: INITIAL_CATEGORIES as unknown as Category[], staleTime: 0, gcTime: 30 * 60_000 });
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const isEdit = !!editCat;
      await authFetch(isEdit ? `${API_BASE}/categories/${editCat!.id}` : `${API_BASE}/categories`, { method: isEdit ? "PUT" : "POST", body: JSON.stringify(data) });
    },
    onSuccess: async () => { await queryClient.refetchQueries({ queryKey: ["admin-categories"] }); setShowForm(false); setEditCat(null); }
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await authFetch(`${API_BASE}/categories/${id}`, { method: "DELETE" }); },
    onSuccess: async () => { await queryClient.refetchQueries({ queryKey: ["admin-categories"] }); }
  });
  const reorderMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await authFetch(`${API_BASE}/categories/reorder`, {
        method: "POST",
        body: JSON.stringify({ ids }),
      });
      if (!response.ok) throw new Error("Could not reorder categories");
      return response.json() as Promise<Category[]>;
    },
    onSuccess: (updated) => queryClient.setQueryData(["admin-categories"], updated),
  });

  function openAdd() { setEditCat(null); setForm({ id: "", en: "", am: "", om: "" }); setShowForm(true); }

  const catName = (cat: Category) => cat.name?.[lang] || cat.name?.en || cat.id;
  function moveCategory(index: number, offset: -1 | 1) {
    const next = [...categories];
    const target = index + offset;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    reorderMutation.mutate(next.map((category) => category.id));
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          <span className="font-semibold text-slate-700">{categories.length}</span> {t("catCountLabel", lang)}
        </p>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-[#C1440E] hover:bg-[#a83a0c] text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm shadow-[#C1440E]/20 touch-manipulation"
        >
          <Plus className="w-4 h-4" /> {t("addCat", lang)}
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">
                {editCat ? t("editCatTitle", lang) : t("newCat", lang)}
              </h3>
              <button
                onClick={() => { setShowForm(false); setEditCat(null); }}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors touch-manipulation"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              {/* English */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                  🇬🇧 English <span className="text-[#C1440E]">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    value={form.en}
                    onChange={e => setForm({ ...form, en: e.target.value })}
                    className={inputCls}
                    placeholder="e.g. Starters"
                  />
                  {form.en && <Check className="w-4 h-4 text-green-500 flex-shrink-0" />}
                </div>
              </div>
              {/* Amharic */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                  🇪🇹 አማርኛ
                </label>
                <div className="flex items-center gap-2">
                  <input
                    value={form.am}
                    onChange={e => setForm({ ...form, am: e.target.value })}
                    className={inputCls}
                    placeholder="ምሳሌ፦ ቀዳሚ ምግቦች"
                  />
                  {form.am && <Check className="w-4 h-4 text-green-500 flex-shrink-0" />}
                </div>
              </div>
              {/* Oromo */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                  🟢 Afaan Oromoo
                </label>
                <div className="flex items-center gap-2">
                  <input
                    value={form.om}
                    onChange={e => setForm({ ...form, om: e.target.value })}
                    className={inputCls}
                    placeholder="fkn. Qophii Jalqabaa"
                  />
                  {form.om && <Check className="w-4 h-4 text-green-500 flex-shrink-0" />}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    saveMutation.mutate({
                      name: { en: form.en, am: form.am, om: form.om || undefined },
                      ...(editCat ? { order: editCat.order } : {}),
                    });
                  }}
                  disabled={saveMutation.isPending || !form.en}
                  className="flex items-center gap-2 bg-[#C1440E] hover:bg-[#a83a0c] text-white px-5 py-2.5 rounded-xl font-semibold text-sm disabled:opacity-40 transition-colors touch-manipulation"
                >
                  <Save className="w-4 h-4" />{saveMutation.isPending ? t("saving", lang) : t("save", lang)}
                </button>
                <button
                  onClick={() => { setShowForm(false); setEditCat(null); }}
                  className="px-4 py-2.5 text-slate-400 hover:bg-slate-100 rounded-xl text-sm transition-colors touch-manipulation"
                >
                  {t("cancel", lang)}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-300">
            <Layers className="w-10 h-10 mb-3" />
            <p className="text-slate-400 font-semibold text-sm">{t("noCats", lang)}</p>
            <button onClick={openAdd} className="mt-3 text-[#C1440E] text-sm font-semibold hover:underline touch-manipulation">{t("addFirstCat", lang)}</button>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {categories.map((cat, i) => (
              <div
                key={cat.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors group",
                  editCat?.id === cat.id && showForm && "bg-orange-50/40"
                )}
              >
                <span className="w-6 text-center text-xs font-bold text-slate-300 flex-shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm">{catName(cat)}</p>
                  <p className="text-slate-400 text-xs truncate mt-0.5">
                    {[cat.name?.en, cat.name?.am, cat.name?.om].filter(Boolean).join("  ·  ")}
                  </p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => moveCategory(i, -1)}
                    disabled={i === 0 || reorderMutation.isPending}
                    aria-label="Move category up"
                    className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors touch-manipulation disabled:opacity-30"
                  >
                    <ChevronDown className="w-3.5 h-3.5 rotate-180" />
                  </button>
                  <button
                    onClick={() => moveCategory(i, 1)}
                    disabled={i === categories.length - 1 || reorderMutation.isPending}
                    aria-label="Move category down"
                    className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors touch-manipulation disabled:opacity-30"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (editCat?.id === cat.id && showForm) { setShowForm(false); setEditCat(null); return; }
                      setEditCat(cat);
                      setForm({ id: cat.id, en: cat.name.en, am: cat.name.am, om: cat.name.om || "" });
                      setShowForm(true);
                    }}
                    className={cn(
                      "p-2 rounded-lg transition-colors touch-manipulation",
                      editCat?.id === cat.id && showForm
                        ? "bg-[#C1440E] text-white"
                        : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    )}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => { if (confirm(t("confirmDelCat", lang))) deleteMutation.mutate(cat.id); }}
                    className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors touch-manipulation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════ TABLES TAB ═══════════════════════ */
function TablesTab({ lang }: { lang: AdminLang }) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [newLoc, setNewLoc]   = useState("");

  const { data: tables = [] } = useQuery<Table[]>({ queryKey: ["admin-tables"], queryFn: async () => { const r = await authFetch(`${API_BASE}/tables`, { cache: "no-store" }); return r.json(); }, staleTime: 0 });
  const addMutation = useMutation({
    mutationFn: async () => { await authFetch(`${API_BASE}/tables`, { method: "POST", body: JSON.stringify({ location: newLoc || "Indoor" }) }); },
    onSuccess: async () => { await queryClient.refetchQueries({ queryKey: ["admin-tables"] }); setShowAdd(false); setNewLoc(""); }
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await authFetch(`${API_BASE}/tables/${id}`, { method: "DELETE" }); },
    onSuccess: async () => { await queryClient.refetchQueries({ queryKey: ["admin-tables"] }); }
  });

  const statusColor: Record<string, string> = {
    available: "bg-green-100 text-green-700 border-green-200",
    occupied:  "bg-amber-100 text-amber-700 border-amber-200",
    reserved:  "bg-blue-100 text-blue-700 border-blue-200",
  };
  const statusLabel: Record<string, string> = {
    available: t("stAvailable", lang),
    occupied:  t("stOccupied", lang),
    reserved:  t("stReserved", lang),
  };

  function getQrUrl(tableId: string) {
    const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
    return `${window.location.origin}${basePath}/masa/${encodeURIComponent(tableId)}?qr=true`;
  }

  function downloadQr(tableId: string, tableNumber: number) {
    const qrCanvas = document.getElementById(`table-qr-dl-${tableId}`) as HTMLCanvasElement;
    if (!qrCanvas) return;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    if (isIOS) {
      // iOS Safari can't download blobs — open data URL in new tab, user long-presses to save
      const dataUrl = qrCanvas.toDataURL("image/png");
      const win = window.open("", "_blank");
      if (win) {
        win.document.write(
          `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
          <title>Masa ${tableNumber} QR</title>
          <style>body{margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;background:#f8f5f2;font-family:sans-serif;padding:20px;box-sizing:border-box}
          img{max-width:280px;width:100%;border:1px solid #eee;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,.1)}
          p{color:#555;font-size:14px;margin-top:16px;text-align:center}</style></head>
          <body><img src="${dataUrl}" alt="QR Masa ${tableNumber}"/><p>Basılı tutun → Fotoğraflara kaydet</p></body></html>`
        );
        win.document.close();
      }
    } else {
      qrCanvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = `arab-ali-hotel-masa-${tableNumber}.png`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1500);
      }, "image/png");
    }
  }

  return (
    <div className="space-y-5" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-[#1B2A4A] text-base sm:text-lg">{t("tableMgmt", lang)}</h2>
          <p className="text-slate-400 text-xs mt-0.5">{tables.length} {t("tableCount", lang)}</p>
        </div>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="flex items-center gap-2 bg-[#1B2A4A] text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#243760] active:bg-[#243760] transition-colors touch-manipulation shadow-sm"
        >
          <Plus className="w-4 h-4" /> {t("addTable", lang)}
        </button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div
            key="add-form"
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/80">
                <h3 className="font-bold text-[#1B2A4A] text-sm">{t("newTable", lang)}</h3>
                <button onClick={() => { setShowAdd(false); setNewLoc(""); }} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 transition-colors touch-manipulation">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 flex gap-3 items-end">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">{t("location", lang)} <span className="text-slate-300 font-normal">{t("optional", lang)}</span></label>
                  <input
                    value={newLoc}
                    onChange={e => setNewLoc(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addMutation.mutate()}
                    placeholder={t("locPlaceholder", lang)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#1B2A4A] rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
                  />
                </div>
                <button
                  onClick={() => addMutation.mutate()}
                  disabled={addMutation.isPending}
                  className="flex items-center gap-2 bg-[#1B2A4A] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#243760] transition-colors disabled:opacity-40 touch-manipulation whitespace-nowrap"
                >
                  {addMutation.isPending ? t("adding", lang) : <><Check className="w-4 h-4" /> {t("add", lang)}</>}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {tables.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-14 text-center">
          <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
            <Table2 className="w-7 h-7 text-slate-300" />
          </div>
          <p className="font-semibold text-slate-400 text-sm">{t("noTables", lang)}</p>
          <p className="text-slate-300 text-xs mt-1">{t("noTablesSub", lang)}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {tables.map(table => (
            <div key={table.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#1B2A4A] rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-black text-sm">{table.number}</span>
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{t("table", lang)} {table.number}</p>
                    <p className="text-slate-400 text-xs">{table.location}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("text-[10px] font-bold px-2 py-1 rounded-full border", statusColor[table.status] || "bg-slate-100 text-slate-500 border-slate-200")}>
                    {statusLabel[table.status] || table.status}
                  </span>
                  <button
                    onClick={() => { if (confirm(t("confirmDelTable", lang))) deleteMutation.mutate(table.id); }}
                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors touch-manipulation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="p-4 flex items-center gap-4">
                {/* Hidden high-res canvas for download */}
                <div className="hidden">
                  <QRCodeCanvas
                    id={`table-qr-dl-${table.id}`}
                    value={getQrUrl(table.id)}
                    size={800}
                    bgColor="#ffffff"
                    fgColor="#0f172a"
                    level="H"
                    marginSize={2}
                  />
                </div>
                <div className="w-20 h-20 bg-white rounded-xl border border-slate-100 flex items-center justify-center flex-shrink-0 p-1.5">
                  <QRCodeCanvas
                    value={getQrUrl(table.id)}
                    size={68}
                    bgColor="#ffffff"
                    fgColor="#0f172a"
                    level="M"
                  />
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <button
                    onClick={() => downloadQr(table.id, table.number)}
                    className="w-full flex items-center justify-center gap-2 bg-[#1B2A4A] hover:bg-[#243760] active:bg-[#243760] text-white text-xs font-semibold py-2.5 rounded-xl transition-colors touch-manipulation"
                  >
                    <Download className="w-3.5 h-3.5" />{t("downloadQr", lang)}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════ REVIEWS TAB ════════════════════════ */
const MOOD_EMOJI: Record<string, string> = { Excellent: "😍", Good: "😊", Okay: "😐", Poor: "😕" };
const MOOD_LABEL: Record<string, Record<AdminLang, string>> = {
  Excellent: { en: "Excellent", am: "አስደናቂ",    om: "Baay'ee Gaarii" },
  Good:      { en: "Good",      am: "ጥሩ",       om: "Gaarii"         },
  Okay:      { en: "Okay",      am: "መካከለኛ",    om: "Giddugaleessa"  },
  Poor:      { en: "Poor",      am: "አልተመቸኝም", om: "Gaaritti Miti"  },
};

function ReviewsTab({ lang }: { lang: AdminLang }) {
  const queryClient = useQueryClient();

  const { data: reviews = [], isLoading } = useQuery<Review[]>({
    queryKey: ["admin-reviews"],
    queryFn: async () => { const r = await authFetch(`${API_BASE}/reviews`); const data = await r.json(); return Array.isArray(data) ? data : []; },
    staleTime: 0,
    refetchInterval: 4_000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await authFetch(`${API_BASE}/reviews/${id}`, { method: "DELETE" }); },
    onSuccess: async () => { await queryClient.refetchQueries({ queryKey: ["admin-reviews"] }); },
  });

  const total = reviews.length;
  const withStars = reviews.filter(r => r.stars > 0);
  const avgStars = withStars.length ? (withStars.reduce((s, r) => s + r.stars, 0) / withStars.length).toFixed(1) : null;
  const moodCounts = reviews.reduce((acc, r) => { if (r.mood) acc[r.mood] = (acc[r.mood] || 0) + 1; return acc; }, {} as Record<string, number>);
  const topMoods = Object.entries(moodCounts).sort((a, b) => b[1] - a[1]).slice(0, 2);

  return (
    <div className="space-y-4" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-[#1B2A4A] text-base sm:text-lg">{t("reviewsMgmt", lang)}</h2>
          <p className="text-slate-400 text-xs mt-0.5">{total} {t("totalReviews", lang)}</p>
        </div>
        {avgStars && (
          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-100 rounded-xl px-3 py-1.5">
            <span className="text-amber-400 text-base leading-none">★</span>
            <span className="font-bold text-amber-600 text-sm">{avgStars}</span>
            <span className="text-amber-400 text-[10px] font-medium">/ 5</span>
          </div>
        )}
      </div>

      {/* Mood summary chips */}
      {topMoods.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {topMoods.map(([mood, count]) => (
            <div key={mood} className="flex items-center gap-1.5 bg-white border border-slate-100 rounded-full px-3 py-1 shadow-sm">
              <span className="text-sm leading-none">{MOOD_EMOJI[mood] || "😐"}</span>
              <span className="text-xs font-semibold text-slate-600">{MOOD_LABEL[mood]?.[lang] ?? mood}</span>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 rounded-full px-1.5 py-0.5">{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Review list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
          <Circle className="w-4 h-4 animate-spin" />
          <span className="text-sm">{lang === "en" ? "Loading…" : lang === "am" ? "እየጫነ..." : "Fe'aa jira…"}</span>
        </div>
      ) : reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-100 shadow-sm gap-3">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center text-3xl">📭</div>
          <div className="text-center">
            <p className="font-semibold text-[#1B2A4A]">{t("noReviews", lang)}</p>
            <p className="text-xs text-slate-400 mt-1">{t("noReviewsSub", lang)}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {reviews.map(review => {
            const isPositive = review.mood === "Excellent" || review.mood === "Good" || review.stars >= 4;
            const isNeutral  = review.mood === "Okay";
            const accentColor = isPositive ? "#22c55e" : isNeutral ? "#f59e0b" : "#f97316";
            return (
              <div key={review.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="flex">
                  {/* Left accent bar */}
                  <div className="w-1 flex-shrink-0" style={{ background: accentColor }} />
                  <div className="flex-1 p-4 min-w-0">
                    {/* Top row: table + mood + stars + delete */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                        {lang === "en" ? "Table" : lang === "am" ? "ጠረጴዛ" : "Xarabbeza"} {review.tableNumber || review.tableId}
                      </span>
                      {review.mood && (
                        <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                          {MOOD_EMOJI[review.mood]}
                          {MOOD_LABEL[review.mood]?.[lang] ?? review.mood}
                        </span>
                      )}
                      {review.stars > 0 && (
                        <span className="text-xs tracking-wide" style={{ color: accentColor }}>
                          {"★".repeat(review.stars)}
                          <span className="opacity-25">{"★".repeat(5 - review.stars)}</span>
                        </span>
                      )}
                      <button
                        onClick={() => deleteMutation.mutate(review.id)}
                        disabled={deleteMutation.isPending}
                        title={t("deleteReview", lang)}
                        className="ml-auto w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:bg-red-50 hover:text-red-400 transition-colors flex-shrink-0 touch-manipulation"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    {/* Comment */}
                    {review.comment && (
                      <p className="text-sm text-slate-700 mt-2 leading-relaxed">{review.comment}</p>
                    )}
                    {/* Date */}
                    <p className="text-[10px] text-slate-300 mt-2">
                      {new Date(review.createdAt).toLocaleDateString("en-GB", {
                        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                      })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════ SETTINGS TAB ═══════════════════════ */
function SettingsTab({ lang }: { lang: AdminLang }) {
  const queryClient = useQueryClient();
  const [restaurantName, setRestaurantName] = useState("");
  const [restaurantNameSaving, setRestaurantNameSaving] = useState(false);
  const [restaurantNameMsg, setRestaurantNameMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [logo, setLogo] = useState<string | null>(null);
  const [logoSaving, setLogoSaving] = useState(false);
  const [logoMsg, setLogoMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const logoInputRef = React.useRef<HTMLInputElement>(null);

  function refreshMenuBranding() {
    void queryClient.invalidateQueries({ queryKey: ["bundle"] });
    try {
      localStorage.removeItem("al_bundle_v2");
      localStorage.removeItem("al_bundle_v3");
    } catch {}
  }

  useEffect(() => {
    authFetch(`${API_BASE}/settings`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.restaurantName) setRestaurantName(data.restaurantName);
        setLogo(typeof data?.logo === "string" ? data.logo : null);
      })
      .catch(() => {});
  }, []);

  async function uploadRestaurantLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;

    setLogoSaving(true);
    setLogoMsg(null);
    const form = new FormData();
    form.append("image", file);
    try {
      const res = await authFetch(`${API_BASE}/upload/logo`, { method: "POST", body: form });
      const data = await res.json() as { url?: unknown };
      if (!res.ok || typeof data.url !== "string") throw new Error("Logo upload failed");
      setLogo(data.url);
      refreshMenuBranding();
      setLogoMsg({ ok: true, text: t("logoUpdated", lang) });
    } catch {
      setLogoMsg({ ok: false, text: t("logoFailed", lang) });
    } finally {
      setLogoSaving(false);
    }
  }

  async function removeRestaurantLogo() {
    setLogoSaving(true);
    setLogoMsg(null);
    try {
      const res = await authFetch(`${API_BASE}/settings`, {
        method: "PATCH",
        body: JSON.stringify({ logo: null }),
      });
      if (!res.ok) throw new Error("Logo removal failed");
      setLogo(null);
      refreshMenuBranding();
      setLogoMsg({ ok: true, text: t("logoRemoved", lang) });
    } catch {
      setLogoMsg({ ok: false, text: t("logoFailed", lang) });
    } finally {
      setLogoSaving(false);
    }
  }

  async function saveRestaurantName(e: React.FormEvent) {
    e.preventDefault();
    const value = restaurantName.trim();
    if (!value) {
      setRestaurantNameMsg({ ok: false, text: t("restaurantNameRequired", lang) });
      return;
    }
    setRestaurantNameSaving(true);
    setRestaurantNameMsg(null);
    const res = await authFetch(`${API_BASE}/settings`, {
      method: "PATCH",
      body: JSON.stringify({ restaurantName: value }),
    });
    setRestaurantNameSaving(false);
    if (res.ok) refreshMenuBranding();
    setRestaurantNameMsg({
      ok: res.ok,
      text: res.ok ? t("restaurantNameSaved", lang) : "Could not save restaurant settings.",
    });
  }

  return (
    <div className="w-full">

      {/* ── Restaurant logo card ── */}
      <div className="mt-8 mb-6">
        <h2 className="text-lg font-bold text-[#1B2A4A] flex items-center gap-2">
          <Camera className="w-5 h-5 text-[#C1440E]" />
          {t("logoSection", lang)}
        </h2>
        <p className="text-sm text-slate-400 mt-0.5 ml-7">
          {t("logoDesc", lang)}
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mb-8">
        <div className="p-6 flex flex-col sm:flex-row items-center gap-5">
          <div className="w-28 h-24 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center p-3 shrink-0">
            {logo
              ? <img src={logo} alt={t("logoSection", lang)} className="max-w-full max-h-full object-contain" />
              : <span className="text-xs text-slate-400">{t("noLogo", lang)}</span>}
          </div>
          <div className="w-full space-y-3">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={uploadRestaurantLogo}
            />
            <button
              type="button"
              disabled={logoSaving}
              onClick={() => logoInputRef.current?.click()}
              className="w-full bg-[#1B2A4A] hover:bg-[#243760] text-white font-semibold py-3 rounded-2xl text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Camera className="w-4 h-4" />
              {logoSaving ? t("uploading", lang) : logo ? t("changeLogo", lang) : t("uploadLogo", lang)}
            </button>
            {logo && (
              <button
                type="button"
                disabled={logoSaving}
                onClick={removeRestaurantLogo}
                className="w-full border border-red-200 text-red-500 hover:bg-red-50 font-semibold py-3 rounded-2xl text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {t("removeLogo", lang)}
              </button>
            )}
          </div>
        </div>
        {logoMsg && (
          <div className={cn(
            "mx-6 mb-6 flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-medium",
            logoMsg.ok ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-600 border border-red-100",
          )}>
            {logoMsg.ok ? <Check className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            {logoMsg.text}
          </div>
        )}
      </div>

      {/* ── Restaurant name card ── */}
      <div className="mt-8 mb-6">
        <h2 className="text-lg font-bold text-[#1B2A4A] flex items-center gap-2">
          <UtensilsCrossed className="w-5 h-5 text-[#C1440E]" />
          {t("restaurantName", lang)}
        </h2>
        <p className="text-sm text-slate-400 mt-0.5 ml-7">
          {t("restaurantNameDesc", lang)}
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mb-8">
        <form onSubmit={saveRestaurantName} className="p-6 space-y-4">
          <label className="text-xs font-semibold text-slate-500 mb-2 block uppercase tracking-wide">
            {t("restaurantName", lang)}
          </label>
          <input
            value={restaurantName}
            onChange={e => setRestaurantName(e.target.value)}
            placeholder={t("restaurantNamePlaceholder", lang)}
            maxLength={80}
            className="w-full bg-slate-50 border-2 border-slate-200 focus:border-[#C1440E] rounded-2xl px-4 py-3.5 text-base font-semibold text-[#1B2A4A] outline-none transition-colors"
          />
          <AnimatePresence>
            {restaurantNameMsg && (
              <motion.div
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-medium",
                  restaurantNameMsg.ok ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-600 border border-red-100"
                )}
              >
                {restaurantNameMsg.ok ? <Check className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                {restaurantNameMsg.text}
              </motion.div>
            )}
          </AnimatePresence>
          <button
            type="submit"
            disabled={restaurantNameSaving || !restaurantName.trim()}
            className="w-full bg-[#1B2A4A] hover:bg-[#243760] active:scale-[0.98] text-white font-semibold py-3.5 rounded-2xl text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-[#1B2A4A]/20 touch-manipulation"
          >
            {restaurantNameSaving ? <><Circle className="w-4 h-4 animate-spin" />{t("changing", lang)}</> : <><Save className="w-4 h-4" />{t("save", lang)}</>}
          </button>
        </form>
      </div>

    </div>
  );
}
