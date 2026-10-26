import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Trash2, Save, Upload, X, Palette, Languages, Loader2, Copy, Eye, EyeOff } from "lucide-react";
import { ImageStrip } from "@/components/admin/ImageStrip";
import { validateForPublish } from "@/lib/readyMadeProducts";
import { useProductThemes } from "@/hooks/useProductThemes";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { useCategories, getTopLevel, getChildren } from "@/hooks/useCategories";
import { useExistingColors } from "@/hooks/useExistingColors";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { slugify as slugifyShared } from "@/lib/slug";

export interface ColorVariant { name: string; hex: string; images: string[]; sizes?: string[]; }
export interface ProductForm { id?: string; name: string; name_lv?: string; name_en?: string; slug: string; description: string; description_lv?: string; description_en?: string; price: number; category: string; sizes: string[]; customizable: boolean; color_variants: ColorVariant[]; image_url: string; mockup_image_url?: string; gallery_images?: string[]; showcase_images?: string[]; in_stock: boolean; is_draft?: boolean; zakeke_model_code: string; theme_ids?: string[]; published_at?: string | null; }

const COMMON_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL", "XXXXXL"];

export const EMPTY_PRODUCT: ProductForm = { name: "", name_lv: "", name_en: "", slug: "", description: "", description_lv: "", description_en: "", price: 0, category: "t-shirts", sizes: [], customizable: false, color_variants: [], image_url: "", mockup_image_url: "", gallery_images: [], showcase_images: [], in_stock: true, is_draft: false, zakeke_model_code: "" };

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductForm | null;
  onProductChange: (product: ProductForm) => void;
  onSaved: () => void;
  /** Duplicates a saved product and opens the copy. */
  onDuplicate?: (id: string) => void;
}

