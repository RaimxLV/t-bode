import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Save, ArrowLeft, Upload, X, Pencil, ImagePlus, Palette, Package, ShoppingBag, Brush, HelpCircle, BarChart3, AlertTriangle, Layers } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProductCard } from "@/components/ProductCard";
import { useTranslation } from "react-i18next";
import { CATEGORY_ICONS } from "@/components/CategoryIcons";
import logo from "@/assets/logo.svg";

interface ColorVariant { name: string; hex: string; images: string[]; }
interface ProductForm { id?: string; name: string; slug: string; description: string; price: number; category: string; sizes: string[]; customizable: boolean; color_variants: ColorVariant[]; image_url: string; in_stock: boolean; }

const CATEGORIES = [
  { value: "t-shirts", labelKey: "categories.t-shirts" },
  { value: "hoodies", labelKey: "categories.hoodies" },
  { value: "mugs", labelKey: "categories.mugs" },
  { value: "bags", labelKey: "categories.bags" },
  { value: "kids", labelKey: "categories.kids" },
  { value: "latvia", labelKey: "categories.latvia" },
  { value: "accessories", labelKey: "categories.accessories" },
];

const COMMON_SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];

type DBProduct = { id: string; name: string; slug: string; description: string | null; price: number; category: string; sizes: string[] | null; colors: string[] | null; customizable: boolean; color_variants: ColorVariant[]; image_url: string | null; in_stock: boolean; created_at: string; updated_at: string; };

const EMPTY_PRODUCT: ProductForm = { name: "", slug: "", description: "", price: 0, category: "t-shirts", sizes: [], customizable: false, color_variants: [], image_url: "", in_stock: true };

interface FAQForm {
  id?: string;
  question_lv: string;
  answer_lv: string;
  question_en: string;
  answer_en: string;
  sort_order: number;
  is_active: boolean;
}

const EMPTY_FAQ: FAQForm = { question_lv: "", answer_lv: "", question_en: "", answer_en: "", sort_order: 0, is_active: true };

