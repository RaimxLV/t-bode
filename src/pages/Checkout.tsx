import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Truck, Package, Search } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useOmnivaLocations } from "@/hooks/useOmnivaLocations";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

type ShippingMethod = "omniva" | "courier";

const Checkout = () => {
  const navigate = useNavigate();
  const { items, totalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const { locations, loading: omnivaLoading } = useOmnivaLocations();
  const { t } = useTranslation();

  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>("omniva");
  const [omnivaSearch, setOmnivaSearch] = useState("");
  const [selectedOmniva, setSelectedOmniva] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", city: "", zip: "", phone: "", notes: "" });

  const filteredLocations = useMemo(() => {
    if (!omnivaSearch.trim()) return locations.slice(0, 20);
    const q = omnivaSearch.toLowerCase();
    return locations.filter((loc) => loc.NAME.toLowerCase().includes(q) || loc.A1_NAME?.toLowerCase().includes(q) || loc.A5_NAME?.toLowerCase().includes(q)).slice(0, 20);
  }, [locations, omnivaSearch]);

  const shippingCost = shippingMethod === "omniva" ? 2.99 : 4.99;
  const orderTotal = totalPrice + shippingCost;
  const isValid = form.name.trim() && form.phone.trim() && (shippingMethod === "omniva" ? selectedOmniva : form.address.trim() && form.city.trim() && form.zip.trim());

  const handleSubmit = async () => {
    if (!user) { toast.error(t("checkout.loginError")); navigate("/auth"); return; }
    if (!isValid || items.length === 0) return;
    setSubmitting(true);
    try {
      const { data: order, error: orderError } = await supabase.from("orders").insert({
        user_id: user.id, total: orderTotal, shipping_name: form.name,
        shipping_address: shippingMethod === "courier" ? form.address : null,
        shipping_city: shippingMethod === "courier" ? form.city : null,
        shipping_zip: shippingMethod === "courier" ? form.zip : null,
        shipping_phone: form.phone,
        omniva_pickup_point: shippingMethod === "omniva" ? selectedOmniva : null,
        notes: form.notes || null,
      }).select("id").single();
      if (orderError) throw orderError;
      const orderItems = items.map((item) => ({ order_id: order.id, product_id: item.productId, product_name: item.name, size: item.size, color: item.color, quantity: item.quantity, unit_price: item.price }));
      const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
      if (itemsError) throw itemsError;
      clearCart();
      toast.success(t("checkout.success"));
      navigate("/");
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

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4">
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 font-body text-sm">
            <ArrowLeft className="w-4 h-4" />{t("checkout.back")}
          </button>
          <h1 className="text-3xl font-display mb-8">{t("checkout.title")}</h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2 space-y-8">
              <section className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-lg font-display mb-4">{t("checkout.contact")}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name" className="font-body text-sm">{t("checkout.name")}</Label>
                    <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jānis Bērziņš" className="mt-1" maxLength={100} />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="font-body text-sm">{t("checkout.phone")}</Label>
                    <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+371 20000000" className="mt-1" maxLength={20} />
                  </div>
                </div>
              </section>

              <section className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-lg font-display mb-4">{t("checkout.shippingMethod")}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button onClick={() => setShippingMethod("omniva")} className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left ${shippingMethod === "omniva" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"}`}>
                    <MapPin className="w-5 h-5 flex-shrink-0" style={{ color: shippingMethod === "omniva" ? "hsl(var(--primary))" : undefined }} />
                    <div><p className="font-body font-semibold text-sm">{t("checkout.omniva")}</p><p className="text-xs text-muted-foreground font-body">2,99 €</p></div>
                  </button>
                  <button onClick={() => setShippingMethod("courier")} className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left ${shippingMethod === "courier" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"}`}>
                    <Truck className="w-5 h-5 flex-shrink-0" style={{ color: shippingMethod === "courier" ? "hsl(var(--primary))" : undefined }} />
                    <div><p className="font-body font-semibold text-sm">{t("checkout.courier")}</p><p className="text-xs text-muted-foreground font-body">4,99 €</p></div>
                  </button>
                </div>

                {shippingMethod === "omniva" && (
                  <div className="mt-4">
                    <Label className="font-body text-sm">{t("checkout.selectOmniva")}</Label>
                    <div className="relative mt-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input value={omnivaSearch} onChange={(e) => setOmnivaSearch(e.target.value)} placeholder={t("checkout.searchOmniva")} className="pl-10" />
                    </div>
                    <ScrollArea className="h-48 mt-2 border border-border rounded-md">
                      <div className="p-2 flex flex-col gap-1">
                        {omnivaLoading ? (
                          <p className="text-sm text-muted-foreground p-2 font-body">{t("checkout.loadingOmniva")}</p>
                        ) : filteredLocations.length === 0 ? (
                          <p className="text-sm text-muted-foreground p-2 font-body">{t("checkout.notFound")}</p>
                        ) : (
                          filteredLocations.map((loc) => (
                            <button key={loc.ZIP} onClick={() => setSelectedOmniva(loc.NAME)} className={`text-left p-2 rounded text-sm font-body transition-colors ${selectedOmniva === loc.NAME ? "bg-primary/10 text-primary" : "hover:bg-secondary"}`}>
                              <span className="font-semibold">{loc.NAME}</span>
                              <span className="text-xs text-muted-foreground block">{loc.A5_NAME}, {loc.A1_NAME}</span>
                            </button>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                    {selectedOmniva && (
                      <p className="text-xs text-muted-foreground mt-2 font-body">{t("checkout.selected")}: <span className="font-semibold text-foreground">{selectedOmniva}</span></p>
                    )}
                  </div>
                )}

                {shippingMethod === "courier" && (
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <Label htmlFor="address" className="font-body text-sm">{t("checkout.address")}</Label>
                      <Input id="address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Brīvības iela 100-10" className="mt-1" maxLength={200} />
                    </div>
                    <div>
                      <Label htmlFor="city" className="font-body text-sm">{t("checkout.city")}</Label>
                      <Input id="city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Rīga" className="mt-1" maxLength={100} />
                    </div>
                    <div>
                      <Label htmlFor="zip" className="font-body text-sm">{t("checkout.zip")}</Label>
                      <Input id="zip" value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} placeholder="LV-1001" className="mt-1" maxLength={10} />
                    </div>
                  </div>
                )}
              </section>

              <section className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-lg font-display mb-4">{t("checkout.notes")}</h2>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder={t("checkout.notesPlaceholder")} className="w-full bg-background border border-border rounded-md p-3 text-sm font-body min-h-[80px] resize-y focus:outline-none focus:ring-2 focus:ring-ring" maxLength={500} />
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
                        <p className="text-xs text-muted-foreground font-body">{item.size} · {item.color} · x{item.quantity}</p>
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
                <Button className="w-full mt-6 py-6 text-base font-body font-semibold" style={{ background: "var(--gradient-brand)" }} disabled={!isValid || submitting} onClick={handleSubmit}>
                  {submitting ? t("checkout.processing") : t("checkout.submit")}
                </Button>
                {!user && <p className="text-xs text-muted-foreground text-center mt-2 font-body">{t("checkout.loginRequired")}</p>}
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
