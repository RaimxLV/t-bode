import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, Package, ArrowLeft, User as UserIcon, Landmark, FileText, Copy, Loader2, AlertCircle } from "lucide-react";
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
  status?: string;
  provider?: string;
  montonio_payment_status?: string | null;
  payment_method?: string;
  shipping_name?: string | null;
  shipping_address?: string | null;
  shipping_city?: string | null;
  shipping_zip?: string | null;
  omniva_pickup_point?: string | null;
  montonio_pickup_point_name?: string | null;
  montonio_shipping_method_code?: string | null;
}

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const { clearCart } = useCart();
  const { user } = useAuth();
  const orderId = searchParams.get("order_id");
  const method = searchParams.get("method"); // "bank" => bank transfer, "montonio" => montonio
  const isBankTransfer = method === "bank";
  const isMontonio = method === "montonio";

  const [cleared, setCleared] = useState(false);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [paymentState, setPaymentState] = useState<"verifying" | "paid" | "pending" | "failed" | "unknown">(
    isBankTransfer ? "pending" : "verifying"
  );
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    if (!cleared) {
      clearCart();
      setCleared(true);
    }
  }, [cleared, clearCart]);

  // Load bank settings (bank-transfer flow)
  useEffect(() => {
    if (!isBankTransfer) return;
    (async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("company_name,bank_name,bank_iban,bank_swift,bank_beneficiary,payment_instructions_lv,payment_instructions_en")
        .limit(1)
        .maybeSingle();
      if (data) setSettings(data as SiteSettings);
    })();
  }, [isBankTransfer]);

  // Validate order status from Supabase + poll while pending (for webhook to confirm)
  useEffect(() => {
    if (!orderId) {
      setPaymentState("unknown");
      return;
    }

    let attempts = 0;
    const maxAttempts = 20; // ~40s of polling

    const fetchOrder = async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("order_number,total,stripe_invoice_pdf,status,provider,montonio_payment_status,payment_method,shipping_name,shipping_address,shipping_city,shipping_zip,omniva_pickup_point,montonio_pickup_point_name,montonio_shipping_method_code")
        .eq("id", orderId)
        .maybeSingle();

      if (error || !data) {
        setPaymentState("unknown");
        return;
      }
      setOrder(data as OrderInfo);

      const status = (data.status ?? "").toString();
      const mStatus = (data.montonio_payment_status ?? "").toString().toUpperCase();

      // Bank transfer: stays "pending" until admin marks paid
      if (isBankTransfer) {
        setPaymentState(status === "confirmed" || status === "processing" || status === "shipped" || status === "delivered" ? "paid" : "pending");
        return;
      }

      // Confirmed via webhook
      if (status === "confirmed" || status === "processing" || status === "shipped" || status === "delivered" || mStatus === "PAID") {
        setPaymentState("paid");
        if (pollRef.current) window.clearInterval(pollRef.current);
        return;
      }

      // Explicit failure
      if (status === "cancelled" || mStatus === "VOIDED" || mStatus === "ABANDONED") {
        setPaymentState("failed");
        if (pollRef.current) window.clearInterval(pollRef.current);
        return;
      }

      // Still waiting for webhook
      attempts += 1;
      if (attempts >= maxAttempts) {
        setPaymentState("pending");
        if (pollRef.current) window.clearInterval(pollRef.current);
      } else {
        setPaymentState("verifying");
      }
    };

    fetchOrder();
    pollRef.current = window.setInterval(fetchOrder, 2000) as unknown as number;
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [orderId, isBankTransfer]);

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
            ) : paymentState === "verifying" ? (
              <Loader2 className="w-20 h-20 mx-auto mb-6 animate-spin" style={{ color: "hsl(var(--primary))" }} />
            ) : paymentState === "failed" ? (
              <AlertCircle className="w-20 h-20 mx-auto mb-6 text-destructive" />
            ) : paymentState === "pending" ? (
              <Loader2 className="w-20 h-20 mx-auto mb-6 animate-spin text-muted-foreground" />
            ) : (
              <CheckCircle className="w-20 h-20 mx-auto mb-6" style={{ color: "hsl(var(--primary))" }} />
            )}
          </motion.div>

          <h1 className="text-3xl font-display mb-3">
            {isBankTransfer
              ? t("payment.bankTitle", "Pasūtījums saņemts — gaidām apmaksu")
              : paymentState === "verifying"
                ? t("payment.verifyingTitle", "Pārbaudām maksājumu...")
                : paymentState === "failed"
                  ? t("payment.failedTitle", "Maksājums nav apstiprināts")
                  : paymentState === "pending"
                    ? t("payment.pendingTitle", "Gaidām maksājuma apstiprinājumu")
                    : t("payment.successTitle")}
          </h1>
          <p className="text-muted-foreground font-body mb-2">
            {isBankTransfer
              ? t("payment.bankDesc", "Rēķins ar bankas rekvizītiem nosūtīts uz Jūsu e-pastu. Pasūtījumu apstrādāsim, tiklīdz nauda ienāks mūsu kontā (parasti 1-3 darba dienu laikā).")
              : paymentState === "verifying"
                ? t("payment.verifyingDesc", "Lūdzu, uzgaidiet — apstiprinām maksājumu ar banku.")
                : paymentState === "failed"
                  ? t("payment.failedDesc", "Maksājums tika atcelts vai neizdevās. Lūdzu, mēģiniet vēlreiz vai sazinieties ar mums.")
                  : paymentState === "pending"
                    ? t("payment.pendingDesc", "Maksājums vēl nav apstiprināts. Tas var aizņemt dažas minūtes. Mēs nosūtīsim e-pastu, tiklīdz tas būs saņemts.")
                    : isGuest ? t("payment.successDescGuest") : t("payment.successDesc")}
          </p>

          {!isBankTransfer && paymentState === "paid" && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 mt-2 rounded-full bg-primary/10 text-primary text-sm font-body font-semibold">
              <CheckCircle className="w-4 h-4" />
              {t("payment.statusPaid", "Apmaksāts")}
            </div>
          )}

          {/* Order summary — only shown once order is loaded & validated from Supabase */}
          {order && orderId && (
            <div className="mt-6 rounded-lg border border-border bg-card p-5 text-left">
              <h2 className="font-display text-lg mb-4">
                {t("payment.orderSummary", "Pasūtījuma kopsavilkums")}
              </h2>
              <dl className="space-y-3 text-sm font-body">
                {orderRef && (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">{t("payment.orderId")}</dt>
                    <dd className="font-semibold text-foreground">{orderRef}</dd>
                  </div>
                )}
                {order.total != null && (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">{t("payment.total", "Kopā")}</dt>
                    <dd className="font-semibold text-foreground">
                      {Number(order.total).toFixed(2).replace(".", ",")} €
                    </dd>
                  </div>
                )}
                {(() => {
                  const pickup = order.montonio_pickup_point_name || order.omniva_pickup_point;
                  const address = [order.shipping_address, order.shipping_zip, order.shipping_city]
                    .filter(Boolean)
                    .join(", ");
                  const shippingLabel = pickup
                    ? `Omniva — ${pickup}`
                    : address || null;
                  return shippingLabel ? (
                    <div className="flex items-start justify-between gap-3">
                      <dt className="text-muted-foreground shrink-0">
                        {t("payment.shippingMethod", "Piegāde")}
                      </dt>
                      <dd className="text-right text-foreground">{shippingLabel}</dd>
                    </div>
                  ) : null;
                })()}
              </dl>
            </div>
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
                    value={`${settings.company_name} ${orderRef}`}
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