const ORDER_STATUSES = [
  { value: "pending", key: "admin.orderStatuses.pending", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  { value: "confirmed", key: "admin.orderStatuses.confirmed", color: "bg-blue-100 text-blue-800 border-blue-200" },
  { value: "processing", key: "admin.orderStatuses.processing", color: "bg-purple-100 text-purple-800 border-purple-200" },
  { value: "shipped", key: "admin.orderStatuses.shipped", color: "bg-cyan-100 text-cyan-800 border-cyan-200" },
  { value: "delivered", key: "admin.orderStatuses.delivered", color: "bg-green-100 text-green-800 border-green-200" },
  { value: "cancelled", key: "admin.orderStatuses.cancelled", color: "bg-red-100 text-red-800 border-red-200" },
];

// ---------- Stats Card ----------
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
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newSize, setNewSize] = useState("");
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("design");
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderItems, setOrderItems] = useState<Record<string, any[]>>({});
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");
  const [faqs, setFaqs] = useState<any[]>([]);
  const [loadingFaqs, setLoadingFaqs] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQForm | null>(null);
  const [faqDialogOpen, setFaqDialogOpen] = useState(false);
  const [savingFaq, setSavingFaq] = useState(false);
  const [adminCategoryFilter, setAdminCategoryFilter] = useState("all");

  const designProducts = products.filter((p) => p.customizable);
  const collectionProducts = products.filter((p) => !p.customizable);

  // Stats
  const stats = useMemo(() => {
    const outOfStock = products.filter((p) => !p.in_stock).length;
    const activeDesigns = designProducts.length;
    return { total: products.length, outOfStock, activeDesigns };
  }, [products, designProducts]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
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

  const handleSaveFaq = async () => {
    if (!editingFaq || !editingFaq.question_lv || !editingFaq.answer_lv) { toast.error(t("admin.faqSaveError")); return; }
    setSavingFaq(true);
    const payload = { question_lv: editingFaq.question_lv, answer_lv: editingFaq.answer_lv, question_en: editingFaq.question_en, answer_en: editingFaq.answer_en, sort_order: editingFaq.sort_order, is_active: editingFaq.is_active };
    if (editingFaq.id) {
      const { error } = await supabase.from("faqs").update(payload).eq("id", editingFaq.id);
      if (error) toast.error(t("admin.faqSaveError"));
      else toast.success(t("admin.faqSaved"));
    } else {
      const { error } = await supabase.from("faqs").insert(payload);
      if (error) toast.error(t("admin.faqSaveError"));
      else toast.success(t("admin.faqCreated"));
    }
    setSavingFaq(false); setFaqDialogOpen(false); setEditingFaq(null); loadFaqs();
  };

  const handleDeleteFaq = async (id: string) => {
    if (!confirm(t("admin.faqDeleteConfirm"))) return;
    const { error } = await supabase.from("faqs").delete().eq("id", id);
    if (error) toast.error(t("admin.faqDeleteError"));
    else { toast.success(t("admin.faqDeleted")); loadFaqs(); }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status: status as any }).eq("id", orderId);
    if (error) toast.error(t("admin.statusError"));
    else { toast.success(t("admin.statusUpdated")); loadOrders(); }
  };

  const getStatusInfo = (status: string) => ORDER_STATUSES.find((s) => s.value === status) || ORDER_STATUSES[0];
  const generateSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const openCreateDialog = (forDesign: boolean) => { setEditingProduct({ ...EMPTY_PRODUCT, customizable: forDesign }); setDialogOpen(true); };
  const openEditDialog = (product: DBProduct) => {
    setEditingProduct({ id: product.id, name: product.name, slug: product.slug, description: product.description || "", price: product.price, category: product.category, sizes: product.sizes || [], customizable: product.customizable, color_variants: (product.color_variants as ColorVariant[]) || [], image_url: product.image_url || "", in_stock: product.in_stock });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingProduct) return;
    if (!editingProduct.name || !editingProduct.slug) { toast.error(t("admin.nameSlugRequired")); return; }
    setSaving(true);
    const payload = { name: editingProduct.name, slug: editingProduct.slug, description: editingProduct.description || null, price: editingProduct.price, category: editingProduct.category, sizes: editingProduct.sizes, colors: editingProduct.color_variants.map((c) => c.name), customizable: editingProduct.customizable, color_variants: JSON.parse(JSON.stringify(editingProduct.color_variants)), image_url: editingProduct.image_url || null, in_stock: editingProduct.in_stock };
    if (editingProduct.id) {
      const { error } = await supabase.from("products").update(payload).eq("id", editingProduct.id);
      if (error) toast.error(t("admin.saveError") + ": " + error.message);
      else toast.success(t("admin.productSaved"));
    } else {
      const { error } = await supabase.from("products").insert(payload);
      if (error) toast.error(t("admin.createError") + ": " + error.message);
      else toast.success(t("admin.productCreated"));
    }
    setSaving(false); setDialogOpen(false); setEditingProduct(null); loadProducts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("admin.deleteConfirm"))) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast.error(t("admin.deleteError") + ": " + error.message);
    else { toast.success(t("admin.productDeleted")); loadProducts(); }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: "main" | { colorIndex: number }) => {
    const file = e.target.files?.[0];
    if (!file || !editingProduct) return;
    const key = typeof target === "string" ? "main" : `color-${target.colorIndex}`;
    setUploadingImage(key);
    const ext = file.name.split(".").pop();
    const path = `${editingProduct.slug || "temp"}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: true });
    if (error) { toast.error(t("admin.uploadError")); setUploadingImage(null); return; }
    const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
    const url = urlData.publicUrl;
    if (target === "main") { setEditingProduct({ ...editingProduct, image_url: url }); }
    else { const variants = [...editingProduct.color_variants]; variants[target.colorIndex].images.push(url); setEditingProduct({ ...editingProduct, color_variants: variants }); }
    setUploadingImage(null);
  };

  // Inline toggle in-stock
  const toggleInStock = async (product: DBProduct) => {
    const newVal = !product.in_stock;
    const { error } = await supabase.from("products").update({ in_stock: newVal }).eq("id", product.id);
    if (error) toast.error(t("admin.saveError"));
    else {
      setProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, in_stock: newVal } : p));
      toast.success(t("admin.productSaved"));
    }
  };

  // Inline price update
  const updatePrice = async (product: DBProduct, newPrice: number) => {
    if (newPrice === product.price) return;
    const { error } = await supabase.from("products").update({ price: newPrice }).eq("id", product.id);
    if (error) toast.error(t("admin.saveError"));
    else {
      setProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, price: newPrice } : p));
      toast.success(t("admin.productSaved"));
    }
  };

  const addColorVariant = () => { if (!editingProduct) return; setEditingProduct({ ...editingProduct, color_variants: [...editingProduct.color_variants, { name: "", hex: "#000000", images: [] }] }); };
  const removeColorVariant = (index: number) => { if (!editingProduct) return; setEditingProduct({ ...editingProduct, color_variants: editingProduct.color_variants.filter((_, i) => i !== index) }); };
  const updateColorVariant = (index: number, field: keyof ColorVariant, value: string | string[]) => { if (!editingProduct) return; const variants = [...editingProduct.color_variants]; (variants[index] as any)[field] = value; setEditingProduct({ ...editingProduct, color_variants: variants }); };
  const removeColorImage = (colorIndex: number, imageIndex: number) => { if (!editingProduct) return; const variants = [...editingProduct.color_variants]; variants[colorIndex].images = variants[colorIndex].images.filter((_, i) => i !== imageIndex); setEditingProduct({ ...editingProduct, color_variants: variants }); };
  const toggleSize = (size: string) => { if (!editingProduct) return; const sizes = editingProduct.sizes.includes(size) ? editingProduct.sizes.filter((s) => s !== size) : [...editingProduct.sizes, size]; setEditingProduct({ ...editingProduct, sizes }); };
  const addCustomSize = () => { if (!editingProduct || !newSize.trim()) return; if (!editingProduct.sizes.includes(newSize.trim())) { setEditingProduct({ ...editingProduct, sizes: [...editingProduct.sizes, newSize.trim()] }); } setNewSize(""); };

  if (authLoading || checking) {
    return (<div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground font-body">{t("admin.loading")}</p></div>);
  }
  if (!isAdmin) return null;

  // Filter products for table by category
  const filterProductsForTab = (items: DBProduct[]) => {
    if (adminCategoryFilter === "all") return items;
    return items.filter((p) => p.category === adminCategoryFilter);
  };

  const renderProductGrid = (items: DBProduct[], forDesign: boolean) => {
    const filtered = filterProductsForTab(items);
    const relevantCategories = forDesign
      ? CATEGORIES.filter((c) => !["latvia", "accessories"].includes(c.value))
      : CATEGORIES.filter((c) => ["latvia", "accessories"].includes(c.value));

    return (
      <>
        {/* Category filter with icons */}
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
              <ProductCard
                key={p.id}
                product={p}
                onEdit={openEditDialog}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}><ArrowLeft className="w-5 h-5" /></Button>
            <img src={logo} alt="T-Bode" className="h-8" />
            <span className="font-display text-lg tracking-wide">{t("admin.panel")}</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard icon={Layers} label="Kopā produkti" value={stats.total} />
          <StatCard icon={AlertTriangle} label="Nav noliktavā" value={stats.outOfStock} accent="bg-destructive/10 text-destructive" />
          <StatCard icon={Brush} label="Aktīvie dizaini" value={stats.activeDesigns} accent="bg-blue-50 text-blue-600" />
        </div>

        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setAdminCategoryFilter("all"); }}>
          <TabsList className="mb-6">
            <TabsTrigger value="design" className="gap-2"><Brush className="w-4 h-4" /> {t("admin.designTab")}<Badge variant="secondary" className="ml-1 text-xs">{designProducts.length}</Badge></TabsTrigger>
            <TabsTrigger value="collection" className="gap-2"><ShoppingBag className="w-4 h-4" /> {t("admin.collectionTab")}<Badge variant="secondary" className="ml-1 text-xs">{collectionProducts.length}</Badge></TabsTrigger>
            <TabsTrigger value="orders" className="gap-2"><Package className="w-4 h-4" /> {t("admin.ordersTab")}{orders.length > 0 && <Badge variant="secondary" className="ml-1 text-xs">{orders.length}</Badge>}</TabsTrigger>
            <TabsTrigger value="faq" className="gap-2"><HelpCircle className="w-4 h-4" /> {t("admin.faqTab")}<Badge variant="secondary" className="ml-1 text-xs">{faqs.length}</Badge></TabsTrigger>
          </TabsList>

          <TabsContent value="design">
            <div className="flex justify-end mb-4">
              <Button onClick={() => openCreateDialog(true)} className="bg-primary text-primary-foreground"><Plus className="w-4 h-4 mr-2" /> {t("admin.newDesignProduct")}</Button>
            </div>
            {loadingProducts ? <p className="text-muted-foreground text-center py-12 font-body">{t("admin.loadingProducts")}</p> : renderProductGrid(designProducts, true)}
          </TabsContent>

          <TabsContent value="collection">
            <div className="flex justify-end mb-4">
              <Button onClick={() => openCreateDialog(false)} className="bg-primary text-primary-foreground"><Plus className="w-4 h-4 mr-2" /> {t("admin.newCollectionProduct")}</Button>
            </div>
            {loadingProducts ? <p className="text-muted-foreground text-center py-12 font-body">{t("admin.loadingProducts")}</p> : renderProductGrid(collectionProducts, false)}
          </TabsContent>

          <TabsContent value="orders">
            <div className="flex flex-wrap items-end gap-3 mb-4">
              <div>
                <Label className="font-body text-xs text-muted-foreground">{t("admin.filterStatus")}</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[140px] text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">{t("admin.filterAll")}</SelectItem>
                    {ORDER_STATUSES.map((s) => (<SelectItem key={s.value} value={s.value} className="text-xs">{t(s.key)}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="font-body text-xs text-muted-foreground">{t("admin.filterDateFrom")}</Label>
                <Input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="w-[150px] text-xs mt-1" />
              </div>
              <div>
                <Label className="font-body text-xs text-muted-foreground">{t("admin.filterDateTo")}</Label>
                <Input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="w-[150px] text-xs mt-1" />
              </div>
              {(filterStatus !== "all" || filterDateFrom || filterDateTo) && (
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setFilterStatus("all"); setFilterDateFrom(""); setFilterDateTo(""); }}>
                  <X className="w-3 h-3 mr-1" /> {t("admin.clearFilters")}
                </Button>
              )}
            </div>

            {loadingOrders ? (
              <p className="text-muted-foreground text-center py-12 font-body">{t("admin.loadingOrders")}</p>
            ) : (() => {
              const filteredOrders = orders.filter((order) => {
                if (filterStatus !== "all" && order.status !== filterStatus) return false;
                if (filterDateFrom && new Date(order.created_at) < new Date(filterDateFrom)) return false;
                if (filterDateTo) { const to = new Date(filterDateTo); to.setHours(23, 59, 59, 999); if (new Date(order.created_at) > to) return false; }
                return true;
              });
              return filteredOrders.length === 0 ? (
                <div className="text-center py-20"><p className="text-muted-foreground font-body">{t("admin.noOrders")}</p></div>
              ) : (
                <div className="space-y-4">
                  {filteredOrders.map((order) => {
                    const statusInfo = getStatusInfo(order.status);
                    const items = orderItems[order.id] || [];
                    return (
                      <Card key={order.id} className="border border-border">
                        <CardContent className="p-4">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="font-body font-semibold text-sm">#{order.id.slice(0, 8)}</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-body font-semibold border ${statusInfo.color}`}>{t(statusInfo.key)}</span>
                                <span className="text-xs text-muted-foreground font-body">{new Date(order.created_at).toLocaleDateString("lv-LV", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                              </div>
                              <div className="text-xs text-muted-foreground font-body space-y-1">
                                {order.shipping_name && <p>👤 {order.shipping_name} · {order.shipping_phone}</p>}
                                {order.shipping_address && <p>📍 {order.shipping_address}, {order.shipping_city} {order.shipping_zip}</p>}
                                {order.omniva_pickup_point && <p>📦 Omniva: {order.omniva_pickup_point}</p>}
                                {order.notes && <p>📝 {order.notes}</p>}
                              </div>
                              {items.length > 0 && (
                                <div className="mt-3 border-t border-border pt-2">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="text-xs">{t("admin.orderProduct")}</TableHead>
                                        <TableHead className="text-xs">{t("admin.orderSize")}</TableHead>
                                        <TableHead className="text-xs">{t("admin.orderColor")}</TableHead>
                                        <TableHead className="text-xs text-right">{t("admin.orderQty")}</TableHead>
                                        <TableHead className="text-xs text-right">{t("admin.orderPrice")}</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {items.map((item: any) => (
                                        <TableRow key={item.id}>
                                          <TableCell className="text-xs font-body">{item.product_name}</TableCell>
                                          <TableCell className="text-xs">{item.size || "—"}</TableCell>
                                          <TableCell className="text-xs">{item.color || "—"}</TableCell>
                                          <TableCell className="text-xs text-right">{item.quantity}</TableCell>
                                          <TableCell className="text-xs text-right">{item.unit_price.toFixed(2)} €</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-2 min-w-[140px]">
                              <span className="font-body font-bold text-lg">{Number(order.total).toFixed(2)} €</span>
                              <Select value={order.status} onValueChange={(v) => updateOrderStatus(order.id, v)}>
                                <SelectTrigger className="w-[140px] text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {ORDER_STATUSES.map((s) => (<SelectItem key={s.value} value={s.value} className="text-xs">{t(s.key)}</SelectItem>))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              );
            })()}
          </TabsContent>

          <TabsContent value="faq">
            <div className="flex justify-end mb-4">
              <Button onClick={() => { setEditingFaq({ ...EMPTY_FAQ }); setFaqDialogOpen(true); }} className="bg-primary text-primary-foreground"><Plus className="w-4 h-4 mr-2" /> {t("admin.newFaq")}</Button>
            </div>
            {loadingFaqs ? (
              <p className="text-muted-foreground text-center py-12 font-body">{t("admin.loadingFaqs")}</p>
            ) : faqs.length === 0 ? (
              <div className="text-center py-20"><p className="text-muted-foreground font-body">{t("admin.noFaqs")}</p></div>
            ) : (
              <div className="space-y-3">
                {faqs.map((faq) => (
                  <Card key={faq.id} className="border border-border">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-muted-foreground font-body">#{faq.sort_order}</span>
                            {!faq.is_active && <Badge variant="secondary" className="text-xs">Neaktīvs</Badge>}
                          </div>
                          <h3 className="font-body font-semibold text-sm truncate">{faq.question_lv}</h3>
                          <p className="text-xs text-muted-foreground font-body mt-1 line-clamp-2">{faq.answer_lv}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button size="icon" variant="ghost" onClick={() => { setEditingFaq({ id: faq.id, question_lv: faq.question_lv, answer_lv: faq.answer_lv, question_en: faq.question_en, answer_en: faq.answer_en, sort_order: faq.sort_order, is_active: faq.is_active }); setFaqDialogOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDeleteFaq(faq.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* FAQ Dialog */}
      <Dialog open={faqDialogOpen} onOpenChange={setFaqDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{editingFaq?.id ? t("admin.editFaq") : t("admin.newFaq")}</DialogTitle>
          </DialogHeader>
          {editingFaq && (
            <div className="space-y-4">
              <div>
                <Label className="font-body text-sm">{t("admin.questionLv")}</Label>
                <Input value={editingFaq.question_lv} onChange={(e) => setEditingFaq({ ...editingFaq, question_lv: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label className="font-body text-sm">{t("admin.answerLv")}</Label>
                <Textarea value={editingFaq.answer_lv} onChange={(e) => setEditingFaq({ ...editingFaq, answer_lv: e.target.value })} className="mt-1" rows={3} />
              </div>
              <div>
                <Label className="font-body text-sm">{t("admin.questionEn")}</Label>
                <Input value={editingFaq.question_en} onChange={(e) => setEditingFaq({ ...editingFaq, question_en: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label className="font-body text-sm">{t("admin.answerEn")}</Label>
                <Textarea value={editingFaq.answer_en} onChange={(e) => setEditingFaq({ ...editingFaq, answer_en: e.target.value })} className="mt-1" rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-body text-sm">{t("admin.sortOrder")}</Label>
                  <Input type="number" value={editingFaq.sort_order} onChange={(e) => setEditingFaq({ ...editingFaq, sort_order: parseInt(e.target.value) || 0 })} className="mt-1" />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch checked={editingFaq.is_active} onCheckedChange={(v) => setEditingFaq({ ...editingFaq, is_active: v })} />
                  <Label className="font-body text-sm">{t("admin.faqActive")}</Label>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button variant="outline" onClick={() => setFaqDialogOpen(false)}>{t("admin.cancel")}</Button>
                <Button onClick={handleSaveFaq} disabled={savingFaq} className="bg-primary text-primary-foreground">
                  <Save className="w-4 h-4 mr-2" />
                  {savingFaq ? t("admin.saving") : t("admin.save")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Product Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{editingProduct?.id ? t("admin.editProduct") : t("admin.newProduct")}</DialogTitle>
          </DialogHeader>

          {editingProduct && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="font-body text-sm">{t("admin.productName")}</Label>
                  <Input value={editingProduct.name} onChange={(e) => { const name = e.target.value; setEditingProduct({ ...editingProduct, name, slug: editingProduct.id ? editingProduct.slug : generateSlug(name) }); }} placeholder={t("admin.productName")} className="mt-1" />
                </div>
                <div>
                  <Label className="font-body text-sm">{t("admin.slug")}</Label>
                  <Input value={editingProduct.slug} onChange={(e) => setEditingProduct({ ...editingProduct, slug: e.target.value })} placeholder="produkta-slug" className="mt-1" />
                </div>
                <div>
                  <Label className="font-body text-sm">{t("admin.price")}</Label>
                  <Input type="number" step="0.01" value={editingProduct.price} onChange={(e) => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) || 0 })} className="mt-1" />
                </div>
                <div>
                  <Label className="font-body text-sm">{t("admin.category")}</Label>
                  <Select value={editingProduct.category} onValueChange={(v) => setEditingProduct({ ...editingProduct, category: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map((c) => (<SelectItem key={c.value} value={c.value}>{t(c.labelKey)}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="font-body text-sm">{t("admin.description")}</Label>
                <Textarea value={editingProduct.description} onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })} placeholder={t("admin.description")} className="mt-1" rows={3} />
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={editingProduct.customizable} onCheckedChange={(v) => setEditingProduct({ ...editingProduct, customizable: v })} />
                  <Label className="font-body text-sm">{t("admin.customizable")}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={editingProduct.in_stock} onCheckedChange={(v) => setEditingProduct({ ...editingProduct, in_stock: v })} />
                  <Label className="font-body text-sm">{t("admin.inStock")}</Label>
                </div>
              </div>

              <div>
                <Label className="font-body text-sm">{t("admin.mainImage")}</Label>
                <div className="mt-1 flex items-center gap-3">
                  {editingProduct.image_url && <img src={editingProduct.image_url} alt="Main" className="w-20 h-20 object-cover rounded border border-border" />}
                  <label className="cursor-pointer">
                    <div className="flex items-center gap-2 px-3 py-2 border border-border rounded-md hover:bg-muted text-sm font-body">
                      <Upload className="w-4 h-4" />
                      {uploadingImage === "main" ? t("admin.uploading") : t("admin.upload")}
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "main")} disabled={uploadingImage === "main"} />
                  </label>
                  {editingProduct.image_url && <Input value={editingProduct.image_url} onChange={(e) => setEditingProduct({ ...editingProduct, image_url: e.target.value })} placeholder={t("admin.orEnterUrl")} className="flex-1" />}
                </div>
              </div>

              <div>
                <Label className="font-body text-sm">{t("admin.sizes")}</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {COMMON_SIZES.map((size) => (
                    <button key={size} onClick={() => toggleSize(size)} className={`px-3 py-1 text-xs font-body rounded-md border transition-colors ${editingProduct.sizes.includes(size) ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/40"}`}>{size}</button>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <Input value={newSize} onChange={(e) => setNewSize(e.target.value)} placeholder={t("admin.otherSize")} className="w-32" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomSize())} />
                  <Button variant="outline" size="sm" onClick={addCustomSize}>{t("admin.add")}</Button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="font-body text-sm flex items-center gap-2"><Palette className="w-4 h-4" /> {t("admin.colorVariants")}</Label>
                  <Button variant="outline" size="sm" onClick={addColorVariant}><Plus className="w-3 h-3 mr-1" /> {t("admin.addColor")}</Button>
                </div>
                <div className="space-y-4">
                  {editingProduct.color_variants.map((variant, ci) => (
                    <Card key={ci} className="p-4 border border-border">
                      <div className="flex items-center gap-3 mb-3">
                        <input type="color" value={variant.hex} onChange={(e) => updateColorVariant(ci, "hex", e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
                        <Input value={variant.name} onChange={(e) => updateColorVariant(ci, "name", e.target.value)} placeholder={t("admin.colorName")} className="flex-1" />
                        <Input value={variant.hex} onChange={(e) => updateColorVariant(ci, "hex", e.target.value)} placeholder="#000000" className="w-28" />
                        <Button variant="ghost" size="icon" onClick={() => removeColorVariant(ci)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {variant.images.map((img, ii) => (
                          <div key={ii} className="relative group">
                            <img src={img} alt="" className="w-16 h-16 object-cover rounded border border-border" />
                            <button onClick={() => removeColorImage(ci, ii)} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                          </div>
                        ))}
                        <label className="cursor-pointer w-16 h-16 border border-dashed border-border rounded flex items-center justify-center hover:border-primary/40 transition-colors">
                          {uploadingImage === `color-${ci}` ? <span className="text-xs text-muted-foreground">...</span> : <ImagePlus className="w-5 h-5 text-muted-foreground" />}
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, { colorIndex: ci })} disabled={uploadingImage === `color-${ci}`} />
                        </label>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("admin.cancel")}</Button>
                <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground">
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? t("admin.saving") : t("admin.save")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
