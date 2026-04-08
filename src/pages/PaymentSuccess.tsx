import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, Package, ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useCart } from "@/context/CartContext";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const { clearCart } = useCart();
  const orderId = searchParams.get("order_id");

  useEffect(() => {
    clearCart();
  }, []);

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
            {t("payment.successDesc")}
          </p>

          {orderId && (
            <p className="text-sm text-muted-foreground font-body mb-6">
              {t("payment.orderId")}: <span className="font-semibold text-foreground">{orderId.slice(0, 8)}...</span>
            </p>
          )}

          <div className="flex flex-col gap-3 mt-8">
            <Button
              onClick={() => navigate("/")}
              style={{ background: "var(--gradient-brand)" }}
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
