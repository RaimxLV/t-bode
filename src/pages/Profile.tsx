import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, User, Package, Save, Heart, Trash2, FileText, Truck, ExternalLink, Copy, Check, Shield } from "lucide-react";
import { TwoFactorSetup } from "@/components/security/TwoFactorSetup";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { useWishlist } from "@/context/WishlistContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { ProductCard } from "@/components/ProductCard";

const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  processing: "bg-purple-100 text-purple-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const TRACKING_STATUS_COLORS: Record<string, string> = {
  in_transit: "bg-blue-100 text-blue-800",
  out_for_delivery: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  returned: "bg-red-100 text-red-800",
};

const OMNIVA_TRACK_URL = "https://www.omniva.lv/private/track_and_trace?barcode=";

const Profile = () => {
  const { user, loading: authLoading, isAdmin, isWhitelisted } = useAuth();
  const canSeeSecurity = isAdmin || isWhitelisted;
  const { productIds: wishlistIds, toggleWishlist } = useWishlist();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "profile";

  const [profile, setProfile] = useState({ full_name: "", phone: "" });
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [orderItems, setOrderItems] = useState<Record<string, any[]>>({});
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [wishlistProducts, setWishlistProducts] = useState<any[]>([]);
  const [loadingWishlist, setLoadingWishlist] = useState(false);
  const [copiedBarcode, setCopiedBarcode] = useState<string | null>(null);

  const copyBarcode = async (barcode: string) => {
    try {
      await navigator.clipboard.writeText(barcode);
      setCopiedBarcode(barcode);
      toast.success(t("profile.barcodeCopied", "Numurs nokopēts"));
      setTimeout(() => setCopiedBarcode(null), 2000);
    } catch {
      toast.error(t("profile.copyError", "Kļūda kopējot"));
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    loadProfile();
    loadOrders();
  }, [user, authLoading]);

  useEffect(() => {
    if (!user) return;
    const ids = Array.from(wishlistIds);
    if (ids.length === 0) {
      setWishlistProducts([]);
      return;
    }
    setLoadingWishlist(true);
    supabase.from("products").select("*").in("id", ids).then(({ data }) => {
      setWishlistProducts(data || []);
      setLoadingWishlist(false);
    });
  }, [user, wishlistIds]);

  const loadProfile = async () => {
    if (!user) return;
    setLoadingProfile(true);
    const { data } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) setProfile({ full_name: data.full_name || "", phone: data.phone || "" });
    setLoadingProfile(false);
  };

  const loadOrders = async () => {
    if (!user) return;
    setLoadingOrders(true);
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setOrders(data || []);
    const ids = (data || []).map((o: any) => o.id);
    if (ids.length > 0) {
      const { data: items } = await supabase.from("order_items").select("*").in("order_id", ids);
      const grouped: Record<string, any[]> = {};
      (items || []).forEach((item: any) => {
        if (!grouped[item.order_id]) grouped[item.order_id] = [];
        grouped[item.order_id].push(item);
      });
      setOrderItems(grouped);
    }
    setLoadingOrders(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .upsert({ user_id: user.id, full_name: profile.full_name, phone: profile.phone }, { onConflict: "user_id" });
    if (error) toast.error(t("profile.saveError", "Neizdevās saglabāt profilu"));
    else toast.success(t("profile.saved", "Profils saglabāts!"));
    setSaving(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 pt-24 pb-16">
          <div className="container mx-auto px-4 max-w-3xl space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-64 w-full" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 font-body text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("profile.back", "Atpakaļ")}
          </button>

          <h1 className="text-3xl md:text-4xl mb-6">{t("profile.title", "Mans profils")}</h1>

          <Tabs defaultValue={initialTab === "security" && !canSeeSecurity ? "profile" : initialTab}>
            <TabsList className={`mb-6 w-full grid ${canSeeSecurity ? "grid-cols-4" : "grid-cols-3"} h-auto`}>
              <TabsTrigger value="profile" className="gap-1 sm:gap-2 px-2 py-2 text-xs sm:text-sm">
                <User className="w-4 h-4 shrink-0" />
                <span className="truncate">{t("profile.profileTab", "Profils")}</span>
              </TabsTrigger>
              <TabsTrigger value="orders" className="gap-1 sm:gap-2 px-2 py-2 text-xs sm:text-sm">
                <Package className="w-4 h-4 shrink-0" />
                <span className="truncate">{t("profile.ordersTab", "Pasūtījumi")}</span>
                {orders.length > 0 && <Badge variant="secondary" className="ml-0.5 text-[10px] px-1.5 h-4">{orders.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="wishlist" className="gap-1 sm:gap-2 px-2 py-2 text-xs sm:text-sm">
                <Heart className="w-4 h-4 shrink-0" />
                <span className="truncate hidden sm:inline">{t("profile.wishlistTab", "Vēlmju saraksts")}</span>
                <span className="truncate sm:hidden">{t("profile.wishlistTabShort", "Vēlmes")}</span>
                {wishlistIds.size > 0 && <Badge variant="secondary" className="ml-0.5 text-[10px] px-1.5 h-4">{wishlistIds.size}</Badge>}
              </TabsTrigger>
              {canSeeSecurity && (
                <TabsTrigger value="security" className="gap-1 sm:gap-2 px-2 py-2 text-xs sm:text-sm">
                  <Shield className="w-4 h-4 shrink-0" />
                  <span className="truncate">{t("profile.securityTab", "Drošība")}</span>
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle className="font-display text-xl">{t("profile.personalInfo", "Personīgā informācija")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="font-body text-sm">{t("profile.email", "E-pasts")}</Label>
                    <Input value={user?.email || ""} disabled className="mt-1 bg-muted" />
                  </div>
                  {loadingProfile ? (
                    <div className="space-y-3">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : (
                    <>
                      <div>
                        <Label className="font-body text-sm">{t("profile.fullName", "Vārds, Uzvārds")}</Label>
                        <Input
                          value={profile.full_name}
                          onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))}
                          className="mt-1"
                          placeholder={t("profile.fullNamePlaceholder", "Ievadiet vārdu un uzvārdu")}
                        />
                      </div>
                      <div>
                        <Label className="font-body text-sm">{t("profile.phone", "Telefons")}</Label>
                        <Input
                          value={profile.phone}
                          onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                          className="mt-1"
                          placeholder="+371 20000000"
                        />
                      </div>
                      <Button onClick={handleSave} disabled={saving} className="gap-2">
                        <Save className="w-4 h-4" />
                        {saving ? t("profile.saving", "Saglabā...") : t("profile.save", "Saglabāt")}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="orders">
              {loadingOrders ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}
                </div>
              ) : orders.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground font-body">{t("profile.noOrders", "Jums vēl nav pasūtījumu")}</p>
                    <Button variant="outline" onClick={() => navigate("/design")} className="mt-4">
                      {t("profile.startShopping", "Sākt iepirkties")}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <Card key={order.id}>
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                          <div>
                            <p className="font-body text-xs text-muted-foreground">
                              {new Date(order.created_at).toLocaleDateString("lv-LV", { year: "numeric", month: "long", day: "numeric" })}
                            </p>
                            <p className="font-body font-semibold text-sm mt-0.5">
                              {order.order_number ? `#${String(order.order_number).padStart(4, "0")}` : `#${order.id.slice(0, 8).toUpperCase()}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={`text-xs font-body ${ORDER_STATUS_COLORS[order.status] || "bg-muted text-muted-foreground"}`}>
                              {String(t(`admin.status_${order.status}`, order.status))}
                            </Badge>
                            <span className="font-body font-bold text-sm">
                              {Number(order.total).toFixed(2).replace(".", ",")} €
                            </span>
                            {order.stripe_invoice_pdf && (
                              <a href={order.stripe_invoice_pdf} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-body">
                                <FileText className="w-3 h-3" />
                                {t("profile.invoice", "Rēķins")}
                              </a>
                            )}
                          </div>
                        </div>
                        {orderItems[order.id] && (
                          <div className="border-t border-border pt-3 space-y-2">
                            {orderItems[order.id].map((item: any) => (
                              <div key={item.id} className="flex justify-between text-sm font-body">
                                <span className="text-muted-foreground">
                                  {item.product_name} {item.color && `(${item.color})`} {item.size && `— ${item.size}`} × {item.quantity}
                                </span>
                                <span>{(item.unit_price * item.quantity).toFixed(2).replace(".", ",")} €</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {order.omniva_pickup_point && (
                          <p className="text-xs text-muted-foreground font-body mt-2">📦 {order.omniva_pickup_point}</p>
                        )}
                        {order.omniva_barcode && (
                          <div className="border-t border-border mt-3 pt-3 space-y-2">
                            <div className="flex items-center gap-2 text-sm font-body">
                              <Truck className="w-4 h-4 text-primary shrink-0" />
                              <span className="font-semibold">{t("profile.tracking", "Sūtījuma izsekošana")}</span>
                              {order.omniva_tracking_status && (
                                <Badge className={`text-xs ${TRACKING_STATUS_COLORS[order.omniva_tracking_status] || "bg-muted text-muted-foreground"}`}>
                                  {String(t(`profile.tracking_${order.omniva_tracking_status}`, order.omniva_tracking_status))}
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <code className="text-xs bg-muted px-2 py-1 rounded font-mono break-all">
                                {order.omniva_barcode}
                              </code>
                              <button
                                onClick={() => copyBarcode(order.omniva_barcode)}
                                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                aria-label={t("profile.copyBarcode", "Kopēt sūtījuma numuru")}
                              >
                                {copiedBarcode === order.omniva_barcode ? (
                                  <Check className="w-3.5 h-3.5 text-green-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <a
                                href={`${OMNIVA_TRACK_URL}${encodeURIComponent(order.omniva_barcode)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-body ml-auto"
                              >
                                {t("profile.trackOnOmniva", "Sekot Omniva")}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="wishlist">
              {loadingWishlist ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-64 w-full rounded-lg" />)}
                </div>
              ) : wishlistProducts.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Heart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground font-body">{t("profile.noWishlist", "Vēlmju saraksts ir tukšs")}</p>
                    <Button variant="outline" onClick={() => navigate("/collection")} className="mt-4">
                      {t("profile.browseProducts", "Pārlūkot produktus")}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {wishlistProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}
            </TabsContent>
            {canSeeSecurity && (
              <TabsContent value="security">
                <TwoFactorSetup />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
