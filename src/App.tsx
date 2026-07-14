import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Navigate, useLocation, useParams } from "react-router-dom";
import { resolveProductSlug } from "@/lib/slug";
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
import { GaPageviews } from "@/components/GaPageviews";
import { redirectToCanonicalHost } from "@/lib/authDomain";
import { applyMobileViewportLock, cleanOAuthReturnUrl, getDefaultViewport, hasMobileOAuthViewportReturn, isMobileLikeViewport, shouldReloadAfterMobileOAuthReturn } from "@/lib/mobileViewport";
import Index from "./pages/Index.tsx";

// Legacy redirect: send old indexed URLs to their current equivalents.
// Preserves SEO signal as Google reprocesses the redirected paths.
// SPA hosting can't emit true HTTP 301s, so we do the strongest client-side
// equivalent that Google treats as a permanent redirect:
//   - `history.replace` (removes old URL from history)
//   - <link rel="canonical"> pointing at the new URL, injected before nav
//   - noindex on the transient old URL so it drops out of the index while
//     link equity consolidates on the target.
const LegacyRedirect = ({ to }: { to: string }) => {
  const { search, pathname } = useLocation();
  useEffect(() => {
    const origin = window.location.origin;
    const canonicalHref = to.startsWith("/#") ? `${origin}/` : `${origin}${to}`;
    // Add canonical + noindex hints for crawlers that execute the redirect JS.
    const canonical = document.createElement("link");
    canonical.rel = "canonical";
    canonical.href = canonicalHref;
    canonical.setAttribute("data-legacy-redirect", pathname);
    document.head.appendChild(canonical);
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex, follow";
    robots.setAttribute("data-legacy-redirect", pathname);
    document.head.appendChild(robots);
    return () => {
      canonical.remove();
      robots.remove();
    };
  }, [to, pathname]);
  return <Navigate to={`${to}${search}`} replace />;
};

// Redirect old /product/:slug URLs (English slugs) to the new
// localized /produkti/:slug path. Applies legacy slug remapping
// when the old slug has been renamed.
const LegacyProductRedirect = () => {
  const { slug } = useParams<{ slug: string }>();
  const { search } = useLocation();
  const target = resolveProductSlug(slug);
  if (!target) return <Navigate to="/collection" replace />;
  return <Navigate to={`/produkti/${target}${search}`} replace />;
};

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
const BlogPost = lazy(() => import("./pages/BlogPost.tsx"));
const BlogIndex = lazy(() => import("./pages/BlogIndex.tsx"));
const Veikali = lazy(() => import("./pages/Veikali.tsx"));
const KasIrDtf = lazy(() => import("./pages/KasIrDtf.tsx"));

// SEO landing pages (one per targeted Google search term).
const AudumaMaisinuApdruka = lazy(() => import("./pages/landing/AudumaMaisinuApdruka.tsx"));

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

