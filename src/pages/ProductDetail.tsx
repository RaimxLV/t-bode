import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ShoppingCart, Ruler, Palette, Paintbrush, ZoomIn } from "lucide-react";
import { ImageLightbox } from "@/components/ImageLightbox";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/context/CartContext";
import { useProductBySlug } from "@/hooks/useProducts";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { ZakekeDesigner } from "@/components/ZakekeDesigner";

const ProductDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: product, isLoading } = useProductBySlug(slug);
  const { t } = useTranslation();

  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [designerOpen, setDesignerOpen] = useState(false);
  const { addItem } = useCart();

  const colors = product?.color_variants ?? [];
  const sizes = product?.sizes ?? [];

  const galleryImages = useMemo(() => {
    if (!product) return [];
    const imgs: string[] = [];
    if (product.image_url) imgs.push(product.image_url);
    for (const cv of colors) {
      for (const img of cv.images) {
        if (!imgs.includes(img)) imgs.push(img);
      }
    }
    return imgs;
  }, [product, colors]);

  const displayImage = useMemo(() => {
    if (!product) return "";
    if (selectedColor) {
      const cv = colors.find((c) => c.name === selectedColor);
      if (cv?.images?.[0]) return cv.images[0];
    }
    return galleryImages[selectedImageIdx] || product.image_url || "";
  }, [product, selectedColor, selectedImageIdx, galleryImages, colors]);

  const selectedColorHex = useMemo(() => {
    if (!selectedColor) return "";
    return colors.find((c) => c.name === selectedColor)?.hex || "";
  }, [selectedColor, colors]);

  const handleAddToCart = () => {
    if (!product || !selectedSize || !selectedColor) return;
    addItem({
      productId: product.id, name: product.name, price: product.price,
      image: displayImage || product.image_url || "", size: selectedSize, color: selectedColor, quantity, slug: product.slug,
    });
    toast.success(t("productDetail.addedToCart", { name: product.name }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 pt-24 pb-16">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <Skeleton className="aspect-square rounded-lg" />
              <div className="space-y-4"><Skeleton className="h-8 w-3/4" /><Skeleton className="h-10 w-1/3" /><Skeleton className="h-24 w-full" /></div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl mb-4">{t("productDetail.notFound")}</h1>
            <Link to="/design" className="text-primary hover:underline">{t("productDetail.backLink")}</Link>
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
          <Link to="/design" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 font-body text-sm">
            <ArrowLeft className="w-4 h-4" />
            {t("productDetail.backToProducts")}
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
              <div
                className="aspect-square rounded-lg overflow-hidden bg-card border border-border mb-3 relative group cursor-zoom-in"
                onClick={() => setLightboxOpen(true)}
                role="button"
                aria-label={t("productDetail.zoomImage", "Palielināt attēlu")}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setLightboxOpen(true); } }}
              >
                <AnimatePresence mode="wait">
                  <motion.img key={displayImage} src={displayImage} alt={product.name} className="w-full h-full object-cover" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} />
                </AnimatePresence>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-80 transition-opacity drop-shadow-lg" />
                </div>
              </div>
              {galleryImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {galleryImages.map((img, idx) => (
                    <button key={idx} onClick={() => { setSelectedImageIdx(idx); setSelectedColor(""); }}
                      className={`w-16 h-16 flex-shrink-0 rounded-md overflow-hidden border-2 transition-all ${selectedImageIdx === idx && !selectedColor ? "border-primary" : "border-border hover:border-foreground/50"}`}>
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="flex flex-col">
              <span className="text-xs font-body font-medium uppercase tracking-wider text-muted-foreground mb-2">{product.category}</span>
              <h1 className="text-3xl md:text-4xl mb-4">{product.name}</h1>
              <p className="text-3xl font-bold font-body mb-6" style={{ color: "hsl(var(--primary))" }}>
                {product.price.toFixed(2).replace(".", ",")} €
              </p>
              {product.description && <p className="text-sm text-muted-foreground font-body mb-6 leading-relaxed">{product.description}</p>}

              {colors.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Palette className="w-4 h-4 text-muted-foreground" />
                    <span className="font-body font-semibold text-sm">{t("productDetail.color")} {selectedColor && `— ${selectedColor}`}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {colors.map((color) => (
                      <button key={color.name} onClick={() => { setSelectedColor(color.name); setSelectedImageIdx(0); }} title={color.name}
                        className={`w-9 h-9 rounded-full border-2 transition-all ${selectedColor === color.name ? "border-primary scale-110 ring-2 ring-primary/30" : "border-border hover:border-foreground"}`}
                        style={{ backgroundColor: color.hex }} />
                    ))}
                  </div>
                </div>
              )}

              {sizes.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Ruler className="w-4 h-4 text-muted-foreground" />
                    <span className="font-body font-semibold text-sm">{t("productDetail.size")}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sizes.map((size) => (
                      <button key={size} onClick={() => setSelectedSize(size)}
                        className={`px-3 py-1.5 rounded-md text-xs font-body font-medium border transition-all ${selectedSize === size ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"}`}>
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-8">
                <span className="font-body font-semibold text-sm mb-3 block">{t("productDetail.quantity")}</span>
                <div className="inline-flex items-center border border-border rounded-md">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-4 py-2 text-lg font-body hover:bg-secondary transition-colors">−</button>
                  <span className="px-6 py-2 font-body font-semibold border-x border-border">{quantity}</span>
                  <button onClick={() => setQuantity(quantity + 1)} className="px-4 py-2 text-lg font-body hover:bg-secondary transition-colors">+</button>
                </div>
              </div>

              {product.customizable && (
                <div className="mb-8 p-6 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5">
                  <div className="flex items-center gap-3 mb-3">
                    <Paintbrush className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-display">{t("productDetail.customizeDesign")}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground font-body mb-4">{t("productDetail.customizeDesc")}</p>
                  <Button
                    variant="outline"
                    className="border-primary/40 text-primary hover:bg-primary/10"
                    disabled={!selectedSize || !selectedColor}
                    onClick={() => setDesignerOpen(true)}
                  >
                    {t("productDetail.openDesigner")}
                  </Button>
                  {(!selectedSize || !selectedColor) && (
                    <p className="text-xs text-muted-foreground mt-2 font-body italic">{t("productDetail.selectSizeColor")}</p>
                  )}
                </div>
              )}

              <button
                className="w-full flex items-center justify-center gap-3 px-8 py-4 rounded-lg text-lg font-semibold font-body text-primary-foreground transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "var(--gradient-brand)" }}
                disabled={!selectedSize || !selectedColor}
                onClick={handleAddToCart}
              >
                <ShoppingCart className="w-5 h-5" />
                {t("productDetail.addToCart")} — {(product.price * quantity).toFixed(2).replace(".", ",")} €
              </button>
              {(!selectedSize || !selectedColor) && (
                <p className="text-xs text-muted-foreground text-center mt-2 font-body">{t("productDetail.selectSizeColor")}</p>
              )}
            </motion.div>
          </div>
        </div>
      </main>
      <ImageLightbox
        images={galleryImages}
        initialIndex={selectedImageIdx}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        alt={product.name}
      />
      <Footer />
      {designerOpen && product.customizable && (
        <ZakekeDesigner
          productId={product.id}
          zakekeModelCode={product.zakeke_model_code || product.slug}
          productName={product.name}
          productPrice={product.price}
          productSlug={product.slug}
          productImage={displayImage || product.image_url || ""}
          selectedColor={selectedColor}
          selectedColorHex={selectedColorHex}
          selectedSize={selectedSize}
          quantity={quantity}
          onClose={() => setDesignerOpen(false)}
        />
      )}
    </div>
  );
};

export default ProductDetail;
