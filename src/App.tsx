import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
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

const queryClient = new QueryClient();

const DynamicLang = () => {
  const { i18n } = useTranslation();
  useEffect(() => {
    document.documentElement.lang = i18n.language || "lv";
  }, [i18n.language]);
  return null;
};

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WishlistProvider>
            <CartProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter basename={import.meta.env.BASE_URL}>
              <DynamicLang />
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
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              </BrowserRouter>
            </CartProvider>
          </WishlistProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
