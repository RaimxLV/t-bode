import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, ArrowLeft, Brush, Package, ShoppingBag, HelpCircle, AlertTriangle, Layers, Search, UserCheck, Trash2, FolderTree, Euro, Clock, BarChart3 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ProductCard } from "@/components/ProductCard";
import { useTranslation } from "react-i18next";
import { CATEGORY_ICONS } from "@/components/CategoryIcons";
import logo from "@/assets/logo.svg";
import type { DBProduct } from "@/hooks/useProducts";
import { useCategories, getTopLevel, getCategorySlugsIncludingChildren } from "@/hooks/useCategories";
import { EMPTY_PRODUCT, type ProductForm, type ColorVariant } from "@/components/admin/ProductDialog";

// Lazy-load heavy admin tab components — only fetched when admin opens that tab
const ProductDialog = lazy(() => import("@/components/admin/ProductDialog").then(m => ({ default: m.ProductDialog })));
const OrdersList = lazy(() => import("@/components/admin/OrdersList").then(m => ({ default: m.OrdersList })));
const FAQManager = lazy(() => import("@/components/admin/FAQManager").then(m => ({ default: m.FAQManager })));
const CategoryManager = lazy(() => import("@/components/admin/CategoryManager").then(m => ({ default: m.CategoryManager })));
const ProductStats = lazy(() => import("@/components/admin/ProductStats").then(m => ({ default: m.ProductStats })));

