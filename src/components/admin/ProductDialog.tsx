import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Save, Upload, X, ImagePlus, Palette } from "lucide-react";
import { useTranslation } from "react-i18next";

export interface ColorVariant { name: string; hex: string; images: string[]; }
export interface ProductForm { id?: string; name: string; slug: string; description: string; price: number; category: string; sizes: string[]; customizable: boolean; color_variants: ColorVariant[]; image_url: string; in_stock: boolean; }

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

export const EMPTY_PRODUCT: ProductForm = { name: "", slug: "", description: "", price: 0, category: "t-shirts", sizes: [], customizable: false, color_variants: [], image_url: "", in_stock: true };

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductForm | null;
  onProductChange: (product: ProductForm) => void;
  onSaved: () => void;
}

export const ProductDialog = ({ open, onOpenChange, product, onProductChange, onSaved }: ProductDialogProps) => {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [newSize, setNewSize] = useState("");
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);

  if (!product) return null;

  const generateSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const handleSave = async () => {
    if (!product.name || !product.slug) { toast.error(t("admin.nameSlugRequired")); return; }
    setSaving(true);
    const payload = { name: product.name, slug: product.slug, description: product.description || null, price: product.price, category: product.category, sizes: product.sizes, colors: product.color_variants.map((c) => c.name), customizable: product.customizable, color_variants: JSON.parse(JSON.stringify(product.color_variants)), image_url: product.image_url || null, in_stock: product.in_stock };
    if (product.id) {
      const { error } = await supabase.from("products").update(payload).eq("id", product.id);
      if (error) toast.error(t("admin.saveError") + ": " + error.message);
      else toast.success(t("admin.productSaved"));
    } else {
      const { error } = await supabase.from("products").insert(payload);
      if (error) toast.error(t("admin.createError") + ": " + error.message);
      else toast.success(t("admin.productCreated"));
    }
    setSaving(false); onOpenChange(false); onSaved();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: "main" | { colorIndex: number }) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const key = typeof target === "string" ? "main" : `color-${target.colorIndex}`;
    setUploadingImage(key);
    const ext = file.name.split(".").pop();
    const path = `${product.slug || "temp"}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: true });
    if (error) { toast.error(t("admin.uploadError")); setUploadingImage(null); return; }
    const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
    const url = urlData.publicUrl;
    if (target === "main") { onProductChange({ ...product, image_url: url }); }
    else { const variants = [...product.color_variants]; variants[target.colorIndex].images.push(url); onProductChange({ ...product, color_variants: variants }); }
    setUploadingImage(null);
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

  const addColorVariant = () => onProductChange({ ...product, color_variants: [...product.color_variants, { name: "", hex: "#000000", images: [] }] });
  const removeColorVariant = (i: number) => onProductChange({ ...product, color_variants: product.color_variants.filter((_, idx) => idx !== i) });
  const updateColorVariant = (i: number, field: keyof ColorVariant, value: string | string[]) => { const v = [...product.color_variants]; (v[i] as any)[field] = value; onProductChange({ ...product, color_variants: v }); };
  const removeColorImage = (ci: number, ii: number) => { const v = [...product.color_variants]; v[ci].images = v[ci].images.filter((_, idx) => idx !== ii); onProductChange({ ...product, color_variants: v }); };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{product.id ? t("admin.editProduct") : t("admin.newProduct")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="font-body text-sm">{t("admin.productName")}</Label>
              <Input value={product.name} onChange={(e) => { const name = e.target.value; onProductChange({ ...product, name, slug: product.id ? product.slug : generateSlug(name) }); }} placeholder={t("admin.productName")} className="mt-1" />
            </div>
            <div>
              <Label className="font-body text-sm">{t("admin.slug")}</Label>
              <Input value={product.slug} onChange={(e) => onProductChange({ ...product, slug: e.target.value })} placeholder="produkta-slug" className="mt-1" />
            </div>
            <div>
              <Label className="font-body text-sm">{t("admin.price")}</Label>
              <Input type="number" step="0.01" value={product.price} onChange={(e) => onProductChange({ ...product, price: parseFloat(e.target.value) || 0 })} className="mt-1" />
            </div>
            <div>
              <Label className="font-body text-sm">{t("admin.category")}</Label>
              <Select value={product.category} onValueChange={(v) => onProductChange({ ...product, category: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => (<SelectItem key={c.value} value={c.value}>{t(c.labelKey)}</SelectItem>))}</SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="font-body text-sm">{t("admin.description")}</Label>
            <Textarea value={product.description} onChange={(e) => onProductChange({ ...product, description: e.target.value })} className="mt-1" rows={3} />
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch checked={product.customizable} onCheckedChange={(v) => onProductChange({ ...product, customizable: v })} />
              <Label className="font-body text-sm">{t("admin.customizable")}</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={product.in_stock} onCheckedChange={(v) => onProductChange({ ...product, in_stock: v })} />
              <Label className="font-body text-sm">{t("admin.inStock")}</Label>
            </div>
          </div>

          <div>
            <Label className="font-body text-sm">{t("admin.mainImage")}</Label>
            <div className="mt-1 flex items-center gap-3">
              {product.image_url && <img src={product.image_url} alt="Main" className="w-20 h-20 object-cover rounded border border-border" />}
              <label className="cursor-pointer">
                <div className="flex items-center gap-2 px-3 py-2 border border-border rounded-md hover:bg-muted text-sm font-body">
                  <Upload className="w-4 h-4" />
                  {uploadingImage === "main" ? t("admin.uploading") : t("admin.upload")}
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "main")} disabled={uploadingImage === "main"} />
              </label>
              {product.image_url && <Input value={product.image_url} onChange={(e) => onProductChange({ ...product, image_url: e.target.value })} placeholder={t("admin.orEnterUrl")} className="flex-1" />}
            </div>
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
            <div className="flex items-center justify-between mb-2">
              <Label className="font-body text-sm flex items-center gap-2"><Palette className="w-4 h-4" /> {t("admin.colorVariants")}</Label>
              <Button variant="outline" size="sm" onClick={addColorVariant}><Plus className="w-3 h-3 mr-1" /> {t("admin.addColor")}</Button>
            </div>
            <div className="space-y-4">
              {product.color_variants.map((variant, ci) => (
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
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t("admin.cancel")}</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground">
              <Save className="w-4 h-4 mr-2" />
              {saving ? t("admin.saving") : t("admin.save")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};