export const ProductDialog = ({ open, onOpenChange, product, onProductChange, onSaved, onDuplicate }: ProductDialogProps) => {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState<"name" | "description" | null>(null);
  const [newSize, setNewSize] = useState("");
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const { data: allCategories = [] } = useCategories();
  const { data: existingColors = [] } = useExistingColors();
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const { data: themes = [] } = useProductThemes();
  const [initialDraft] = useState(() => !!product?.is_draft || !product?.id);

  // Load theme assignments for an existing product once.
  useEffect(() => {
    if (!product?.id || product.theme_ids !== undefined) return;
    let cancelled = false;
    supabase.from("product_theme_assignments").select("theme_id").eq("product_id", product.id).then(({ data }) => {
      if (!cancelled) onProductChange({ ...product, theme_ids: (data ?? []).map((r) => r.theme_id) });
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, product?.theme_ids]);

  const handleAutoTranslate = async (field: "name" | "description", direction: "lv-en" | "en-lv") => {
    if (!product) return;
    const isLvToEn = direction === "lv-en";
    const sourceText = field === "name"
      ? (isLvToEn ? (product.name_lv || product.name) : product.name_en)
      : (isLvToEn ? (product.description_lv || product.description) : product.description_en);
    if (!sourceText?.trim()) {
      toast.error(t("admin.translateEmpty", isLvToEn ? "Vispirms ievadi tekstu latviski" : "Vispirms ievadi tekstu angliski"));
      return;
    }
    setTranslating(field);
    try {
      const { data, error } = await supabase.functions.invoke("translate-product", {
        body: {
          text: sourceText,
          from: isLvToEn ? "lv" : "en",
          to: isLvToEn ? "en" : "lv",
          isHtml: field === "description",
        },
      });
      if (error) throw error;
      const translated = data?.translated;
      if (!translated) throw new Error("No translation returned");
      if (field === "name") {
        onProductChange(isLvToEn
          ? { ...product, name_en: translated }
          : { ...product, name_lv: translated, name: translated });
      } else {
        onProductChange(isLvToEn
          ? { ...product, description_en: translated }
          : { ...product, description_lv: translated, description: translated });
      }
      toast.success(t("admin.translateSuccess", "Iztulkots!"));
    } catch (e: any) {
      toast.error(t("admin.translateError", "Tulkošanas kļūda") + ": " + (e.message || "unknown"));
    } finally {
      setTranslating(null);
    }
  };

  if (!product) return null;

  const topCategories = getTopLevel(allCategories);

  // Build flat list with optgroup-style entries for the single Select
  const categoryOptions: { slug: string; label: string; isChild: boolean }[] = [];
  for (const top of topCategories) {
    categoryOptions.push({ slug: top.slug, label: top.name, isChild: false });
    const children = getChildren(allCategories, top.id);
    for (const child of children) {
      categoryOptions.push({ slug: child.slug, label: child.name, isChild: true });
    }
  }

  // Use shared slugify util — handles Latvian diacritics (ā→a, š→s, …)
  // so admin-generated slugs match the URL convention.
  const generateSlug = (name: string) => slugifyShared(name);

  const handleSave = async () => {
    if (!product.name || !product.slug) { toast.error(t("admin.nameSlugRequired")); return; }
    const publishing = !product.is_draft;
    if (publishing) {
      const missing = validateForPublish(product);
      if (missing.length) { toast.error("Lai publicētu, aizpildi: " + missing.join(", ")); return; }
    }
    setSaving(true);
    const payload = { name: product.name, name_lv: product.name_lv || product.name, name_en: product.name_en || null, slug: product.slug, description: product.description || null, description_lv: product.description_lv || product.description || null, description_en: product.description_en || null, price: product.price, category: product.category, sizes: product.sizes, colors: product.color_variants.map((c) => c.name), customizable: product.customizable, color_variants: JSON.parse(JSON.stringify(product.color_variants)), image_url: product.image_url || null, mockup_image_url: product.mockup_image_url || null, gallery_images: product.gallery_images ?? [], showcase_images: product.showcase_images ?? [], in_stock: product.in_stock, is_draft: !!product.is_draft, zakeke_model_code: product.zakeke_model_code || null };
    let productId = product.id;
    if (productId) {
      const { error } = await supabase.from("products").update(payload).eq("id", productId);
      if (error) { toast.error(t("admin.saveError") + ": " + error.message); setSaving(false); return; }
    } else {
      const { data, error } = await supabase.from("products").insert(payload).select("id").single();
      if (error || !data) { toast.error(t("admin.createError") + ": " + (error?.message ?? "")); setSaving(false); return; }
      productId = data.id;
    }
    if (product.theme_ids !== undefined && productId) {
      const { error: delErr } = await supabase.from("product_theme_assignments").delete().eq("product_id", productId);
      const rows = product.theme_ids.map((theme_id) => ({ product_id: productId!, theme_id }));
      const { error: insErr } = delErr || rows.length === 0 ? { error: delErr } : await supabase.from("product_theme_assignments").insert(rows);
      if (delErr || insErr) toast.error("Tēmas neizdevās saglabāt: " + (delErr ?? insErr)!.message);
    }
    if (publishing && initialDraft) toast.success("Produkts publicēts veikalā");
    else if (!publishing) toast.success("Melnraksts saglabāts — klientiem nav redzams");
    else toast.success(t("admin.productSaved"));
    setSaving(false); onOpenChange(false); onSaved();
  };

  // Uploads new files to storage. Existing files are never deleted from here.
  const uploadFiles = async (files: File[]): Promise<string[]> => {
    const uploaded: string[] = [];
    for (const file of files) {
      const ext = file.name.split(".").pop();
      const path = `${product.slug || "temp"}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file);
      if (error) { toast.error(t("admin.uploadError") + ": " + (error.message || "unknown")); continue; }
      uploaded.push(supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl);
    }
    return uploaded;
  };

  const toggleTheme = (id: string) => {
    const current = product.theme_ids ?? [];
    onProductChange({ ...product, theme_ids: current.includes(id) ? current.filter((x) => x !== id) : [...current, id] });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: "main" | "mockup" | "gallery" | "showcase" | { colorIndex: number }) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const key = typeof target === "string" ? target : `color-${target.colorIndex}`;
    setUploadingImage(key);
    const uploaded: string[] = [];
    for (const file of files) {
      const ext = file.name.split(".").pop();
      const path = `${product.slug || "temp"}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: true });
      if (error) {
        console.error("Image upload error:", error);
        toast.error(t("admin.uploadError") + ": " + (error.message || "unknown"));
        continue;
      }
      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
      uploaded.push(urlData.publicUrl);
    }
    if (uploaded.length > 0) {
      if (target === "main") { onProductChange({ ...product, image_url: uploaded[0] }); }
      else if (target === "mockup") { onProductChange({ ...product, mockup_image_url: uploaded[0] }); }
      else if (target === "gallery") {
        onProductChange({ ...product, gallery_images: [...(product.gallery_images ?? []), ...uploaded] });
      } else if (target === "showcase") {
        onProductChange({ ...product, showcase_images: [...(product.showcase_images ?? []), ...uploaded] });
      } else {
        const variants = [...product.color_variants];
        variants[target.colorIndex].images.push(...uploaded);
        onProductChange({ ...product, color_variants: variants });
      }
    }
    setUploadingImage(null);
    e.target.value = "";
  };

  const toggleSize = (size: string) => {
    const sizes = product.sizes.includes(size) ? product.sizes.filter((s) => s !== size) : [...product.sizes, size];
    onProductChange({ ...product, sizes });
  };

  const addCustomSize = () => {
    if (!newSize.trim()) return;
    if (!product.sizes.includes(newSize.trim())) { onProductChange({ ...product, sizes: [...product.sizes, newSize.trim()] }); }
    setNewSize("");
  };

  const addColorVariant = () => onProductChange({ ...product, color_variants: [{ name: "", hex: "#000000", images: [] }, ...product.color_variants] });
  const addExistingColor = (c: { name: string; hex: string }) => {
    const exists = product.color_variants.some((v) => v.hex.toLowerCase() === c.hex.toLowerCase());
    if (exists) return;
    onProductChange({ ...product, color_variants: [{ name: c.name, hex: c.hex, images: [] }, ...product.color_variants] });
  };
  const removeColorVariant = (i: number) => onProductChange({ ...product, color_variants: product.color_variants.filter((_, idx) => idx !== i) });
  const updateColorVariant = (i: number, field: keyof ColorVariant, value: string | string[]) => { const v = [...product.color_variants]; (v[i] as any)[field] = value; onProductChange({ ...product, color_variants: v }); };
  // Per-color size availability. An empty/undefined list means "all product sizes".
  // Enabling a size that the product doesn't have yet adds it to the product list,
  // but keeps it exclusive to this colour by materialising the other variants' lists.
  const toggleVariantSize = (i: number, size: string) => {
    const variants = product.color_variants.map((v) => ({ ...v, sizes: v.sizes ? [...v.sizes] : v.sizes }));
    const baseSizes = [...product.sizes];
    const current = variants[i].sizes && variants[i].sizes!.length > 0 ? [...variants[i].sizes!] : [...baseSizes];
    const enabling = !current.includes(size);
    let nextProductSizes = baseSizes;

    if (enabling && !baseSizes.includes(size)) {
      variants.forEach((v, idx) => {
        if (idx !== i && (!v.sizes || v.sizes.length === 0)) v.sizes = [...baseSizes];
      });
      nextProductSizes = [...baseSizes, size];
    }

    variants[i].sizes = enabling ? [...current, size] : current.filter((s) => s !== size);
    onProductChange({ ...product, sizes: nextProductSizes, color_variants: variants });
  };
  const [variantSizeInput, setVariantSizeInput] = useState<Record<number, string>>({});
  const addVariantCustomSize = (i: number) => {
    const size = (variantSizeInput[i] ?? "").trim();
    if (!size) return;
    toggleVariantSize(i, size);
    setVariantSizeInput({ ...variantSizeInput, [i]: "" });
  };
  // All sizes offered in the per-colour picker: common sizes + anything already used.
  const variantSizeOptions = (variant: ColorVariant) => {
    const extras = [...product.sizes, ...(variant.sizes ?? [])].filter((s) => !COMMON_SIZES.includes(s));
    return [...COMMON_SIZES, ...Array.from(new Set(extras))];
  };
  const resetVariantSizes = (i: number) => {
    const v = [...product.color_variants];
    v[i] = { ...v[i], sizes: [] };
    onProductChange({ ...product, color_variants: v });
  };
  const removeColorImage = (ci: number, ii: number) => { const v = [...product.color_variants]; v[ci].images = v[ci].images.filter((_, idx) => idx !== ii); onProductChange({ ...product, color_variants: v }); };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-screen h-screen max-w-none max-h-none left-0 top-0 translate-x-0 translate-y-0 p-0 sm:rounded-none flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0 px-4 sm:px-6 py-4 border-b border-border">
          <DialogTitle className="font-display text-xl flex items-center gap-2 flex-wrap">{product.id ? t("admin.editProduct") : t("admin.newProduct")}{product.is_draft && <Badge variant="secondary">Melnraksts</Badge>}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
          <div className={`rounded-lg border p-3 sm:p-4 flex items-start gap-3 ${product.is_draft ? "border-border bg-muted/40" : "border-primary/40 bg-primary/5"}`}>
            <Switch id="product-draft" checked={!!product.is_draft} onCheckedChange={(v) => onProductChange({ ...product, is_draft: v })} aria-describedby="product-draft-help" />
            <div className="min-w-0">
              <Label htmlFor="product-draft" className="font-body text-sm font-semibold flex items-center gap-2">
                {product.is_draft ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />} Melnraksts
              </Label>
              <p id="product-draft-help" className="text-xs text-muted-foreground font-body mt-0.5">
                {product.is_draft
                  ? "Ieslēgts: produkts klientiem nav redzams. Izslēdz un saglabā, lai publicētu."
                  : product.published_at
                    ? "Izslēgts: pēc saglabāšanas produkts redzams veikalā. Pirmās publicēšanas datums nemainās."
                    : "Izslēgts: pēc saglabāšanas produkts tiks publicēts un parādīsies kā jaunākais ar zīmi \"Jaunums\"."}
              </p>
            </div>
          </div>

          {/* Bilingual name fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <div className="flex items-center justify-between gap-2">
                <Label className="font-body text-sm">{t("admin.productNameLv", "Nosaukums (LV)")}</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => handleAutoTranslate("name", "en-lv")}
                  disabled={translating === "name"}
                  title="EN → LV"
                >
                  {translating === "name" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Languages className="w-3 h-3 mr-1" />}
                  EN → LV
                </Button>
              </div>
              <Input
                value={product.name_lv || ""}
                onChange={(e) => {
                  const nameLv = e.target.value;
                  onProductChange({
                    ...product,
                    name_lv: nameLv,
                    name: nameLv,
                    slug: product.id ? product.slug : generateSlug(nameLv),
                  });
                }}
                placeholder={t("admin.productNameLv", "Nosaukums (LV)")}
                className="mt-1"
              />
            </div>
            <div>
              <div className="flex items-center justify-between gap-2">
                <Label className="font-body text-sm">{t("admin.productNameEn", "Name (EN)")}</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => handleAutoTranslate("name", "lv-en")}
                  disabled={translating === "name"}
                  title="LV → EN"
                >
                  {translating === "name" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Languages className="w-3 h-3 mr-1" />}
                  LV → EN
                </Button>
              </div>
              <Input
                value={product.name_en || ""}
                onChange={(e) => onProductChange({ ...product, name_en: e.target.value })}
                placeholder={t("admin.productNameEn", "Name (EN)")}
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <Label className="font-body text-sm">{t("admin.slug")}</Label>
              <Input value={product.slug} onChange={(e) => onProductChange({ ...product, slug: e.target.value })} placeholder="produkta-slug" className="mt-1" />
            </div>
            <div>
              <Label className="font-body text-sm">{t("admin.price")}</Label>
              <Input type="number" step="0.01" value={product.price} onChange={(e) => onProductChange({ ...product, price: parseFloat(e.target.value) || 0 })} className="mt-1" />
            </div>
            <div className="sm:col-span-2">
              <Label className="font-body text-sm">{t("admin.category")}</Label>
              <Select value={product.category} onValueChange={(slug) => onProductChange({ ...product, category: slug })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((opt) => (
                    <SelectItem key={opt.slug} value={opt.slug}>
                      {opt.isChild ? `  └ ${opt.label}` : opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Bilingual descriptions in tabs */}
          <div>
            <Label className="font-body text-sm mb-2 block">{t("admin.description")}</Label>
            <Tabs defaultValue="lv">
              <TabsList className="mb-2">
                <TabsTrigger value="lv">LV</TabsTrigger>
                <TabsTrigger value="en">EN</TabsTrigger>
              </TabsList>
              <TabsContent value="lv">
                <div className="flex justify-end mb-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => handleAutoTranslate("description", "en-lv")}
                    disabled={translating === "description"}
                  >
                    {translating === "description" ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Languages className="w-3 h-3 mr-1" />}
                    EN → LV
                  </Button>
                </div>
                <RichTextEditor
                  value={product.description_lv || product.description || ""}
                  onChange={(html) =>
                    onProductChange({ ...product, description_lv: html, description: html })
                  }
                />
              </TabsContent>
              <TabsContent value="en">
                <div className="flex justify-end mb-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => handleAutoTranslate("description", "lv-en")}
                    disabled={translating === "description"}
                  >
                    {translating === "description" ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Languages className="w-3 h-3 mr-1" />}
                    LV → EN
                  </Button>
                </div>
                <RichTextEditor
                  value={product.description_en || ""}
                  onChange={(html) => onProductChange({ ...product, description_en: html })}
                />
              </TabsContent>
            </Tabs>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-2">
              <Switch checked={product.customizable} onCheckedChange={(v) => onProductChange({ ...product, customizable: v })} />
              <Label className="font-body text-sm">{t("admin.customizable")}</Label>
            </div>
            {product.customizable && (
              <div className="flex items-center gap-2">
                <Label className="font-body text-sm whitespace-nowrap">Zakeke ID:</Label>
                <Input
                  className="h-8 w-full sm:w-48 text-sm"
                  placeholder="e.g. model-code-123"
                  value={product.zakeke_model_code}
                  onChange={(e) => onProductChange({ ...product, zakeke_model_code: e.target.value })}
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch checked={product.in_stock} onCheckedChange={(v) => onProductChange({ ...product, in_stock: v })} />
              <Label className="font-body text-sm">{t("admin.inStock")}</Label>
            </div>
          </div>

          <div>
            <Label className="font-body text-sm">{t("admin.mainImage")}</Label>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              {product.image_url && <img src={product.image_url} alt="Main" className="w-20 h-20 object-cover rounded border border-border" />}
              <label className="cursor-pointer">
                <div className="flex items-center gap-2 px-3 py-2 border border-border rounded-md hover:bg-muted text-sm font-body">
                  <Upload className="w-4 h-4" />
                  {uploadingImage === "main" ? t("admin.uploading") : t("admin.upload")}
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "main")} disabled={uploadingImage === "main"} />
              </label>
              {product.image_url && <Input value={product.image_url} onChange={(e) => onProductChange({ ...product, image_url: e.target.value })} placeholder={t("admin.orEnterUrl")} className="flex-1 min-w-0" />}
            </div>
          </div>

          <div>
            <Label className="font-body text-sm">Mockup bilde (rāda kā pirmo kartiņā)</Label>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              {product.mockup_image_url && <img src={product.mockup_image_url} alt="Mockup" className="w-20 h-20 object-cover rounded border border-border" />}
              <label className="cursor-pointer">
                <div className="flex items-center gap-2 px-3 py-2 border border-border rounded-md hover:bg-muted text-sm font-body">
                  <Upload className="w-4 h-4" />
                  {uploadingImage === "mockup" ? t("admin.uploading") : t("admin.upload")}
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "mockup")} disabled={uploadingImage === "mockup"} />
              </label>
              {product.mockup_image_url && (
                <>
                  <Input value={product.mockup_image_url} onChange={(e) => onProductChange({ ...product, mockup_image_url: e.target.value })} placeholder={t("admin.orEnterUrl")} className="flex-1 min-w-0" />
                  <Button variant="ghost" size="sm" onClick={() => onProductChange({ ...product, mockup_image_url: "" })}>
                    <X className="w-3 h-3 mr-1" /> Noņemt
                  </Button>
                </>
              )}
            </div>
          </div>

          <div>
            <Label className="font-body text-sm">Lifestyle galerija — stock / katalogs</Label>
            <div className="mt-2 mb-2">
              <ImageStrip label="Galerija" images={product.gallery_images ?? []} upload={uploadFiles} onChange={(gallery_images) => onProductChange({ ...product, gallery_images })} />
            </div>
          </div>

          <div className="rounded-lg border border-cta-red/30 bg-cta-red/[0.03] p-3">
            <Label className="font-body text-sm flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-cta-red" />
              Mūsu darbi (klientu nodrukāti pasūtījumi)
            </Label>
            <div className="mt-2 mb-1">
              <ImageStrip label="Mūsu darbs" images={product.showcase_images ?? []} upload={uploadFiles} onChange={(showcase_images) => onProductChange({ ...product, showcase_images })} />
            </div>
          </div>

          <div>
            <Label className="font-body text-sm">Tēmas</Label>
            <p className="text-xs text-muted-foreground font-body mb-2">Var izvēlēties vairākas. Tēmas pārvaldi sadaļā "Kategorijas".</p>
            {themes.length === 0 ? (
              <p className="text-xs text-muted-foreground font-body">Vēl nav nevienas tēmas.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {themes.map((th) => {
                  const active = (product.theme_ids ?? []).includes(th.id);
                  return (
                    <button key={th.id} type="button" aria-pressed={active} onClick={() => toggleTheme(th.id)}
                      className={`px-3 py-1 text-xs font-body rounded-full border transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/40"} ${th.is_active ? "" : "opacity-60"}`}>
                      {th.name_lv}{!th.is_active && " (slēpta)"}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <Label className="font-body text-sm">{t("admin.sizes")}</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {COMMON_SIZES.map((size) => (
                <button key={size} onClick={() => toggleSize(size)} className={`px-3 py-1 text-xs font-body rounded-md border transition-colors ${product.sizes.includes(size) ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/40"}`}>{size}</button>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <Input value={newSize} onChange={(e) => setNewSize(e.target.value)} placeholder={t("admin.otherSize")} className="w-32" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomSize())} />
              <Button variant="outline" size="sm" onClick={addCustomSize}>{t("admin.add")}</Button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <Label className="font-body text-sm flex items-center gap-2"><Palette className="w-4 h-4" /> {t("admin.colorVariants")}</Label>
              <div className="flex gap-2">
                <Sheet open={colorPickerOpen} onOpenChange={setColorPickerOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" type="button">
                      <Palette className="w-3 h-3 mr-1" /> {t("admin.pickExistingColor", "Izvēlēties esošu")}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[80vh] flex flex-col p-0 rounded-t-2xl">
                    <SheetHeader className="px-4 pt-4 pb-3 border-b border-border">
                      <SheetTitle className="font-display text-base text-left">
                        {t("admin.pickExistingColor", "Izvēlēties esošu krāsu")}
                      </SheetTitle>
                    </SheetHeader>
                    <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3">
                      {existingColors.length === 0 ? (
                        <p className="text-sm text-muted-foreground p-2 text-center">
                          {t("admin.noExistingColors", "Nav pieejamu krāsu")}
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 gap-1">
                          {existingColors.map((c) => {
                            const used = product.color_variants.some(
                              (v) => v.name.trim().toLowerCase() === c.name.trim().toLowerCase()
                            );
                            return (
                              <button
                                key={c.name}
                                type="button"
                                disabled={used}
                                onClick={() => { addExistingColor(c); setColorPickerOpen(false); }}
                                className={`flex items-center gap-3 px-3 py-3 rounded-lg text-left text-sm font-body transition-colors border border-border/50 ${used ? "opacity-40 cursor-not-allowed" : "hover:bg-muted active:bg-muted"}`}
                              >
                                <span
                                  className="w-7 h-7 rounded-full border border-border flex-shrink-0"
                                  style={{ backgroundColor: c.hex }}
                                />
                                <span className="flex-1 truncate">{c.name}</span>
                                {used && (
                                  <span className="text-[10px] text-muted-foreground uppercase">
                                    {t("admin.alreadyAdded", "pievienots")}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </SheetContent>
                </Sheet>
                <Button variant="outline" size="sm" onClick={addColorVariant}><Plus className="w-3 h-3 mr-1" /> {t("admin.addColor")}</Button>
              </div>
            </div>
            <div className="space-y-4">
              {product.color_variants.map((variant, ci) => (
                <Card key={ci} className="p-3 sm:p-4 border border-border">
                  <div className="mb-4">
                    <ImageStrip label={`${variant.name || "Krāsa"} bilde`} thumbClass="w-16 h-16" images={variant.images} upload={uploadFiles}
                      onChange={(images) => onProductChange({ ...product, color_variants: product.color_variants.map((v, idx) => (idx === ci ? { ...v, images } : v)) })} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <input type="color" value={variant.hex} onChange={(e) => updateColorVariant(ci, "hex", e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
                    <Input value={variant.name} onChange={(e) => updateColorVariant(ci, "name", e.target.value)} placeholder={t("admin.colorName")} className="flex-1 min-w-0" />
                    <Input value={variant.hex} onChange={(e) => updateColorVariant(ci, "hex", e.target.value)} placeholder="#000000" className="w-24 sm:w-28" />
                    <Button variant="ghost" size="icon" onClick={() => removeColorVariant(ci)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                  {product.sizes.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/60">
                      <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                        <Label className="font-body text-xs text-muted-foreground">
                          {t("admin.availableSizesForColor", "Pieejamie izmēri šai krāsai")}
                        </Label>
                        {variant.sizes && variant.sizes.length > 0 && (
                          <button type="button" onClick={() => resetVariantSizes(ci)} className="text-[11px] font-body text-muted-foreground underline hover:text-foreground">
                            {t("admin.allSizes", "Visi izmēri")}
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {variantSizeOptions(variant).map((size) => {
                          const active = variant.sizes && variant.sizes.length > 0
                            ? variant.sizes.includes(size)
                            : product.sizes.includes(size);
                          return (
                            <button
                              key={size}
                              type="button"
                              onClick={() => toggleVariantSize(ci, size)}
                              className={`px-3 py-1 text-xs font-body rounded-md border transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground line-through hover:border-primary/40"}`}
                            >
                              {size}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Input
                          value={variantSizeInput[ci] ?? ""}
                          onChange={(e) => setVariantSizeInput({ ...variantSizeInput, [ci]: e.target.value })}
                          placeholder={t("admin.otherSize")}
                          className="w-32 h-8 text-xs"
                          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addVariantCustomSize(ci))}
                        />
                        <Button variant="outline" size="sm" type="button" onClick={() => addVariantCustomSize(ci)}>{t("admin.add")}</Button>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>

        </div>
        <DialogFooter className="shrink-0 px-4 sm:px-6 py-4 border-t border-border gap-2 sm:gap-3">
          {product.id && (
            <div className="flex gap-2 w-full sm:w-auto sm:mr-auto">
              <Button variant="outline" asChild className="flex-1 sm:flex-none">
                <a href={`/produkti/${product.slug}?preview=1`} target="_blank" rel="noopener noreferrer"><Eye className="w-4 h-4 mr-2" /> Priekšskatīt</a>
              </Button>
              {onDuplicate && (
                <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => onDuplicate(product.id!)}><Copy className="w-4 h-4 mr-2" /> Dublēt</Button>
              )}
            </div>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">{t("admin.cancel")}</Button>
          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto bg-primary text-primary-foreground">
            <Save className="w-4 h-4 mr-2" />
            {saving ? t("admin.saving") : product.is_draft ? "Saglabāt melnrakstu" : t("admin.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
