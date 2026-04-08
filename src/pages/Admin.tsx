import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Save, ArrowLeft, Upload, X, Pencil, ImagePlus, Palette } from "lucide-react";
import logo from "@/assets/logo.svg";

interface ColorVariant {
  name: string;
  hex: string;
  images: string[];
}

interface ProductForm {
  id?: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  category: string;
  sizes: string[];
  customizable: boolean;
  color_variants: ColorVariant[];
  image_url: string;
  in_stock: boolean;
}

const EMPTY_PRODUCT: ProductForm = {
  name: "",
  slug: "",
  description: "",
  price: 0,
  category: "t-shirts",
  sizes: [],
  customizable: false,
  color_variants: [],
  image_url: "",
  in_stock: true,
};

const CATEGORIES = [
  { value: "t-shirts", label: "T-krekli" },
  { value: "hoodies", label: "Hūdiji" },
  { value: "mugs", label: "Krūzes" },
  { value: "bags", label: "Somas" },
  { value: "kids", label: "Bērniem" },
  { value: "latvia", label: "Latvija kolekcija" },
  { value: "accessories", label: "Aksesuāri" },
];

const COMMON_SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];

type DBProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  category: string;
  sizes: string[] | null;
  colors: string[] | null;
  customizable: boolean;
  color_variants: ColorVariant[];
  image_url: string | null;
  in_stock: boolean;
  created_at: string;
  updated_at: string;
};

