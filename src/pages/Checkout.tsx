import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Truck, Package, Search, Building2, User as UserIcon, LogIn, CreditCard, Landmark, Tag, X, CheckCircle2 } from "lucide-react";
import { OmnivaMapPicker } from "@/components/OmnivaMapPicker";
import { z } from "zod";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useOmnivaLocations } from "@/hooks/useOmnivaLocations";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

type ShippingMethod = "omniva" | "courier";
type CheckoutMode = "choose" | "guest" | "loggedin";
type PaymentMethod = "card" | "bank_transfer" | "montonio";

const baseSchema = z.object({
  name: z.string().trim().min(2, "Vārdam jābūt vismaz 2 simbolus garam").max(100),
  phone: z.string().trim().min(8, "Ievadiet derīgu telefona numuru").max(20),
  email: z.string().trim().email("Ievadiet derīgu e-pasta adresi").max(255),
  notes: z.string().max(500).optional(),
});

const businessFields = z.object({
  company_name: z.string().trim().min(2, "Uzņēmuma nosaukums obligāts").max(200),
  company_reg_number: z.string().trim().min(4, "Reģistrācijas numurs obligāts").max(50),
  company_vat_number: z.string().trim().max(50).optional(),
  company_address: z.string().trim().min(5, "Juridiskā adrese obligāta").max(300),
});

const omnivaFields = z.object({ selectedOmniva: z.string().min(1, "Lūdzu izvēlieties Omniva pakomātu") });
const courierFields = z.object({
  address: z.string().trim().min(3, "Ievadiet pilnu adresi").max(200),
  city: z.string().trim().min(2, "Ievadiet pilsētu").max(100),
  zip: z.string().trim().min(4, "Ievadiet pasta indeksu").max(10),
});

type FieldErrors = Record<string, string>;

