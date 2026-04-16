import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, Package, ArrowLeft, User as UserIcon } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const { clearCart } = useCart();
  const { user } = useAuth();
  const orderId = searchParams.get("order_id");
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    if (!cleared) {
      clearCart();
      setCleared(true);
    }
  }, [cleared, clearCart]);

  const isGuest = !user;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center pt-24 pb-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-md mx-auto px-4"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            <CheckCircle className="w-20 h-20 mx-auto mb-6" style={{ color: "hsl(var(--primary))" }} />
          </motion.div>

          <h1 className="text-3xl font-display mb-3">{t("payment.successTitle")}</h1>
          <p className="text-muted-foreground font-body mb-2">
            {isGuest ? t("payment.successDescGuest") : t("payment.successDesc")}
          </p>

          {orderId && (
            <p className="text-sm text-muted-foreground font-body mb-2">
              {t("payment.orderId")}: <span className="font-semibold text-foreground">{orderId.slice(0, 8)}...</span>
            </p>
          )}

          {isGuest && (
            <div className="mt-6 p-4 rounded-lg border border-border bg-card">
              <p className="text-sm text-muted-foreground font-body">
                {t("payment.createAccountHint")}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/auth")}
                className="mt-3 font-body"
              >
                <UserIcon className="w-4 h-4 mr-2" />
                {t("auth.register")}
              </Button>
            </div>
          )}

          <div className="flex flex-col gap-3 mt-8">
            {!isGuest && (
              <Button
                onClick={() => navigate("/profile")}
                style={{ background: "var(--gradient-brand)" }}
                className="py-6 text-base font-body font-semibold"
              >
                <Package className="w-5 h-5 mr-2" />
                {t("payment.viewInProfile")}
              </Button>
            )}
            <Button
              onClick={() => navigate("/")}
              variant={isGuest ? "default" : "outline"}
              style={isGuest ? { background: "var(--gradient-brand)" } : undefined}
              className="py-6 text-base font-body font-semibold"
            >
              <Package className="w-5 h-5 mr-2" />
              {t("payment.backToHome")}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/design")}
              className="font-body"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("payment.continueShopping")}
            </Button>
          </div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default PaymentSuccess;
