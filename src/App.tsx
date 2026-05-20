import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { CartSidebar } from "@/components/CartSidebar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ScrollToTop } from "@/components/ScrollToTop";
import { CookieConsent } from "@/components/CookieConsent";
import Index from "./pages/Index.tsx";

// Lazy-loaded routes for code splitting
const DesignYourOwn = lazy(() => import("./pages/DesignYourOwn.tsx"));
const OurCollection = lazy(() => import("./pages/OurCollection.tsx"));
const ProductDetail = lazy(() => import("./pages/ProductDetail.tsx"));
const Auth = lazy(() => import("./pages/Auth.tsx"));
const Checkout = lazy(() => import("./pages/Checkout.tsx"));
const Admin = lazy(() => import("./pages/Admin.tsx"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess.tsx"));
const Profile = lazy(() => import("./pages/Profile.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy.tsx"));
const Terms = lazy(() => import("./pages/Terms.tsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.tsx"));
const Install = lazy(() => import("./pages/Install.tsx"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep data fresh for 5 minutes — avoids refetching products / categories
      // every time the user navigates between pages.
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const DynamicLang = () => {
  const { i18n } = useTranslation();
  useEffect(() => {
    document.documentElement.lang = i18n.language || "lv";
  }, [i18n.language]);
  return null;
};

const DEFAULT_VIEWPORT = "width=device-width, initial-scale=1.0, viewport-fit=cover";

const ViewportRecovery = () => {
  const { user, loading } = useAuth();

  useEffect(() => {
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (!viewportMeta) return;

    const setViewport = (content: string) => {
      if (viewportMeta.getAttribute("content") !== content) {
        viewportMeta.setAttribute("content", content);
      }
    };

    const resetViewport = () => {
      setViewport(DEFAULT_VIEWPORT);
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    };

    const hasOAuthReturnParams =
      new URLSearchParams(window.location.search).has("access_token") ||
      new URLSearchParams(window.location.search).has("refresh_token") ||
      window.location.hash.includes("access_token") ||
      window.location.hash.includes("refresh_token") ||
      window.location.hash.includes("error") ||
      new URLSearchParams(window.location.search).has("code");

    const cameFromGoogle = document.referrer.includes("google.");

    const handlePageShow = () => {
      if (cameFromGoogle || hasOAuthReturnParams) {
        resetViewport();
      }
    };

    const handleFocus = () => {
      if (document.visibilityState === "visible" && (cameFromGoogle || hasOAuthReturnParams)) {
        resetViewport();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && (cameFromGoogle || hasOAuthReturnParams || user)) {
        resetViewport();
      }
    };

    if (!loading && (cameFromGoogle || hasOAuthReturnParams || user)) {
      resetViewport();
    }

    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      setViewport(DEFAULT_VIEWPORT);
    };
  }, [loading, user]);

  return null;
};

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const App = () => {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <AuthProvider>
              <WishlistProvider>
                <CartProvider>
                  <Toaster />
                  <Sonner />
                  <BrowserRouter basename={import.meta.env.BASE_URL}>
                    <DynamicLang />
                    <ViewportRecovery />
                    <ScrollToTop />
                    <CartSidebar />
                    <CookieConsent />
                    <Suspense fallback={<PageLoader />}>
                      <Routes>
                        <Route path="/" element={<Index />} />
                        <Route path="/design" element={<DesignYourOwn />} />
                        <Route path="/collection" element={<OurCollection />} />
                        <Route path="/product/:slug" element={<ProductDetail />} />
                        <Route path="/auth" element={<Auth />} />
                        <Route path="/reset-password" element={<ResetPassword />} />
                        <Route path="/install" element={<Install />} />
                        <Route path="/checkout" element={<Checkout />} />
                        <Route path="/admin" element={<Admin />} />
                        <Route path="/payment-success" element={<PaymentSuccess />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/privacy" element={<PrivacyPolicy />} />
                        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                        <Route path="/privatuma-politika" element={<PrivacyPolicy />} />
                        <Route path="/terms" element={<Terms />} />
                        <Route path="/terms-and-conditions" element={<Terms />} />
                        <Route path="/noteikumi" element={<Terms />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Suspense>
                  </BrowserRouter>
                </CartProvider>
              </WishlistProvider>
            </AuthProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
};

export default App;
