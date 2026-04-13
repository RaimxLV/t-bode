import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, ArrowLeft, Brush, Package, ShoppingBag, HelpCircle, AlertTriangle, Layers, Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ProductCard } from "@/components/ProductCard";
import { useTranslation } from "react-i18next";
import { CATEGORY_ICONS } from "@/components/CategoryIcons";
import logo from "@/assets/logo.svg";
import { ProductDialog, EMPTY_PRODUCT, type ProductForm, type ColorVariant } from "@/components/admin/ProductDialog";
import { OrdersList } from "@/components/admin/OrdersList";
import { FAQManager } from "@/components/admin/FAQManager";

type DBProduct = { id: string; name: string; slug: string; description: string | null; price: number; category: string; sizes: string[] | null; colors: string[] | null; customizable: boolean; color_variants: ColorVariant[]; image_url: string | null; in_stock: boolean; created_at: string; updated_at: string; };

const CATEGORIES = [
  { value: "t-shirts", labelKey: "categories.t-shirts" },
  { value: "hoodies", labelKey: "categories.hoodies" },
  { value: "mugs", labelKey: "categories.mugs" },
  { value: "bags", labelKey: "categories.bags" },
  { value: "kids", labelKey: "categories.kids" },
  { value: "latvia", labelKey: "categories.latvia" },
  { value: "accessories", labelKey: "categories.accessories" },
];

const StatCard = ({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string | number; accent?: string }) => (
  <Card className="border border-border">
    <CardContent className="p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accent || "bg-primary/10 text-primary"}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-display">{value}</p>
        <p className="text-xs text-muted-foreground font-body">{label}</p>
      </div>
    </CardContent>
  </Card>
);

