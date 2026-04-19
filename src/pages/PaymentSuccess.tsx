import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, Package, ArrowLeft, User as UserIcon, Landmark, FileText, Copy } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SiteSettings {
  company_name: string;
  bank_name: string;
  bank_iban: string;
  bank_swift: string;
  bank_beneficiary: string;
  payment_instructions_lv: string | null;
  payment_instructions_en: string | null;
}

interface OrderInfo {
  order_number: number | null;
  total: number;
  stripe_invoice_pdf: string | null;
}

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const { clearCart } = useCart();
  const { user } = useAuth();
  const orderId = searchParams.get("order_id");
  const method = searchParams.get("method"); // "bank" => bank transfer
  const isBankTransfer = method === "bank";

  const [cleared, setCleared] = useState(false);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [order, setOrder] = useState<OrderInfo | null>(null);

  useEffect(() => {
    if (!cleared) {
      clearCart();
      setCleared(true);
    }
  }, [cleared, clearCart]);

  useEffect(() => {
    if (!isBankTransfer) return;
    (async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("company_name,bank_name,bank_iban,bank_swift,bank_beneficiary,payment_instructions_lv,payment_instructions_en")
        .limit(1)
        .maybeSingle();
      if (data) setSettings(data as SiteSettings);

      if (orderId) {
        const { data: o } = await supabase
          .from("orders")
          .select("order_number,total,stripe_invoice_pdf")
          .eq("id", orderId)
          .maybeSingle();
        if (o) setOrder(o as OrderInfo);
      }
    })();
  }, [isBankTransfer, orderId]);

  const isGuest = !user;
  const orderRef = order?.order_number != null
    ? `#${String(order.order_number).padStart(4, "0")}`
    : orderId
      ? `#${orderId.slice(0, 8).toUpperCase()}`
      : "";

  const copy = (label: string, value: string) => {
    navigator.clipboard.writeText(value);
    toast.success(`${label} ${t("payment.copied", "nokopēts")}`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center pt-24 pb-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="text-center max-w-xl mx-auto px-4 w-full"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
          >
            {isBankTransfer ? (
              <Landmark className="w-20 h-20 mx-auto mb-6" style={{ color: "hsl(var(--primary))" }} />
            ) : (
              <CheckCircle className="w-20 h-20 mx-auto mb-6" style={{ color: "hsl(var(--primary))" }} />
            )}
          </motion.div>

          <h1 className="text-3xl font-display mb-3">
            {isBankTransfer
              ? t("payment.bankTitle", "Pasūtījums saņemts — gaidām apmaksu")
              : t("payment.successTitle")}
          </h1>
          <p className="text-muted-foreground font-body mb-2">
            {isBankTransfer
              ? t("payment.bankDesc", "Rēķins ar bankas rekvizītiem nosūtīts uz Jūsu e-pastu. Pasūtījumu apstrādāsim, tiklīdz nauda ienāks mūsu kontā (parasti 1-3 darba dienu laikā).")
              : isGuest ? t("payment.successDescGuest") : t("payment.successDesc")}
          </p>

          {orderRef && (
            <p className="text-sm text-muted-foreground font-body mb-2">
              {t("payment.orderId")}: <span className="font-semibold text-foreground">{orderRef}</span>
            </p>
          )}

          {/* Bank details panel */}
          {isBankTransfer && settings && (
            <div className="mt-6 rounded-lg border border-border bg-card p-5 text-left">
              <h2 className="font-display text-lg mb-4 flex items-center gap-2">
                <Landmark className="w-5 h-5" style={{ color: "hsl(var(--primary))" }} />
                {t("payment.bankDetails", "Bankas rekvizīti")}
              </h2>
              <dl className="space-y-3 text-sm font-body">
                <Row label={t("payment.beneficiary", "Saņēmējs")} value={settings.bank_beneficiary} onCopy={copy} />
                <Row label={t("payment.bank", "Banka")} value={settings.bank_name} onCopy={copy} />
                <Row label="IBAN" value={settings.bank_iban} onCopy={copy} mono />
                <Row label="SWIFT/BIC" value={settings.bank_swift} onCopy={copy} mono />
                {orderRef && (
                  <Row
                    label={t("payment.reference", "Maksājuma mērķis")}
                    value={`T-Bode ${orderRef}`}
                    onCopy={copy}
                    highlight
                  />
                )}
                {order?.total != null && (
                  <Row
                    label={t("payment.amount", "Summa")}
                    value={`${Number(order.total).toFixed(2).replace(".", ",")} €`}
                    onCopy={copy}
                    highlight
                  />
                )}
              </dl>

              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground font-body whitespace-pre-line">
                  {(i18n.language === "en" ? settings.payment_instructions_en : settings.payment_instructions_lv) || ""}
                </p>
              </div>

              {order?.stripe_invoice_pdf && (
                <a
                  href={order.stripe_invoice_pdf}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-body font-semibold underline"
                  style={{ color: "hsl(var(--primary))" }}
                >
                  <FileText className="w-4 h-4" />
                  {t("payment.downloadInvoice", "Lejupielādēt rēķinu (PDF)")}
                </a>
              )}
            </div>
          )}

          {isGuest && !isBankTransfer && (
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
              style={isGuest && !isBankTransfer ? { background: "var(--gradient-brand)" } : undefined}
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

const Row = ({
  label,
  value,
  onCopy,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  onCopy: (l: string, v: string) => void;
  mono?: boolean;
  highlight?: boolean;
}) => (
  <div className="flex items-center justify-between gap-3">
    <dt className="text-muted-foreground shrink-0">{label}</dt>
    <dd className="flex items-center gap-2 min-w-0">
      <span
        className={`truncate ${mono ? "font-mono" : ""} ${highlight ? "font-semibold text-foreground" : ""}`}
      >
        {value}
      </span>
      <button
        type="button"
        onClick={() => onCopy(label, value)}
        className="p-1 rounded hover:bg-muted shrink-0"
        aria-label={`Copy ${label}`}
      >
        <Copy className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
    </dd>
  </div>
);

export default PaymentSuccess;