const ViewportRecovery = () => {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (redirectToCanonicalHost()) return;

    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (!viewportMeta) return;

    const setViewport = (content: string) => {
      if (viewportMeta.getAttribute("content") !== content) {
        viewportMeta.setAttribute("content", content);
      }
    };

    const resetViewport = () => {
      if (isMobileLikeViewport()) {
        applyMobileViewportLock();
      } else {
        setViewport(getDefaultViewport());
      }
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    };

    applyMobileViewportLock();

    const hasOAuthReturnParams =
      new URLSearchParams(window.location.search).has("code") ||
      window.location.hash.includes("error");

    const cameFromGoogle = /google\.|accounts\.google\.|oauth\.lovable\.app|lovable\.app|t-bode\.lv/i.test(document.referrer);
    const hasOAuthViewportFlag = hasMobileOAuthViewportReturn();

    const handlePageShow = () => {
      if (cameFromGoogle || hasOAuthReturnParams || hasOAuthViewportFlag || isMobileLikeViewport()) {
        resetViewport();
      }
    };

    const handleFocus = () => {
      if (document.visibilityState === "visible" && (cameFromGoogle || hasOAuthReturnParams || hasOAuthViewportFlag || isMobileLikeViewport())) {
        resetViewport();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && (cameFromGoogle || hasOAuthReturnParams || hasOAuthViewportFlag || user || isMobileLikeViewport())) {
        resetViewport();
      }
    };

    const handleOAuthReturn = () => resetViewport();
    const handleResize = () => resetViewport();

    if (!loading && (cameFromGoogle || hasOAuthReturnParams || hasOAuthViewportFlag || user || isMobileLikeViewport())) {
      resetViewport();
    }

    if (!loading && user && shouldReloadAfterMobileOAuthReturn()) {
      resetViewport();
      const cleanUrl = cleanOAuthReturnUrl();
      requestAnimationFrame(() => window.location.replace(cleanUrl));
      return;
    }

    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    window.addEventListener("tbode:oauth-return", handleOAuthReturn);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      window.removeEventListener("tbode:oauth-return", handleOAuthReturn);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
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
                    <GaPageviews />
                    <Suspense fallback={<PageLoader />}>
                      <Routes>
                        <Route path="/" element={<Index />} />
                        <Route path="/design" element={<DesignYourOwn />} />
                        <Route path="/collection" element={<OurCollection />} />
                        <Route path="/produkti/:slug" element={<ProductDetail />} />
                        {/* Legacy: old English product URL → new Latvian path */}
                        <Route path="/product/:slug" element={<LegacyProductRedirect />} />
                        <Route path="/products/:slug" element={<LegacyProductRedirect />} />
                        <Route path="/auth" element={<Auth />} />
                        <Route path="/reset-password" element={<ResetPassword />} />
                        <Route path="/install" element={<Install />} />
                        <Route path="/checkout" element={<Checkout />} />
                        <Route path="/admin" element={<Admin />} />
                        <Route path="/blog/:slug" element={<BlogPost />} />
                        <Route path="/blog" element={<BlogIndex />} />
                        <Route path="/payment-success" element={<PaymentSuccess />} />
                        <Route path="/veikali" element={<Veikali />} />
                        <Route path="/auduma-maisinu-apdruka" element={<AudumaMaisinuApdruka />} />
                        <Route path="/kas-ir-dtf" element={<KasIrDtf />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/privacy" element={<PrivacyPolicy />} />
                        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                        <Route path="/privatuma-politika" element={<PrivacyPolicy />} />
                        <Route path="/terms" element={<Terms />} />
                        <Route path="/terms-and-conditions" element={<Terms />} />
                        <Route path="/noteikumi" element={<Terms />} />
                        {/* Legacy URL redirects (old indexed pages → new equivalents) */}
                        {/* Migrated: /stores → /veikali (matches user-requested Google Search Console redirect) */}
                        <Route path="/stores" element={<LegacyRedirect to="/veikali" />} />
                        <Route path="/store" element={<LegacyRedirect to="/veikali" />} />
                        <Route path="/kontakti" element={<LegacyRedirect to="/veikali" />} />
                        <Route path="/contact" element={<LegacyRedirect to="/veikali" />} />
                        <Route path="/locations" element={<LegacyRedirect to="/veikali" />} />
                        <Route path="/pasutisana-un-sutisana" element={<LegacyRedirect to="/#faq" />} />
                        <Route path="/svarigi" element={<LegacyRedirect to="/#faq" />} />
                        <Route path="/faq" element={<LegacyRedirect to="/#faq" />} />
                        <Route path="/design-catalog" element={<LegacyRedirect to="/design" />} />
                        <Route path="/designs" element={<LegacyRedirect to="/design" />} />
                        <Route path="/dizains" element={<LegacyRedirect to="/design" />} />
                        <Route path="/configurator/*" element={<LegacyRedirect to="/design" />} />
                        <Route path="/products" element={<LegacyRedirect to="/collection" />} />
                        <Route path="/veikals" element={<LegacyRedirect to="/collection" />} />
                        <Route path="/shop" element={<LegacyRedirect to="/collection" />} />
                        <Route path="/katalogs" element={<LegacyRedirect to="/collection" />} />
                        <Route path="/kolekcija" element={<LegacyRedirect to="/collection" />} />
                        <Route path="/products/*" element={<LegacyRedirect to="/collection" />} />
                        <Route path="/blogs/*" element={<LegacyRedirect to="/blog" />} />
                        <Route path="/news/*" element={<LegacyRedirect to="/blog" />} />
                        <Route path="/jaunumi/*" element={<LegacyRedirect to="/blog" />} />
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