const Admin = () => {
  const { user, loading: authLoading } = useAuth();
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

  const designProducts = products.filter((p) => p.customizable);
  const collectionProducts = products.filter((p) => !p.customizable);

  const stats = useMemo(() => ({
    total: products.length,
    outOfStock: products.filter((p) => !p.in_stock).length,
    activeDesigns: designProducts.length,
  }), [products, designProducts]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    // Admin panel only allows email/password login — block OAuth users
    const provider = user.app_metadata?.provider;
    if (provider && provider !== "email") {
      toast.error("Administrācijas panelis pieejams tikai ar e-pasta autentifikāciju");
      navigate("/");
      return;
    }
    const checkRole = async () => {
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (!data) { toast.error(t("admin.noAccess")); navigate("/"); return; }
      setIsAdmin(true); setChecking(false);
    };
    checkRole();
  }, [user, authLoading, navigate, t]);

  useEffect(() => { if (!isAdmin) return; loadProducts(); loadOrders(); loadFaqs(); }, [isAdmin]);

  const loadProducts = async () => {
    setLoadingProducts(true);
    const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
    if (error) toast.error(t("admin.loadError"));
    else setProducts((data as unknown as DBProduct[]) || []);
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
        const { data: items } = await supabase.from("order_items").select("*").in("order_id", ids);
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
    setEditingProduct({ id: product.id, name: product.name, slug: product.slug, description: product.description || "", price: product.price, category: product.category, sizes: product.sizes || [], customizable: product.customizable, color_variants: (product.color_variants as ColorVariant[]) || [], image_url: product.image_url || "", in_stock: product.in_stock, zakeke_model_code: (product as any).zakeke_model_code || "" });
    setDialogOpen(true);
  };

  if (authLoading || checking) {
    return (<div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground font-body">{t("admin.loading")}</p></div>);
  }
  if (!isAdmin) return null;

  const filterProductsForTab = (items: DBProduct[]) => {
    let result = items;
    if (adminCategoryFilter !== "all") result = result.filter((p) => p.category === adminCategoryFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q));
    }
    return result;
  };

  const renderProductGrid = (items: DBProduct[], forDesign: boolean) => {
    const filtered = filterProductsForTab(items);
    const relevantCategories = forDesign
      ? CATEGORIES.filter((c) => !["latvia", "accessories"].includes(c.value))
      : CATEGORIES.filter((c) => ["latvia", "accessories"].includes(c.value));

    return (
      <>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("admin.searchProducts", "Meklēt produktus...")}
            className="w-full sm:w-64 pl-9 pr-3 py-2 rounded-lg border border-border bg-card text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setAdminCategoryFilter("all")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-body font-medium border transition-all ${
              adminCategoryFilter === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            {t("admin.filterAll")}
          </button>
          {relevantCategories.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.value];
            return (
              <button
                key={cat.value}
                onClick={() => setAdminCategoryFilter(cat.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-body font-medium border transition-all ${
                  adminCategoryFilter === cat.value ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:text-foreground"
                }`}
              >
                {Icon && <Icon size={14} />}
                {t(cat.labelKey)}
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20"><p className="text-muted-foreground font-body">{t("admin.noProducts")}</p></div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
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
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="text-white/70 hover:text-white hover:bg-white/10"><ArrowLeft className="w-5 h-5" /></Button>
            <img src={logo} alt="T-Bode" className="h-8" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard icon={Layers} label="Kopā produkti" value={stats.total} />
          <StatCard icon={AlertTriangle} label="Nav noliktavā" value={stats.outOfStock} accent="bg-destructive/10 text-destructive" />
          <StatCard icon={Brush} label="Aktīvie dizaini" value={stats.activeDesigns} accent="bg-blue-50 text-blue-600" />
        </div>

        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setAdminCategoryFilter("all"); }}>
          <TabsList className="mb-6 w-full max-w-full overflow-x-auto justify-start">
            <TabsTrigger value="design" className="gap-1.5 text-xs sm:text-sm"><Brush className="w-4 h-4 hidden sm:block" /> Dizains<Badge variant="secondary" className="ml-1 text-xs">{designProducts.length}</Badge></TabsTrigger>
            <TabsTrigger value="collection" className="gap-1.5 text-xs sm:text-sm"><ShoppingBag className="w-4 h-4 hidden sm:block" /> Kolekcija<Badge variant="secondary" className="ml-1 text-xs">{collectionProducts.length}</Badge></TabsTrigger>
            <TabsTrigger value="orders" className="gap-1.5 text-xs sm:text-sm"><Package className="w-4 h-4 hidden sm:block" /> Pasūtījumi{orders.length > 0 && <Badge variant="secondary" className="ml-1 text-xs">{orders.length}</Badge>}</TabsTrigger>
            <TabsTrigger value="faq" className="gap-1.5 text-xs sm:text-sm"><HelpCircle className="w-4 h-4 hidden sm:block" /> FAQ<Badge variant="secondary" className="ml-1 text-xs">{faqs.length}</Badge></TabsTrigger>
          </TabsList>

          <TabsContent value="design">
            <div className="flex justify-end mb-4">
              <Button onClick={() => openCreateDialog(true)} className="bg-primary text-primary-foreground"><Plus className="w-4 h-4 mr-2" /> Jauns dizains</Button>
            </div>
            {loadingProducts ? <p className="text-muted-foreground text-center py-12 font-body">{t("admin.loadingProducts")}</p> : renderProductGrid(designProducts, true)}
          </TabsContent>

          <TabsContent value="collection">
            <div className="flex justify-end mb-4">
              <Button onClick={() => openCreateDialog(false)} className="bg-primary text-primary-foreground"><Plus className="w-4 h-4 mr-2" /> Jauns kolekcijas produkts</Button>
            </div>
            {loadingProducts ? <p className="text-muted-foreground text-center py-12 font-body">{t("admin.loadingProducts")}</p> : renderProductGrid(collectionProducts, false)}
          </TabsContent>

          <TabsContent value="orders">
            <OrdersList orders={orders} orderItems={orderItems} loading={loadingOrders} onRefresh={loadOrders} />
          </TabsContent>

          <TabsContent value="faq">
            <FAQManager faqs={faqs} loading={loadingFaqs} onRefresh={loadFaqs} />
          </TabsContent>
        </Tabs>
      </main>

      <ProductDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={editingProduct}
        onProductChange={setEditingProduct}
        onSaved={loadProducts}
      />
    </div>
  );
};

export default Admin;