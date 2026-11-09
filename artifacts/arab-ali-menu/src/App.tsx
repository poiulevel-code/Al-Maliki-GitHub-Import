import { lazy, Suspense, useEffect, useState } from "react";
import { Switch, Route, Redirect, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ClerkProvider, SignIn, useAuth } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import MenuPage from "@/pages/menu";
import { ChefHat, Settings } from "lucide-react";

const LOGO_URL = "/images/arab-ali-hotel-mark.svg";
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const WaiterPage = lazy(() => import("@/pages/waiter"));
const AdminPage  = lazy(() => import("@/pages/admin"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
      staleTime: 5 * 60_000,
      gcTime: 30 * 60_000,
    },
  },
});

function PageLoading() {
  return <div className="min-h-[100dvh] bg-[#F8F5F2]" />;
}

function StaffLanding() {
  const [, navigate] = useLocation();
  const [restaurantName, setRestaurantName] = useState("ARAB ALI HOTEL");
  const [restaurantLogo, setRestaurantLogo] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/bundle", { cache: "no-store" })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.settings?.restaurantName) setRestaurantName(data.settings.restaurantName);
        setRestaurantLogo(typeof data?.settings?.logo === "string" ? data.settings.logo : null);
      })
      .catch(() => {});
  }, []);

  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #F8F5F0 0%, #EDE8E2 100%)" }}
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full" style={{ background: "rgba(193,68,14,0.06)" }} />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full" style={{ background: "rgba(27,42,74,0.05)" }} />
      </div>

      <div className="relative w-full" style={{ maxWidth: "380px" }}>
        <div className="bg-white rounded-3xl overflow-hidden" style={{ boxShadow: "0 24px 60px rgba(0,0,0,0.12)" }}>

          <div
            className="text-center"
            style={{ background: "#1B2A4A", padding: "40px 32px 32px" }}
          >
            <div
              style={{
                width: 160,
                height: 90,
                margin: "0 auto 20px",
                background: "#fff",
                borderRadius: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "10px 14px",
                boxShadow: "0 8px 32px rgba(0,0,0,0.30)",
                flexShrink: 0,
              }}
            >
              <img
                src={restaurantLogo || LOGO_URL}
                alt={restaurantName}
                width={132}
                height={70}
                loading="eager"
                decoding="async"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            </div>

            <div style={{ height: 1, background: "rgba(212,175,55,0.35)", margin: "0 auto 16px", width: 80 }} />

            <h1
              style={{
                color: "#fff",
                fontSize: 20,
                fontFamily: "Georgia, serif",
                fontWeight: 700,
                letterSpacing: "0.15em",
                margin: 0,
                textAlign: "center",
                textTransform: "uppercase",
              }}
            >{restaurantName}</h1>
            <p style={{
              color: "rgba(212,175,55,0.75)",
              fontSize: 10,
              letterSpacing: "0.3em",
              marginTop: 6,
              marginBottom: 0,
              textAlign: "center",
              textTransform: "uppercase",
              fontWeight: 600,
            }}>
               HOTEL &amp; HOSPITALITY
            </p>
          </div>

          <div style={{ padding: "24px 24px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
            <button
              onClick={() => navigate("/garson")}
              style={{
                display: "flex", alignItems: "center", gap: 16,
                background: "#1a2035", color: "#fff",
                padding: "15px 18px", borderRadius: 16,
                border: "none", cursor: "pointer", width: "100%",
                textAlign: "left",
              }}
            >
              <div style={{
                width: 42, height: 42, background: "rgba(255,255,255,0.1)",
                borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <ChefHat style={{ width: 20, height: 20, color: "#fff" }} />
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: 15, margin: 0, color: "#fff" }}>Waiter Panel</p>
                <p style={{ fontSize: 12, margin: "3px 0 0", color: "rgba(255,255,255,0.45)" }}>
                  Track orders and table calls
                </p>
              </div>
            </button>

            <button
              onClick={() => navigate("/admin")}
              style={{
                display: "flex", alignItems: "center", gap: 16,
                background: "#f5f4f2", color: "#111",
                padding: "15px 18px", borderRadius: 16,
                border: "1px solid #e5e1db", cursor: "pointer", width: "100%",
                textAlign: "left",
              }}
            >
              <div style={{
                width: 42, height: 42, background: "#ebe8e4",
                borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <Settings style={{ width: 20, height: 20, color: "#555" }} />
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: 15, margin: 0, color: "#111" }}>Admin Panel</p>
                <p style={{ fontSize: 12, margin: "3px 0 0", color: "#999" }}>
                  Manage menu, tables and QR codes
                </p>
              </div>
            </button>
          </div>

          <div style={{ paddingBottom: 8 }} />
        </div>
      </div>
    </div>
  );
}

function ClerkBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={{
        theme: shadcn,
        cssLayerName: "clerk",
        options: {
          logoPlacement: "inside",
          logoLinkUrl: basePath || "/",
          logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
        },
        variables: {
          colorPrimary: "#1B2A4A",
          colorForeground: "#1B2A4A",
          colorMutedForeground: "#6B7280",
          colorBackground: "#FFFFFF",
          colorInput: "#F8F5F0",
          colorInputForeground: "#1B2A4A",
          colorNeutral: "#E5E1DB",
          fontFamily: "Inter, sans-serif",
          borderRadius: "1rem",
        },
        elements: {
          rootBox: "w-full flex justify-center",
          cardBox: "bg-white rounded-3xl w-[440px] max-w-full overflow-hidden shadow-2xl",
          card: "!shadow-none !border-0 !bg-transparent !rounded-none",
          footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
          footerAction: "hidden",
          headerTitle: "text-[#1B2A4A]",
          headerSubtitle: "text-stone-500",
          socialButtonsBlockButtonText: "text-[#1B2A4A]",
          formFieldLabel: "text-[#1B2A4A]",
          footerActionLink: "text-[#C1440E]",
          footerActionText: "text-stone-500",
          dividerText: "text-stone-400",
          formButtonPrimary: "bg-[#1B2A4A] hover:bg-[#243760]",
          formFieldInput: "bg-[#F8F5F0] border-stone-200 text-[#1B2A4A]",
        },
      }}
      signInUrl={`${basePath}/sign-in`}
      localization={{
        signIn: { start: { title: "Sign in to ARAB ALI HOTEL", subtitle: "Continue with Google to access the staff dashboard" } },
      }}
    >
      {children}
    </ClerkProvider>
  );
}

function ProtectedPage({ children, requiredRole }: { children: React.ReactNode; requiredRole: "admin" | "waiter" }) {
  return (
    <ClerkBoundary>
      <ProtectedPageContent requiredRole={requiredRole}>{children}</ProtectedPageContent>
    </ClerkBoundary>
  );
}

function ProtectedPageContent({ children, requiredRole }: { children: React.ReactNode; requiredRole: "admin" | "waiter" }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [access, setAccess] = useState<"loading" | "allowed" | "denied">("loading");
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;
    fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Access check failed");
        return await response.json() as { authenticated: boolean; role: string | null };
      })
      .then((result) => {
        if (cancelled) return;
        setRole(result.role);
        setAccess(result.authenticated && result.role === requiredRole ? "allowed" : "denied");
      })
      .catch(() => {
        if (!cancelled) setAccess("denied");
      });
    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn, requiredRole]);

  if (!isLoaded) return <PageLoading />;
  if (!isSignedIn) return <Redirect to="/sign-in" />;
  if (access === "loading") return <PageLoading />;
  if (access === "denied") {
    return (
      <div className="min-h-[100dvh] bg-[#F8F5F0] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl shadow-stone-200/80 p-8 text-center">
          <h1 className="text-[#1B2A4A] text-lg font-bold">Access not available</h1>
          <p className="text-stone-500 text-sm mt-3">
            {role
              ? "You do not have access to this page."
              : "You do not have permission yet. An administrator must assign you a staff role."}
          </p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

function SignInPage() {
  return (
    <ClerkBoundary>
      <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
        <SignIn
          routing="path"
          path={`${basePath}/sign-in`}
        />
      </div>
    </ClerkBoundary>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Switch>
        <Route path="/" component={StaffLanding} />
        <Route path="/masa" component={MenuPage} />
        <Route path="/masa/:tableId" component={MenuPage} />
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?">
          <Redirect to="/sign-in" />
        </Route>
        <Route path="/garson">
          <ProtectedPage requiredRole="waiter"><WaiterPage /></ProtectedPage>
        </Route>
        <Route path="/admin">
          <ProtectedPage requiredRole="admin"><AdminPage /></ProtectedPage>
        </Route>
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  useEffect(() => {
    const shell = document.getElementById("app-shell");
    if (shell) shell.remove();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={basePath}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