const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const [products, setProducts] = useState<DBProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [editingProduct, setEditingProduct] = useState<ProductForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newSize, setNewSize] = useState("");
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);

  // Check admin role
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    const checkRole = async () => {
      const { data } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      if (!data) {
        toast.error("Nav piekļuves tiesību");
        navigate("/");
        return;
      }
      setIsAdmin(true);
      setChecking(false);
    };
    checkRole();
  }, [user, authLoading, navigate]);

  // Load products
  useEffect(() => {
    if (!isAdmin) return;
    loadProducts();
  }, [isAdmin]);

  const loadProducts = async () => {
    setLoadingProducts(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Neizdevās ielādēt produktus");
    } else {
      setProducts((data as unknown as DBProduct[]) || []);
    }
    setLoadingProducts(false);
  };

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const openCreateDialog = () => {
    setEditingProduct({ ...EMPTY_PRODUCT });
    setDialogOpen(true);
  };

  const openEditDialog = (product: DBProduct) => {
    setEditingProduct({
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description || "",
      price: product.price,
      category: product.category,
      sizes: product.sizes || [],
      customizable: product.customizable,
      color_variants: (product.color_variants as ColorVariant[]) || [],
      image_url: product.image_url || "",
      in_stock: product.in_stock,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingProduct) return;
    if (!editingProduct.name || !editingProduct.slug) {
      toast.error("Nosaukums un slug ir obligāti");
      return;
    }
    setSaving(true);
    const payload = {
      name: editingProduct.name,
      slug: editingProduct.slug,
      description: editingProduct.description || null,
      price: editingProduct.price,
      category: editingProduct.category,
      sizes: editingProduct.sizes,
      colors: editingProduct.color_variants.map((c) => c.name),
      customizable: editingProduct.customizable,
      color_variants: JSON.parse(JSON.stringify(editingProduct.color_variants)),
      image_url: editingProduct.image_url || null,
      in_stock: editingProduct.in_stock,
    };

    if (editingProduct.id) {
      const { error } = await supabase
        .from("products")
        .update(payload)
        .eq("id", editingProduct.id);
      if (error) toast.error("Neizdevās saglabāt: " + error.message);
      else toast.success("Produkts saglabāts!");
    } else {
      const { error } = await supabase.from("products").insert(payload);
      if (error) toast.error("Neizdevās izveidot: " + error.message);
      else toast.success("Produkts izveidots!");
    }
    setSaving(false);
    setDialogOpen(false);
    setEditingProduct(null);
    loadProducts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Vai tiešām dzēst šo produktu?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast.error("Neizdevās dzēst: " + error.message);
    else {
      toast.success("Produkts dzēsts");
      loadProducts();
    }
  };

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: "main" | { colorIndex: number }
  ) => {
    const file = e.target.files?.[0];
    if (!file || !editingProduct) return;
    const key = typeof target === "string" ? "main" : `color-${target.colorIndex}`;
    setUploadingImage(key);

    const ext = file.name.split(".").pop();
    const path = `${editingProduct.slug || "temp"}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("product-images")
      .upload(path, file, { upsert: true });

    if (error) {
      toast.error("Neizdevās augšupielādēt bildi");
      setUploadingImage(null);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("product-images")
      .getPublicUrl(path);

    const url = urlData.publicUrl;

    if (target === "main") {
      setEditingProduct({ ...editingProduct, image_url: url });
    } else {
      const variants = [...editingProduct.color_variants];
      variants[target.colorIndex].images.push(url);
      setEditingProduct({ ...editingProduct, color_variants: variants });
    }
    setUploadingImage(null);
  };

  const addColorVariant = () => {
    if (!editingProduct) return;
    setEditingProduct({
      ...editingProduct,
      color_variants: [
        ...editingProduct.color_variants,
        { name: "", hex: "#000000", images: [] },
      ],
    });
  };

  const removeColorVariant = (index: number) => {
    if (!editingProduct) return;
    const variants = editingProduct.color_variants.filter((_, i) => i !== index);
    setEditingProduct({ ...editingProduct, color_variants: variants });
  };

  const updateColorVariant = (index: number, field: keyof ColorVariant, value: string | string[]) => {
    if (!editingProduct) return;
    const variants = [...editingProduct.color_variants];
    (variants[index] as any)[field] = value;
    setEditingProduct({ ...editingProduct, color_variants: variants });
  };

  const removeColorImage = (colorIndex: number, imageIndex: number) => {
    if (!editingProduct) return;
    const variants = [...editingProduct.color_variants];
    variants[colorIndex].images = variants[colorIndex].images.filter((_, i) => i !== imageIndex);
    setEditingProduct({ ...editingProduct, color_variants: variants });
  };

  const toggleSize = (size: string) => {
    if (!editingProduct) return;
    const sizes = editingProduct.sizes.includes(size)
      ? editingProduct.sizes.filter((s) => s !== size)
      : [...editingProduct.sizes, size];
    setEditingProduct({ ...editingProduct, sizes });
  };

  const addCustomSize = () => {
    if (!editingProduct || !newSize.trim()) return;
    if (!editingProduct.sizes.includes(newSize.trim())) {
      setEditingProduct({
        ...editingProduct,
        sizes: [...editingProduct.sizes, newSize.trim()],
      });
    }
    setNewSize("");
  };

  if (authLoading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground font-body">Ielādē...</p>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <img src={logo} alt="T-Bode" className="h-8" />
            <span className="font-display text-lg tracking-wide">DARBINIEKA PANELIS</span>
          </div>
          <Button onClick={openCreateDialog} style={{ background: "var(--gradient-brand)" }}>
            <Plus className="w-4 h-4 mr-2" />
            Jauns produkts
          </Button>
        </div>
      </header>

      {/* Product list */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {loadingProducts ? (
          <p className="text-muted-foreground text-center py-12 font-body">Ielādē produktus...</p>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground font-body mb-4">Nav neviena produkta</p>
            <Button onClick={openCreateDialog} variant="outline">
              <Plus className="w-4 h-4 mr-2" /> Izveidot pirmo produktu
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((p) => (
              <Card key={p.id} className="overflow-hidden">
                <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <ImagePlus className="w-10 h-10 text-muted-foreground" />
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-body font-semibold text-sm">{p.name}</h3>
                      <p className="text-xs text-muted-foreground font-body">
                        {p.price.toFixed(2)} € · {p.category}
                        {p.customizable && " · 🎨 Personalizējams"}
                      </p>
                      <div className="flex gap-1 mt-2">
                        {((p.color_variants as ColorVariant[]) || []).slice(0, 8).map((c, i) => (
                          <div
                            key={i}
                            className="w-4 h-4 rounded-full border border-border"
                            style={{ backgroundColor: c.hex }}
                            title={c.name}
                          />
                        ))}
                        {((p.color_variants as ColorVariant[]) || []).length > 8 && (
                          <span className="text-xs text-muted-foreground">
                            +{(p.color_variants as ColorVariant[]).length - 8}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEditDialog(p)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(p.id)} className="text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {editingProduct?.id ? "Rediģēt produktu" : "Jauns produkts"}
            </DialogTitle>
          </DialogHeader>

          {editingProduct && (
            <div className="space-y-6">
              {/* Basic info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="font-body text-sm">Nosaukums</Label>
                  <Input
                    value={editingProduct.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setEditingProduct({
                        ...editingProduct,
                        name,
                        slug: editingProduct.id ? editingProduct.slug : generateSlug(name),
                      });
                    }}
                    placeholder="Produkta nosaukums"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="font-body text-sm">Slug (URL)</Label>
                  <Input
                    value={editingProduct.slug}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, slug: e.target.value })
                    }
                    placeholder="produkta-slug"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="font-body text-sm">Cena (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingProduct.price}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) || 0 })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="font-body text-sm">Kategorija</Label>
                  <Select
                    value={editingProduct.category}
                    onValueChange={(v) => setEditingProduct({ ...editingProduct, category: v })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Description */}
              <div>
                <Label className="font-body text-sm">Apraksts</Label>
                <Textarea
                  value={editingProduct.description}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, description: e.target.value })
                  }
                  placeholder="Produkta apraksts..."
                  className="mt-1"
                  rows={3}
                />
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editingProduct.customizable}
                    onCheckedChange={(v) =>
                      setEditingProduct({ ...editingProduct, customizable: v })
                    }
                  />
                  <Label className="font-body text-sm">Personalizējams (Zakeke)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editingProduct.in_stock}
                    onCheckedChange={(v) =>
                      setEditingProduct({ ...editingProduct, in_stock: v })
                    }
                  />
                  <Label className="font-body text-sm">Noliktavā</Label>
                </div>
              </div>

              {/* Main image */}
              <div>
                <Label className="font-body text-sm">Galvenā bilde</Label>
                <div className="mt-1 flex items-center gap-3">
                  {editingProduct.image_url && (
                    <img
                      src={editingProduct.image_url}
                      alt="Main"
                      className="w-20 h-20 object-cover rounded border border-border"
                    />
                  )}
                  <label className="cursor-pointer">
                    <div className="flex items-center gap-2 px-3 py-2 border border-border rounded-md hover:bg-muted text-sm font-body">
                      <Upload className="w-4 h-4" />
                      {uploadingImage === "main" ? "Augšupielādē..." : "Augšupielādēt"}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, "main")}
                      disabled={uploadingImage === "main"}
                    />
                  </label>
                  {editingProduct.image_url && (
                    <Input
                      value={editingProduct.image_url}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, image_url: e.target.value })
                      }
                      placeholder="Vai ievadi URL"
                      className="flex-1"
                    />
                  )}
                </div>
              </div>

              {/* Sizes */}
              <div>
                <Label className="font-body text-sm">Izmēri</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {COMMON_SIZES.map((size) => (
                    <button
                      key={size}
                      onClick={() => toggleSize(size)}
                      className={`px-3 py-1 text-xs font-body rounded-md border transition-colors ${
                        editingProduct.sizes.includes(size)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={newSize}
                    onChange={(e) => setNewSize(e.target.value)}
                    placeholder="Cits izmērs..."
                    className="w-32"
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomSize())}
                  />
                  <Button variant="outline" size="sm" onClick={addCustomSize}>
                    Pievienot
                  </Button>
                </div>
              </div>

              {/* Color variants */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="font-body text-sm flex items-center gap-2">
                    <Palette className="w-4 h-4" /> Krāsu variācijas
                  </Label>
                  <Button variant="outline" size="sm" onClick={addColorVariant}>
                    <Plus className="w-3 h-3 mr-1" /> Pievienot krāsu
                  </Button>
                </div>

                <div className="space-y-4">
                  {editingProduct.color_variants.map((variant, ci) => (
                    <Card key={ci} className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <input
                          type="color"
                          value={variant.hex}
                          onChange={(e) => updateColorVariant(ci, "hex", e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                        />
                        <Input
                          value={variant.name}
                          onChange={(e) => updateColorVariant(ci, "name", e.target.value)}
                          placeholder="Krāsas nosaukums"
                          className="flex-1"
                        />
                        <Input
                          value={variant.hex}
                          onChange={(e) => updateColorVariant(ci, "hex", e.target.value)}
                          placeholder="#000000"
                          className="w-28"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeColorVariant(ci)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Color images */}
                      <div className="flex flex-wrap gap-2">
                        {variant.images.map((img, ii) => (
                          <div key={ii} className="relative group">
                            <img
                              src={img}
                              alt=""
                              className="w-16 h-16 object-cover rounded border border-border"
                            />
                            <button
                              onClick={() => removeColorImage(ci, ii)}
                              className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        <label className="cursor-pointer w-16 h-16 border border-dashed border-border rounded flex items-center justify-center hover:border-primary/40 transition-colors">
                          {uploadingImage === `color-${ci}` ? (
                            <span className="text-xs text-muted-foreground">...</span>
                          ) : (
                            <ImagePlus className="w-5 h-5 text-muted-foreground" />
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleImageUpload(e, { colorIndex: ci })}
                            disabled={uploadingImage === `color-${ci}`}
                          />
                        </label>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Atcelt
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  style={{ background: "var(--gradient-brand)" }}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Saglabā..." : "Saglabāt"}
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