const Checkout = () => {
  const navigate = useNavigate();
  const { items, totalPrice } = useCart();
  const { user } = useAuth();
  const { locations, loading: omnivaLoading } = useOmnivaLocations();
  const { t } = useTranslation();

  // Mode: if logged in skip choose; if not, show choose first
  const [mode, setMode] = useState<CheckoutMode>(user ? "loggedin" : "choose");
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>("omniva");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [omnivaSearch, setOmnivaSearch] = useState("");
  const [selectedOmniva, setSelectedOmniva] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isBusiness, setIsBusiness] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: user?.email ?? "",
    address: "",
    city: "",
    zip: "",
    phone: "",
    notes: "",
    company_name: "",
    company_reg_number: "",
    company_vat_number: "",
    company_address: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});

  // Promo code state
  const [promoInput, setPromoInput] = useState("");
  const [promoApplying, setPromoApplying] = useState(false);
  const [promo, setPromo] = useState<{
    code: string;
    discount_type: "percentage" | "fixed" | "free_shipping";
    discount_value: number;
    discount_amount: number;
  } | null>(null);

  const filteredLocations = useMemo(() => {
    if (!omnivaSearch.trim()) return locations.slice(0, 20);
    const q = omnivaSearch.toLowerCase();
    return locations.filter((loc) => loc.NAME.toLowerCase().includes(q) || loc.A1_NAME?.toLowerCase().includes(q) || loc.A5_NAME?.toLowerCase().includes(q)).slice(0, 20);
  }, [locations, omnivaSearch]);

  const appOriginUrl = new URL(import.meta.env.BASE_URL, window.location.origin).toString().replace(/\/$/, "");

  const baseShippingCost = shippingMethod === "omniva" ? 2.99 : 4.99;
  const isFreeShipping = promo?.discount_type === "free_shipping";
  const shippingCost = isFreeShipping ? 0 : baseShippingCost;
  const productDiscount = promo && promo.discount_type !== "free_shipping" ? promo.discount_amount : 0;
  const orderTotal = Math.max(0, totalPrice + shippingCost - productDiscount);

  const applyPromo = async () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    setPromoApplying(true);
    try {
      const { data, error } = await supabase.rpc("validate_promo_code", {
        _code: code,
        _order_total: totalPrice,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) {
        toast.error(t("checkout.promoInvalid", "Nederīgs vai izsmelts atlaižu kods"));
        setPromo(null);
        return;
      }
      setPromo({
        code: row.code,
        discount_type: row.discount_type,
        discount_value: Number(row.discount_value),
        discount_amount: Number(row.discount_amount),
      });
      toast.success(t("checkout.promoApplied", "Atlaide piemērota!"));
    } catch (e: any) {
      toast.error(e.message || t("checkout.promoInvalid", "Nederīgs atlaižu kods"));
      setPromo(null);
    } finally {
      setPromoApplying(false);
    }
  };

  const removePromo = () => { setPromo(null); setPromoInput(""); };

  const updateField = (field: string, value: string) => {
    setForm({ ...form, [field]: value });
    if (errors[field]) setErrors({ ...errors, [field]: "" });
  };

  const validate = (): boolean => {
    const data: any = {
      name: form.name,
      phone: form.phone,
      email: user?.email ?? form.email,
      notes: form.notes,
    };
    if (shippingMethod === "omniva") {
      data.selectedOmniva = selectedOmniva;
    } else {
      data.address = form.address; data.city = form.city; data.zip = form.zip;
    }

    let schema: any = baseSchema;
    if (shippingMethod === "omniva") {
      schema = schema.merge(omnivaFields);
    } else {
      schema = schema.merge(courierFields);
    }

    if (isBusiness) {
      schema = schema.merge(businessFields);
      data.company_name = form.company_name;
      data.company_reg_number = form.company_reg_number;
      data.company_vat_number = form.company_vat_number;
      data.company_address = form.company_address;
    }

    const result = schema.safeParse(data);
    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      result.error.errors.forEach((err: any) => {
        const field = err.path[0] as string;
        if (!fieldErrors[field]) fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleSubmit = async () => {
    if (!validate() || items.length === 0) return;
    setSubmitting(true);
    try {
      const orderPayload: any = {
        total: orderTotal,
        shipping_name: form.name.trim(),
        shipping_address: shippingMethod === "courier" ? form.address.trim() : null,
        shipping_city: shippingMethod === "courier" ? form.city.trim() : null,
        shipping_zip: shippingMethod === "courier" ? form.zip.trim() : null,
        shipping_phone: form.phone.trim(),
        omniva_pickup_point:
          shippingMethod === "omniva"
            ? selectedOmniva
            : null,
        notes: form.notes?.trim() || null,
        is_business: isBusiness,
        payment_method: paymentMethod,
        promo_code: promo?.code ?? null,
        discount_amount: promo
          ? (promo.discount_type === "free_shipping" ? baseShippingCost : promo.discount_amount)
          : 0,
      };

      if (user) {
        orderPayload.user_id = user.id;
      } else {
        orderPayload.guest_email = form.email.trim();
      }

      if (isBusiness) {
        orderPayload.company_name = form.company_name.trim();
        orderPayload.company_reg_number = form.company_reg_number.trim();
        orderPayload.company_vat_number = form.company_vat_number?.trim() || null;
        orderPayload.company_address = form.company_address.trim();
      }

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert(orderPayload)
        .select("id")
        .single();
      if (orderError) throw orderError;

      const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: item.productId,
        product_name: item.name,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        unit_price: item.price,
        zakeke_design_id: item.designId || null,
        zakeke_thumbnail_url: item.designThumbnail || null,
      }));
      const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
      if (itemsError) throw itemsError;

      const stripeItems = items.map((item) => ({
        productId: item.productId, name: item.name, price: item.price, quantity: item.quantity,
        size: item.size, color: item.color, image: item.image, shippingMethod, shippingCost,
      }));

      const promoPayload = promo
        ? {
            code: promo.code,
            discount_type: promo.discount_type,
            discount_amount: promo.discount_type === "free_shipping" ? baseShippingCost : promo.discount_amount,
          }
        : null;

      // Branch: Montonio (bank links) vs Stripe (card / bank-transfer invoice)
      if (paymentMethod === "montonio") {
        const { data: mData, error: mError } = await supabase.functions.invoke("montonio-create-order", {
          body: {
            order_id: order.id,
            items: stripeItems,
            origin_url: appOriginUrl,
            customer_email: user?.email ?? form.email.trim(),
            customer_name: form.name.trim(),
            customer_phone: form.phone.trim(),
            promo: promoPayload,
            shipping:
              shippingMethod === "omniva" && selectedOmniva
                ? {
                    method: "omniva-pakomat",
                    pickupPointName: selectedOmniva,
                  }
                : undefined,
          },
        });
        if (mError) throw mError;
        if (mData?.url) {
          window.location.href = mData.url;
          return;
        }
        throw new Error("No Montonio payment URL received");
      }

      const { data: sessionData, error: sessionError } = await supabase.functions.invoke("create-checkout", {
        body: {
          order_id: order.id,
          items: stripeItems,
          origin_url: appOriginUrl,
          guest_email: user ? null : form.email.trim(),
          payment_method: paymentMethod,
          promo: promoPayload,
          business: isBusiness ? {
            is_business: true,
            company_name: form.company_name.trim(),
            company_reg_number: form.company_reg_number.trim(),
            company_vat_number: form.company_vat_number?.trim() || null,
            company_address: form.company_address.trim(),
          } : { is_business: false },
        },
      });

      if (sessionError) throw sessionError;
      if (sessionData?.url) {
        window.location.href = sessionData.url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error: any) {
      toast.error(error.message || t("checkout.error"));
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center pt-16">
          <div className="text-center">
            <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-30" />
            <h1 className="text-2xl font-display mb-2">{t("checkout.emptyCart")}</h1>
            <p className="text-muted-foreground font-body mb-4">{t("checkout.emptyCartDesc")}</p>
            <Button variant="outline" onClick={() => navigate("/design")}>{t("checkout.backToShop")}</Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Step 1: choose login or guest
  if (mode === "choose" && !user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 pt-24 pb-16">
          <div className="container mx-auto px-4 max-w-2xl">
            <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 font-body text-sm">
              <ArrowLeft className="w-4 h-4" />{t("checkout.back")}
            </button>
            <h1 className="text-3xl font-display mb-2">{t("checkout.title")}</h1>
            <p className="text-muted-foreground font-body mb-8">{t("checkout.chooseHowToContinue", "Izvēlies, kā turpināt")}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => navigate("/auth?redirect=/checkout")}
                className="bg-card border-2 border-border hover:border-primary rounded-lg p-6 text-left transition-all"
              >
                <LogIn className="w-8 h-8 mb-3 text-primary" />
                <h3 className="font-display text-lg mb-1">{t("checkout.loginOption", "Ielogoties")}</h3>
                <p className="text-sm text-muted-foreground font-body">{t("checkout.loginBenefits", "Saglabā pasūtījumu vēsturi un ātrāku checkout nākotnē")}</p>
              </button>

              <button
                onClick={() => setMode("guest")}
                className="bg-card border-2 border-border hover:border-primary rounded-lg p-6 text-left transition-all"
              >
                <UserIcon className="w-8 h-8 mb-3 text-primary" />
                <h3 className="font-display text-lg mb-1">{t("checkout.guestOption", "Turpināt kā viesis")}</h3>
                <p className="text-sm text-muted-foreground font-body">{t("checkout.guestBenefits", "Bez konta — tikai ievadi e-pastu pasūtījuma apstiprinājumam")}</p>
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const FieldError = ({ field }: { field: string }) =>
    errors[field] ? <p className="text-xs text-destructive mt-1 font-body">{errors[field]}</p> : null;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4">
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 font-body text-sm">
            <ArrowLeft className="w-4 h-4" />{t("checkout.back")}
          </button>
          <div className="flex items-center gap-3 mb-8">
            <h1 className="text-3xl font-display">{t("checkout.title")}</h1>
            {!user && <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground font-body">{t("checkout.guestBadge", "Viesa pirkums")}</span>}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2 space-y-8">
              {/* Contact */}
              <section className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-lg font-display mb-4">{t("checkout.contact")}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name" className="font-body text-sm">{t("checkout.name")}</Label>
                    <Input id="name" value={form.name} onChange={(e) => updateField("name", e.target.value)} placeholder="Jānis Bērziņš" className={`mt-1 ${errors.name ? "border-destructive" : ""}`} maxLength={100} />
                    <FieldError field="name" />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="font-body text-sm">{t("checkout.phone")}</Label>
                    <Input id="phone" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder="+371 20000000" className={`mt-1 ${errors.phone ? "border-destructive" : ""}`} maxLength={20} />
                    <FieldError field="phone" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="email" className="font-body text-sm">{t("checkout.email", "E-pasts")}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={user?.email ?? form.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      disabled={!!user}
                      placeholder="tavs@epasts.lv"
                      className={`mt-1 ${errors.email ? "border-destructive" : ""} ${user ? "bg-muted" : ""}`}
                      maxLength={255}
                    />
                    <FieldError field="email" />
                  </div>
                </div>
              </section>

              {/* Business toggle */}
              <section className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <h2 className="text-lg font-display">{t("checkout.buyAsCompany", "Pērku kā uzņēmums")}</h2>
                      <p className="text-xs text-muted-foreground font-body">{t("checkout.invoiceWillBeIssued", "Saņemsiet rēķinu uz uzņēmuma datiem")}</p>
                    </div>
                  </div>
                  <Switch checked={isBusiness} onCheckedChange={setIsBusiness} />
                </div>

                {isBusiness && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border">
                    <div className="sm:col-span-2">
                      <Label htmlFor="company_name" className="font-body text-sm">{t("checkout.companyName", "Uzņēmuma nosaukums")} *</Label>
                      <Input id="company_name" value={form.company_name} onChange={(e) => updateField("company_name", e.target.value)} placeholder="SIA Mans Uzņēmums" className={`mt-1 ${errors.company_name ? "border-destructive" : ""}`} maxLength={200} />
                      <FieldError field="company_name" />
                    </div>
                    <div>
                      <Label htmlFor="company_reg_number" className="font-body text-sm">{t("checkout.companyRegNumber", "Reģistrācijas numurs")} *</Label>
                      <Input id="company_reg_number" value={form.company_reg_number} onChange={(e) => updateField("company_reg_number", e.target.value)} placeholder="40000000000" className={`mt-1 ${errors.company_reg_number ? "border-destructive" : ""}`} maxLength={50} />
                      <FieldError field="company_reg_number" />
                    </div>
                    <div>
                      <Label htmlFor="company_vat_number" className="font-body text-sm">{t("checkout.companyVatNumber", "PVN numurs")}</Label>
                      <Input id="company_vat_number" value={form.company_vat_number} onChange={(e) => updateField("company_vat_number", e.target.value)} placeholder="LV40000000000" className="mt-1" maxLength={50} />
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="company_address" className="font-body text-sm">{t("checkout.companyAddress", "Juridiskā adrese")} *</Label>
                      <Input id="company_address" value={form.company_address} onChange={(e) => updateField("company_address", e.target.value)} placeholder="Brīvības iela 1, Rīga, LV-1010" className={`mt-1 ${errors.company_address ? "border-destructive" : ""}`} maxLength={300} />
                      <FieldError field="company_address" />
                    </div>
                  </div>
                )}
              </section>

              {/* Shipping */}
              <section className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-lg font-display mb-4">{t("checkout.shippingMethod")}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button onClick={() => { setShippingMethod("omniva"); setErrors({}); }} className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left ${shippingMethod === "omniva" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"}`}>
                    <MapPin className="w-5 h-5 flex-shrink-0" style={{ color: shippingMethod === "omniva" ? "hsl(var(--primary))" : undefined }} />
                    <div><p className="font-body font-semibold text-sm">{t("checkout.omniva")}</p><p className="text-xs text-muted-foreground font-body">2,99 €</p></div>
                  </button>
                  <button onClick={() => { setShippingMethod("courier"); setErrors({}); }} className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left ${shippingMethod === "courier" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"}`}>
                    <Truck className="w-5 h-5 flex-shrink-0" style={{ color: shippingMethod === "courier" ? "hsl(var(--primary))" : undefined }} />
                    <div><p className="font-body font-semibold text-sm">{t("checkout.courier")}</p><p className="text-xs text-muted-foreground font-body">4,99 €</p></div>
                  </button>
                </div>

                {shippingMethod === "omniva" && (
                  <div className="mt-4">
                    <Label className="font-body text-sm mb-2 block">{t("checkout.selectOmniva")}</Label>
                    <OmnivaMapPicker
                      locations={locations}
                      loading={omnivaLoading}
                      selectedName={selectedOmniva}
                      onSelect={(loc) => {
                        setSelectedOmniva(loc.NAME);
                        if (errors.selectedOmniva) setErrors({ ...errors, selectedOmniva: "" });
                      }}
                    />
                    <FieldError field="selectedOmniva" />
                  </div>
                )}

                {shippingMethod === "courier" && (
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <Label htmlFor="address" className="font-body text-sm">{t("checkout.address")}</Label>
                      <Input id="address" value={form.address} onChange={(e) => updateField("address", e.target.value)} placeholder="Brīvības iela 100-10" className={`mt-1 ${errors.address ? "border-destructive" : ""}`} maxLength={200} />
                      <FieldError field="address" />
                    </div>
                    <div>
                      <Label htmlFor="city" className="font-body text-sm">{t("checkout.city")}</Label>
                      <Input id="city" value={form.city} onChange={(e) => updateField("city", e.target.value)} placeholder="Rīga" className={`mt-1 ${errors.city ? "border-destructive" : ""}`} maxLength={100} />
                      <FieldError field="city" />
                    </div>
                    <div>
                      <Label htmlFor="zip" className="font-body text-sm">{t("checkout.zip")}</Label>
                      <Input id="zip" value={form.zip} onChange={(e) => updateField("zip", e.target.value)} placeholder="LV-1001" className={`mt-1 ${errors.zip ? "border-destructive" : ""}`} maxLength={10} />
                      <FieldError field="zip" />
                    </div>
                  </div>
                )}
              </section>

              {/* Payment method */}
              <section className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-lg font-display mb-4">{t("checkout.paymentMethod", "Apmaksas veids")}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("card")}
                    className={`flex items-start gap-3 p-4 rounded-lg border-2 transition-all text-left ${paymentMethod === "card" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"}`}
                  >
                    <CreditCard className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: paymentMethod === "card" ? "hsl(var(--primary))" : undefined }} />
                    <div>
                      <p className="font-body font-semibold text-sm">{t("checkout.payCard", "Maksāt ar karti")}</p>
                      <p className="text-xs text-muted-foreground font-body">{t("checkout.payCardDesc", "Tūlītēja apmaksa caur Stripe (Visa, Mastercard)")}</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("montonio")}
                    className={`flex items-start gap-3 p-4 rounded-lg border-2 transition-all text-left ${paymentMethod === "montonio" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"}`}
                  >
                    <Landmark className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: paymentMethod === "montonio" ? "hsl(var(--primary))" : undefined }} />
                    <div>
                      <p className="font-body font-semibold text-sm">{t("checkout.payBankLink", "Bankas saite")}</p>
                      <p className="text-xs text-muted-foreground font-body">{t("checkout.payBankLinkDesc", "Tūlītēja apmaksa caur Swedbank, SEB, Citadele, Luminor (Montonio)")}</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("bank_transfer")}
                    className={`flex items-start gap-3 p-4 rounded-lg border-2 transition-all text-left ${paymentMethod === "bank_transfer" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"}`}
                  >
                    <Landmark className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: paymentMethod === "bank_transfer" ? "hsl(var(--primary))" : undefined }} />
                    <div>
                      <p className="font-body font-semibold text-sm">{t("checkout.payBank", "Bankas pārskaitījums (rēķins)")}</p>
                      <p className="text-xs text-muted-foreground font-body">{t("checkout.payBankDesc", "Saņemsiet rēķinu uz e-pastu. Pasūtījums tiks apstrādāts pēc maksājuma saņemšanas (1-3 d.d.)")}</p>
                    </div>
                  </button>
                </div>
              </section>

              <section className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-lg font-display mb-4">{t("checkout.notes")}</h2>
                <textarea value={form.notes} onChange={(e) => updateField("notes", e.target.value)} placeholder={t("checkout.notesPlaceholder")} className="w-full bg-background border border-border rounded-md p-3 text-sm font-body min-h-[80px] resize-y focus:outline-none focus:ring-2 focus:ring-ring" maxLength={500} />
              </section>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
              <div className="bg-card border border-border rounded-lg p-6 sticky top-24">
                <h2 className="text-lg font-display mb-4">{t("checkout.summary")}</h2>
                <div className="flex flex-col gap-3 mb-4">
                  {items.map((item) => (
                    <div key={`${item.productId}-${item.size}-${item.color}`} className="flex gap-3">
                      <img src={item.image} alt={item.name} className="w-14 h-14 rounded border border-border object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-body font-semibold truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground font-body">
                          {item.size} · {item.color} · x{item.quantity}
                          {item.designId && <span className="ml-1 text-primary">✦ {t("cart.customized", "Personalizēts")}</span>}
                        </p>
                        <p className="text-sm font-body font-bold" style={{ color: "hsl(var(--primary))" }}>{(item.price * item.quantity).toFixed(2).replace(".", ",")} €</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Separator className="my-4" />
                <div className="space-y-2 font-body text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("checkout.products")}</span><span>{totalPrice.toFixed(2).replace(".", ",")} €</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("checkout.shipping")}</span><span>{shippingCost.toFixed(2).replace(".", ",")} €</span></div>
                </div>
                <Separator className="my-4" />
                <div className="flex justify-between font-body font-bold text-lg">
                  <span>{t("checkout.total")}</span>
                  <span style={{ color: "hsl(var(--primary))" }}>{orderTotal.toFixed(2).replace(".", ",")} €</span>
                </div>
                <Button className="w-full mt-6 py-6 text-base font-body font-semibold" style={{ background: "var(--gradient-brand)" }} disabled={submitting} onClick={handleSubmit}>
                  {submitting
                    ? t("checkout.processing")
                    : paymentMethod === "bank_transfer"
                      ? t("checkout.submitBank", "Veikt pasūtījumu un saņemt rēķinu")
                      : paymentMethod === "montonio"
                        ? t("checkout.submitBankLink", "Maksāt caur banku")
                        : t("checkout.submit")}
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Checkout;