const TabFallback = () => (
  <div className="flex items-center justify-center py-16">
    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const StatCard = ({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string | number; accent?: string }) => (
  <Card className="border border-border">
    <CardContent className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center ${accent || "bg-primary/10 text-primary"}`}>
        <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
      </div>
      <div>
        <p className="text-xl sm:text-2xl font-display">{value}</p>
        <p className="text-[10px] sm:text-xs text-muted-foreground font-body">{label}</p>
      </div>
    </CardContent>
  </Card>
);

const Admin = () => {
  const { user, loading: authLoading, isAdmin: hasAdminRole, adminLoading, isWhitelisted } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const [products, setProducts] = useState<DBProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [editingProduct, setEditingProduct] = useState<ProductForm | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("design");
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderItems, setOrderItems] = useState<Record<string, any[]>>({});
  const [faqs, setFaqs] = useState<any[]>([]);
  const [loadingFaqs, setLoadingFaqs] = useState(false);
  const [adminCategoryFilter, setAdminCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [whitelistEmails, setWhitelistEmails] = useState<{ id: string; email: string }[]>([]);
  const [newWhitelistEmail, setNewWhitelistEmail] = useState("");
  const [loadingWhitelist, setLoadingWhitelist] = useState(false);
  const { data: allCategories = [] } = useCategories();

  const designProducts = products.filter((p) => p.customizable);
  const collectionProducts = products.filter((p) => !p.customizable);

  const stats = useMemo(() => ({
    total: products.length,
    outOfStock: products.filter((p) => !p.in_stock).length,
    activeDesigns: designProducts.length,
    collectionCount: collectionProducts.length,
    pendingOrders: orders.filter((o: any) => o.status === "pending").length,
    totalRevenue: orders.filter((o: any) => o.status !== "cancelled").reduce((sum: number, o: any) => sum + Number(o.total), 0),
  }), [products, designProducts, collectionProducts, orders]);

  useEffect(() => {
    if (authLoading || adminLoading) return;
    if (!user) { navigate("/auth"); return; }
    if (!hasAdminRole && !isWhitelisted) {
      toast.error(t("admin.noAccess"));
      navigate("/");
      return;
    }
    setIsAdmin(true);
    setChecking(false);
  }, [user, authLoading, adminLoading, hasAdminRole, isWhitelisted, navigate, t]);

  useEffect(() => { if (!isAdmin) return; loadProducts(); loadOrders(); loadFaqs(); loadWhitelist(); }, [isAdmin]);

  const loadWhitelist = async () => {
    setLoadingWhitelist(true);
    const { data, error } = await supabase.from("admin_whitelist").select("id, email").order("created_at", { ascending: true });
    if (!error) setWhitelistEmails((data as { id: string; email: string }[]) || []);
    setLoadingWhitelist(false);
  };

  const addWhitelistEmail = async () => {
    const email = newWhitelistEmail.trim().toLowerCase();
    if (!email) return;
    const { error } = await supabase.from("admin_whitelist").insert({ email });
    if (error) {
      toast.error(error.message.includes("duplicate") ? "Šis e-pasts jau ir sarakstā" : "Kļūda pievienojot e-pastu");
    } else {
      toast.success("E-pasts pievienots baltajam sarakstam");
      setNewWhitelistEmail("");
      loadWhitelist();
    }
  };

  const removeWhitelistEmail = async (id: string) => {
    const { error } = await supabase.from("admin_whitelist").delete().eq("id", id);
    if (error) toast.error("Kļūda dzēšot e-pastu");
    else { toast.success("E-pasts noņemts"); loadWhitelist(); }
  };

  const loadProducts = async () => {
    setLoadingProducts(true);
    const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
    if (error) toast.error(t("admin.loadError"));
    else setProducts(((data ?? []) as any[]).map((product) => ({ ...product, color_variants: (product.color_variants as ColorVariant[]) || [], zakeke_model_code: product.zakeke_model_code ?? null })));
    setLoadingProducts(false);
  };

  const loadOrders = async () => {
    setLoadingOrders(true);
    const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    if (error) { toast.error(t("admin.orderLoadError")); }
    else {
      setOrders(data || []);
      const ids = (data || []).map((o: any) => o.id);
      if (ids.length > 0) {
        const { data: items } = await supabase.from("order_items").select("*, products:product_id(image_url, color_variants)").in("order_id", ids);
        const grouped: Record<string, any[]> = {};
        (items || []).forEach((item: any) => { if (!grouped[item.order_id]) grouped[item.order_id] = []; grouped[item.order_id].push(item); });
        setOrderItems(grouped);
      }
    }
    setLoadingOrders(false);
  };

  const loadFaqs = async () => {
    setLoadingFaqs(true);
    const { data, error } = await supabase.from("faqs").select("*").order("sort_order", { ascending: true });
    if (error) toast.error("Failed to load FAQs");
    else setFaqs(data || []);
    setLoadingFaqs(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("admin.deleteConfirm"))) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast.error(t("admin.deleteError") + ": " + error.message);
    else { toast.success(t("admin.productDeleted")); loadProducts(); }
  };

  const handleToggleStock = async (id: string, currentStock: boolean) => {
    const { error } = await supabase.from("products").update({ in_stock: !currentStock }).eq("id", id);
    if (error) toast.error(t("admin.updateError", "Neizdevās atjaunināt"));
    else { toast.success(!currentStock ? t("admin.markedInStock", "Atzīmēts kā pieejams") : t("admin.markedOutOfStock", "Atzīmēts kā nav noliktavā")); loadProducts(); }
  };

  const openCreateDialog = (forDesign: boolean) => { setEditingProduct({ ...EMPTY_PRODUCT, customizable: forDesign }); setDialogOpen(true); };
  const openEditDialog = (product: DBProduct) => {
    setEditingProduct({ id: product.id, name: product.name, slug: product.slug, description: product.description || "", price: product.price, category: product.category, sizes: product.sizes || [], customizable: product.customizable, color_variants: (product.color_variants as ColorVariant[]) || [], image_url: product.image_url || "", in_stock: product.in_stock, zakeke_model_code: product.zakeke_model_code || "" });
    setDialogOpen(true);
  };

  if (authLoading || checking) {
    return (<div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground font-body">{t("admin.loading")}</p></div>);
  }
  if (!isAdmin) return null;

  const topCats = getTopLevel(allCategories);

  const filterProductsForTab = (items: DBProduct[]) => {
    let result = items;
    if (adminCategoryFilter !== "all") {
      const matchSlugs = getCategorySlugsIncludingChildren(allCategories, adminCategoryFilter);
      result = result.filter((p) => matchSlugs.includes(p.category));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q));
    }
    return result;
  };

  const renderProductGrid = (items: DBProduct[], forDesign: boolean) => {
    const filtered = filterProductsForTab(items);
    const relevantCategories = forDesign
      ? topCats.filter((c) => !["latvia", "accessories"].includes(c.slug))
      : topCats.filter((c) => ["latvia", "accessories"].includes(c.slug));

    return (
      <>
        <div className="relative mb-3 sm:mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("admin.searchProducts", "Meklēt produktus...")}
            className="w-full sm:w-64 pl-9 pr-3 py-2 rounded-lg border border-border bg-card text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
          <button
            onClick={() => setAdminCategoryFilter("all")}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-body font-medium border transition-all ${
              adminCategoryFilter === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            {t("admin.filterAll")}
          </button>
          {relevantCategories.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.slug];
            return (
              <button
                key={cat.slug}
                onClick={() => setAdminCategoryFilter(cat.slug)}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-body font-medium border transition-all ${
                  adminCategoryFilter === cat.slug ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:text-foreground"
                }`}
              >
                {Icon && <Icon size={14} />}
                {cat.name}
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 sm:py-20"><p className="text-muted-foreground font-body">{t("admin.noProducts")}</p></div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-4">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} onEdit={openEditDialog} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-white/10 bg-black/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="text-white/70 hover:text-white hover:bg-white/10"><ArrowLeft className="w-5 h-5" /></Button>
            <img src={logo} alt="T-Bode" className="h-7 sm:h-8" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
          <StatCard icon={Layers} label="Kopā produkti" value={stats.total} />
          <StatCard icon={Brush} label="Dizaina produkti" value={stats.activeDesigns} accent="bg-blue-50 text-blue-600" />
          <StatCard icon={ShoppingBag} label="Kolekcijas produkti" value={stats.collectionCount} accent="bg-purple-50 text-purple-600" />
          <StatCard icon={AlertTriangle} label="Nav noliktavā" value={stats.outOfStock} accent="bg-destructive/10 text-destructive" />
          <StatCard icon={Clock} label="Gaida apstiprinājumu" value={stats.pendingOrders} accent={stats.pendingOrders > 0 ? "bg-yellow-50 text-yellow-600" : "bg-muted text-muted-foreground"} />
          <StatCard icon={Euro} label="Kopējie ieņēmumi" value={`${stats.totalRevenue.toFixed(2)} €`} accent="bg-green-50 text-green-600" />
        </div>

        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setAdminCategoryFilter("all"); }}>
          {/* Fixed bottom nav on mobile, top tabs on desktop */}
          <TabsList className="hidden sm:flex mb-6 w-full max-w-full overflow-x-auto justify-start">
            <TabsTrigger value="design" className="gap-1.5 text-sm"><Brush className="w-4 h-4" /> Dizains<Badge variant="secondary" className="ml-1 text-xs">{designProducts.length}</Badge></TabsTrigger>
            <TabsTrigger value="collection" className="gap-1.5 text-sm"><ShoppingBag className="w-4 h-4" /> Kolekcija<Badge variant="secondary" className="ml-1 text-xs">{collectionProducts.length}</Badge></TabsTrigger>
            <TabsTrigger value="orders" className="gap-1.5 text-sm"><Package className="w-4 h-4" /> Pasūtījumi{orders.length > 0 && <Badge variant="secondary" className="ml-1 text-xs">{orders.length}</Badge>}</TabsTrigger>
            <TabsTrigger value="faq" className="gap-1.5 text-sm"><HelpCircle className="w-4 h-4" /> FAQ<Badge variant="secondary" className="ml-1 text-xs">{faqs.length}</Badge></TabsTrigger>
            <TabsTrigger value="stats" className="gap-1.5 text-sm"><BarChart3 className="w-4 h-4" /> Statistika</TabsTrigger>
            <TabsTrigger value="categories" className="gap-1.5 text-sm"><FolderTree className="w-4 h-4" /> Kategorijas</TabsTrigger>
            <TabsTrigger value="access" className="gap-1.5 text-sm"><UserCheck className="w-4 h-4" /> Piekļuve</TabsTrigger>
          </TabsList>

          <TabsContent value="design">
            <div className="flex justify-end mb-3 sm:mb-4">
              <Button onClick={() => openCreateDialog(true)} className="w-full sm:w-auto bg-primary text-primary-foreground"><Plus className="w-4 h-4 mr-2" /> Jauns dizains</Button>
            </div>
            {loadingProducts ? <p className="text-muted-foreground text-center py-12 font-body">{t("admin.loadingProducts")}</p> : renderProductGrid(designProducts, true)}
          </TabsContent>

          <TabsContent value="collection">
            <div className="flex justify-end mb-3 sm:mb-4">
              <Button onClick={() => openCreateDialog(false)} className="w-full sm:w-auto bg-primary text-primary-foreground"><Plus className="w-4 h-4 mr-2" /> Jauns kolekcijas produkts</Button>
            </div>
            {loadingProducts ? <p className="text-muted-foreground text-center py-12 font-body">{t("admin.loadingProducts")}</p> : renderProductGrid(collectionProducts, false)}
          </TabsContent>

          <TabsContent value="orders">
            <Suspense fallback={<TabFallback />}>
              <OrdersList orders={orders} orderItems={orderItems} loading={loadingOrders} onRefresh={loadOrders} />
            </Suspense>
          </TabsContent>

          <TabsContent value="faq">
            <Suspense fallback={<TabFallback />}>
              <FAQManager faqs={faqs} loading={loadingFaqs} onRefresh={loadFaqs} />
            </Suspense>
          </TabsContent>

          <TabsContent value="stats">
            <Suspense fallback={<TabFallback />}>
              <ProductStats orders={orders} orderItems={orderItems} />
            </Suspense>
          </TabsContent>

          <TabsContent value="categories">
            <Suspense fallback={<TabFallback />}>
              <CategoryManager />
            </Suspense>
          </TabsContent>

          <TabsContent value="access">
            <Card className="border border-border">
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div>
                  <h3 className="text-base sm:text-lg font-display mb-1">Adminu Baltais Saraksts</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground font-body">Ievadi e-pastu, lai piešķirtu piekļuvi admin panelim.</p>
                </div>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={newWhitelistEmail}
                    onChange={(e) => setNewWhitelistEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addWhitelistEmail()}
                    placeholder="epasts@piemers.lv"
                    className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-border bg-card text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <Button onClick={addWhitelistEmail} className="bg-primary text-primary-foreground shrink-0">
                    <Plus className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">Pievienot</span>
                  </Button>
                </div>
                {loadingWhitelist ? (
                  <p className="text-muted-foreground text-sm py-4 text-center">Ielādē...</p>
                ) : whitelistEmails.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-4 text-center">Nav neviena e-pasta baltajā sarakstā.</p>
                ) : (
                  <div className="space-y-2">
                    {whitelistEmails.map((item) => (
                      <div key={item.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50 border border-border">
                        <span className="text-xs sm:text-sm font-body truncate mr-2">{item.email}</span>
                        <button onClick={() => removeWhitelistEmail(item.id)} className="p-1 text-destructive hover:text-destructive/80 transition-colors shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Mobile bottom navigation */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border flex justify-around py-1.5 safe-bottom">
        {[
          { value: "design", icon: Brush, label: "Dizains" },
          { value: "collection", icon: ShoppingBag, label: "Kolekcija" },
          { value: "orders", icon: Package, label: "Pasūtījumi" },
          { value: "stats", icon: BarChart3, label: "Stat." },
          { value: "categories", icon: FolderTree, label: "Kat." },
          { value: "faq", icon: HelpCircle, label: "FAQ" },
          { value: "access", icon: UserCheck, label: "Piekļuve" },
        ].map(({ value, icon: Icon, label }) => (
          <button
            key={value}
            onClick={() => { setActiveTab(value); setAdminCategoryFilter("all"); }}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-body transition-colors ${
              activeTab === value ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Icon className="w-5 h-5" />
            {label}
          </button>
        ))}
      </nav>

      {/* Bottom padding for mobile nav */}
      <div className="sm:hidden h-16" />

      {dialogOpen && (
        <Suspense fallback={null}>
          <ProductDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            product={editingProduct}
            onProductChange={setEditingProduct}
            onSaved={loadProducts}
          />
        </Suspense>
      )}
    </div>
  );
};

export default Admin;
