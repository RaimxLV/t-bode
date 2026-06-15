import { useState, useMemo, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ShoppingCart, Ruler, Palette, Paintbrush, ZoomIn, Sparkles, Wand2, Percent } from "lucide-react";
import { ImageLightbox } from "@/components/ImageLightbox";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { LifestyleGallery } from "@/components/LifestyleGallery";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BulkSizeMatrixDialog } from "@/components/BulkSizeMatrixDialog";
import { Users, User as UserIcon } from "lucide-react";
import { PricingExplainer } from "@/components/PricingExplainer";
import { useCart } from "@/context/CartContext";
import { useProductBySlug, getProductName, getProductDescription } from "@/hooks/useProducts";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { ZakekeDesigner } from "@/components/ZakekeDesigner";
import { RelatedProducts } from "@/components/RelatedProducts";
import individualDesignModel from "@/assets/individual-design-model.png.asset.json";
import { WishlistButton } from "@/components/WishlistButton";
import { Seo } from "@/components/Seo";
import { buildZakekeVariantCodes, getZakekeProductCode } from "@/lib/zakeke";
import { prefetchZakeke } from "@/lib/zakeke-loader";

const ProductDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: product, isLoading } = useProductBySlug(slug);
  const { t, i18n } = useTranslation();
  const displayName = product ? getProductName(product, i18n.language) : "";
  const displayDescription = product ? getProductDescription(product, i18n.language) : "";

  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);

  const [quantity, setQuantity] = useState(1);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [designerOpen, setDesignerOpen] = useState(false);
  const [workflowChoiceOpen, setWorkflowChoiceOpen] = useState(false);
  const [designMode, setDesignMode] = useState<"individual" | "bulk">("individual");
  const [bulkMatrixOpen, setBulkMatrixOpen] = useState(false);
  const [pendingBulkDesign, setPendingBulkDesign] = useState<{
    designId: string | null;
    thumbnail: string;
    previews: string[];
    customizationPrice: number;
    visitorCode: string | null;
  } | null>(null);
  const { addItem } = useCart();

  const colors = product?.color_variants ?? [];
  const sizes = product?.sizes ?? [];
  const sizes_sorted = useMemo(() => {
    const order = ["XXS","XS","S","M","L","XL","XXL","XXXL","XXXXL","XXXXXL"];
    const idx = (s: string) => {
      const i = order.indexOf(s.toUpperCase());
      return i === -1 ? 999 : i;
    };
    return [...sizes].sort((a, b) => {
      const ai = idx(a), bi = idx(b);
      if (ai !== 999 || bi !== 999) return ai - bi;
      const na = parseInt(a), nb = parseInt(b);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    });
  }, [sizes]);

  // The "Standard bulk vs Individual" workflow choice only makes sense when
  // a product has multiple sizes (apparel). Mugs, bags, accessories etc. go
  // straight into the individual designer.
  const showWorkflowChoice = sizes.length > 1;

  // Master baseline size for bulk workflow — prefer M, otherwise the middle size.
  const masterSize = useMemo(() => {
    if (sizes.length === 0) return "";
    if (sizes.includes("M")) return "M";
    return sizes[Math.floor(sizes.length / 2)];
  }, [sizes]);

  // Set defaults when product loads
  useEffect(() => {
    if (!product) return;
    const productSizes = product.sizes ?? [];
    const productColors = product.color_variants ?? [];
    if (!selectedSize && productSizes.length > 0) {
      setSelectedSize(productSizes.includes("M") ? "M" : productSizes[0]);
    }
    if (!selectedColor && productColors.length > 0) {
      setSelectedColor(productColors[0].name);
    }
  }, [product]); // eslint-disable-line react-hooks/exhaustive-deps

  // Warm up the Zakeke script + token in the background as soon as we know
  // the product is customizable. Both have their own caches, so this is a no-op
  // on subsequent visits within the same tab.
  useEffect(() => {
    if (product?.customizable) {
      prefetchZakeke();
    }
  }, [product?.customizable]);

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

  const displayImages = useMemo(() => {
    if (!product) return [];
    if (selectedColor) {
      const colorImages = colors.find((c) => c.name === selectedColor)?.images ?? [];
      if (colorImages.length > 0) return colorImages;
    }
    return galleryImages;
  }, [product, selectedColor, colors, galleryImages]);

  const displayImage = useMemo(() => {
    if (!product) return "";
    return displayImages[selectedImageIdx] || displayImages[0] || product.image_url || "";
  }, [product, selectedImageIdx, displayImages]);

  const selectedColorHex = useMemo(() => {
    if (!selectedColor) return "";
    return colors.find((c) => c.name === selectedColor)?.hex || "";
  }, [selectedColor, colors]);

  const zakekeProductCode = useMemo(
    () => (product ? getZakekeProductCode(product) : ""),
    [product]
  );

  const zakekeVariantCodes = useMemo(
    () =>
      buildZakekeVariantCodes(zakekeProductCode, {
        color: selectedColor,
        size: selectedSize,
      }),
    [zakekeProductCode, selectedColor, selectedSize]
  );

  const handleAddToCart = () => {
    if (!product || !selectedSize || !selectedColor) return;
    addItem({
      productId: product.id, name: displayName, price: product.price,
      image: displayImage || product.image_url || "", size: selectedSize, color: selectedColor, quantity, slug: product.slug,
    });
    toast.success(t("productDetail.addedToCart", { name: displayName }));
  };

  const openDesigner = (mode: "individual" | "bulk") => {
    setDesignMode(mode);
    setWorkflowChoiceOpen(false);
    if (mode === "bulk" && masterSize) {
      setSelectedSize(masterSize);
    }
    setDesignerOpen(true);
  };

  const handleBulkDesignReady = (payload: {
    designId: string | null;
    thumbnail: string;
    previews: string[];
    customizationPrice: number;
    visitorCode: string | null;
  }) => {
    setPendingBulkDesign(payload);
    setBulkMatrixOpen(true);
  };

  const handleBulkConfirm = (selectedSizes: Record<string, number>, totalQuantity: number) => {
    if (!product || !pendingBulkDesign) return;
    const breakdown = Object.entries(selectedSizes)
      .map(([s, n]) => `${n}×${s}`)
      .join(", ");
    const unitPrice = product.price + (pendingBulkDesign.customizationPrice || 0);
    addItem({
      productId: product.id,
      name: displayName,
      price: unitPrice,
      basePrice: product.price,
      customizationPrice: pendingBulkDesign.customizationPrice || 0,
      image: pendingBulkDesign.thumbnail || displayImage || product.image_url || "",
      size: breakdown || "BULK",
      color: selectedColor,
      quantity: totalQuantity,
      slug: product.slug,
      designId: pendingBulkDesign.designId || undefined,
      designThumbnail: pendingBulkDesign.thumbnail,
      designPreviews: pendingBulkDesign.previews,
      zakekeVisitorCode: pendingBulkDesign.visitorCode || undefined,
      selectedSizes,
      isBulk: true,
    });
    toast.success(t("productDetail.addedToCart", { name: displayName }));
    setBulkMatrixOpen(false);
    setPendingBulkDesign(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Safe branded title while product data is loading to prevent
            crawlers / browsers seeing an empty <title> flash. */}
        <Seo
          title={i18n.language === "en" ? "Loading product…" : "Ielādē produktu…"}
          noindex
        />
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
        <Seo
          title={i18n.language === "en" ? "Product not found" : "Produkts nav atrasts"}
          noindex
        />
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
      <Seo
        title={displayName}
        titleKeyword={i18n.language === "en" ? "Custom printing in Riga" : "T-kreklu apdruka Rīgā"}
        description={(() => {
          const clean = (displayDescription || "").replace(/<[^>]+>/g, "").trim();
          if (clean.length >= 80) return clean.slice(0, 155);
          const suffix = i18n.language === "en"
            ? ` — customize on-site in Riga. T-Bode DTF printing on t-shirts, hoodies, mugs and bags.`
            : ` — personalizē ar savu dizainu. T-Bode DTF apdruka Rīgā uz krekliem, hūdijiem, krūzēm un somām.`;
          return (`${displayName}${suffix}`).slice(0, 158);
        })()}
        image={displayImage || product.image_url || undefined}
        type="product"
        breadcrumbs={[
          { name: "T-Bode", url: "https://www.t-bode.lv/" },
          { name: i18n.language === "en" ? "Collection" : "Kolekcija", url: "https://www.t-bode.lv/collection" },
          { name: displayName, url: typeof window !== "undefined" ? window.location.href : `https://www.t-bode.lv/produkti/${product.slug}` },
        ]}
        jsonLd={{
          "@context": "https://schema.org/",
          "@type": "Product",
          name: displayName,
          description: (displayDescription || "").replace(/<[^>]+>/g, "").slice(0, 5000),
          image: galleryImages.length ? galleryImages : [product.image_url].filter(Boolean),
          sku: product.id,
          mpn: product.id,
          category: product.category,
          brand: { "@type": "Brand", name: "T-Bode" },
          offers: {
            "@type": "Offer",
            url: typeof window !== "undefined" ? window.location.href : undefined,
            priceCurrency: "EUR",
            price: Number(product.price).toFixed(2),
            availability: product.in_stock
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
            itemCondition: "https://schema.org/NewCondition",
            seller: { "@type": "Organization", "name": "T-Bode" },
          },
        }}
      />
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
                  <motion.img
                    key={displayImage}
                    src={displayImage}
                    alt={displayName}
                    className="w-full h-full object-contain bg-white"
                    decoding="async"
                    fetchPriority="high"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  />
                </AnimatePresence>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-80 transition-opacity drop-shadow-lg" />
                </div>
                {product.customizable && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!selectedSize || !selectedColor) return;
                      if (showWorkflowChoice) setWorkflowChoiceOpen(true);
                      else openDesigner("individual");
                    }}
                    disabled={!selectedSize || !selectedColor}
                    className="absolute bottom-3 right-3 w-11 h-11 rounded-full bg-primary/60 backdrop-blur-sm text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-all hover:scale-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed z-10 shadow-lg"
                    title={t("productDetail.customizeDesign", "Personalizēt dizainu")}
                  >
                    <Paintbrush className="w-5 h-5" />
                  </button>
                )}
              </div>
              {displayImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {displayImages.map((img, idx) => (
                    <button key={idx} onClick={() => setSelectedImageIdx(idx)}
                      className={`w-16 h-16 flex-shrink-0 rounded-md overflow-hidden border-2 transition-all ${selectedImageIdx === idx ? "border-primary" : "border-border hover:border-foreground/50"}`}>
                      <img
                        src={img}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-contain bg-white"
                      />
                    </button>
                  ))}
                </div>
              )}
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="flex flex-col">
              <span className="text-xs font-body font-medium uppercase tracking-wider text-muted-foreground mb-2">{product.category}</span>
              <div className="flex items-start justify-between gap-4 mb-4">
                <h1 className="text-3xl md:text-4xl flex-1">{displayName}</h1>
                <WishlistButton productId={product.id} size="lg" variant="icon" className="border border-border" />
              </div>
              <p className="text-3xl font-bold font-body mb-6" style={{ color: "hsl(var(--primary))" }}>
                {product.price.toFixed(2).replace(".", ",")} €
              </p>

              {/* Mobile: color, size, quantity before description */}
              <div className="flex flex-col lg:hidden">
                {colors.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
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
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Ruler className="w-4 h-4 text-muted-foreground" />
                      <span className="font-body font-semibold text-sm">{t("productDetail.size")}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {sizes_sorted.map((size) => (
                        <button key={size} onClick={() => setSelectedSize(size)}
                          className={`px-3 py-1.5 rounded-md text-xs font-body font-medium border transition-all ${selectedSize === size ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"}`}>
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mb-6">
                  <span className="font-body font-semibold text-sm mb-2 block">{t("productDetail.quantity")}</span>
                  <div className="inline-flex items-center border border-border rounded-md">
                    <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-4 py-2 text-lg font-body hover:bg-secondary transition-colors">−</button>
                    <span className="px-6 py-2 font-body font-semibold border-x border-border">{quantity}</span>
                    <button onClick={() => setQuantity(quantity + 1)} className="px-4 py-2 text-lg font-body hover:bg-secondary transition-colors">+</button>
                  </div>
                </div>
              </div>

              {product.description && (
                <div
                  className="text-sm text-muted-foreground font-body mb-6 leading-relaxed prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:text-foreground [&_em]:italic [&_u]:underline"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              )}

              {/* Desktop: color, size, quantity after description */}
              <div className="hidden lg:flex lg:flex-col">
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
                      {sizes_sorted.map((size) => (
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
              </div>

              {product.customizable && (
                <button
                  type="button"
                  disabled={!selectedSize || !selectedColor}
                  onClick={() => {
                    if (showWorkflowChoice) setWorkflowChoiceOpen(true);
                    else openDesigner("individual");
                  }}
                  onMouseEnter={prefetchZakeke}
                  onTouchStart={prefetchZakeke}
                  className="group relative mb-4 w-full overflow-hidden rounded-lg px-8 py-5 text-lg font-semibold font-body text-primary-foreground transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 animate-personalize-pulse"
                  style={{ background: "var(--gradient-brand)" }}
                  aria-label={t("productDetail.customizeDesign", "Personalizēt dizainu")}
                >
                  {/* Shimmer sweep */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 -inset-x-1 block animate-shimmer-slide"
                    style={{
                      background:
                        "linear-gradient(110deg, transparent 30%, hsl(0 0% 100% / 0.45) 50%, transparent 70%)",
                    }}
                  />
                  {/* Sparkle accents */}
                  <Sparkles
                    aria-hidden
                    className="absolute left-3 top-2 w-3 h-3 text-white/80 animate-sparkle-spin"
                  />
                  <Sparkles
                    aria-hidden
                    className="absolute right-4 bottom-2 w-3.5 h-3.5 text-white/70 animate-sparkle-spin"
                    style={{ animationDelay: "0.6s" }}
                  />
                  <span className="relative flex items-center justify-center gap-3">
                    <Wand2 className="w-5 h-5 transition-transform group-hover:-rotate-12 group-hover:scale-110" />
                    <span className="tracking-wide">
                      {t("productDetail.customizeDesign", "Personalizēt dizainu")}
                    </span>
                    <Sparkles className="w-4 h-4 transition-transform group-hover:rotate-12 group-hover:scale-110" />
                  </span>
                </button>
              )}

              <button
                className="w-full flex items-center justify-center gap-3 px-8 py-5 rounded-lg text-lg font-semibold font-body bg-black text-white border border-black transition-all hover:scale-[1.02] hover:bg-neutral-900 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
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

          {/* Lifestyle gallery — real-world photos of the product */}
          <LifestyleGallery
            images={product.gallery_images ?? []}
            productName={displayName}
          />

          {/* Related products */}
          <RelatedProducts category={product.category} excludeId={product.id} />
        </div>
      </main>
      <ImageLightbox
        images={displayImages}
        initialIndex={selectedImageIdx}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        alt={displayName}
      />
      <Footer />
      {designerOpen && product.customizable && (
        <ZakekeDesigner
          productId={product.id}
          zakekeModelCode={zakekeProductCode || product.slug}
          productName={displayName}
          productPrice={product.price}
          productSlug={product.slug}
          productImage={displayImage || product.image_url || ""}
          selectedColor={selectedColor}
          selectedColorHex={selectedColorHex}
          selectedSize={designMode === "bulk" ? masterSize || selectedSize : selectedSize}
          availableColors={colors.map((color) => color.name)}
          availableSizes={sizes}
          variantCodes={zakekeVariantCodes}
          quantity={designMode === "bulk" ? 1 : quantity}
          onClose={() => setDesignerOpen(false)}
          bulkMode={designMode === "bulk"}
          onBulkAddRequest={handleBulkDesignReady}
        />
      )}

      {/* Workflow choice — Bulk vs Individual */}
      <Dialog open={workflowChoiceOpen} onOpenChange={setWorkflowChoiceOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-background via-background to-cta-red/5">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl sm:text-3xl tracking-wide">
              ✨ {t("bulk.chooseWorkflowTitle", "Izvēlies dizaina plūsmu")}
            </DialogTitle>
            <DialogDescription className="font-body text-sm">
              Kā Tu vēlies veidot savu pasūtījumu? Izvēlies sev piemērotāko variantu.
            </DialogDescription>
          </DialogHeader>
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Card A — Individual designs (primary) */}
            <button
              onClick={() => openDesigner("individual")}
              className="group relative flex flex-col text-left p-5 rounded-2xl border-2 border-border bg-card hover:border-cta-red hover:shadow-[0_10px_40px_-10px_hsl(var(--cta-red)/0.5)] hover:-translate-y-1 transition-all duration-300 overflow-hidden"
            >
              <img
                src={individualDesignModel.url}
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 w-full h-full object-cover"
              />
              <div className="pointer-events-none absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors duration-300" />
              <div className="relative flex flex-col h-full min-h-[420px]">
              <div className="flex items-center gap-2 mb-3 min-h-[28px]">
                <UserIcon className="w-5 h-5 text-cta-red" />
                <span className="text-[10px] uppercase tracking-wider font-body font-bold text-cta-red drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
                  {t("bulk.optionBBadge", "Dāvanas / Unikāli pasūtījumi")}
                </span>
              </div>
              <div className="mt-auto rounded-xl bg-card/85 backdrop-blur-sm p-3">
                <h3 className="font-display text-xl sm:text-2xl mb-1 leading-tight tracking-wide">
                  INDIVIDUĀLS DIZAINS
                </h3>
                <p className="text-[11px] font-body font-bold uppercase tracking-wider text-cta-red mb-2">
                  [ Katrs apģērbs ar savu odziņu ]
                </p>
                <p className="text-xs sm:text-[13px] text-muted-foreground font-body leading-relaxed">
                  Radošā brīvība bez robežām! Lieliski piemērots unikālām dāvanām vai gadījumiem, kad katram komandas biedram vajadzīgs savs personalizētais elements (piemēram, dažādi vārdi, numuri vai atšķirīgas bildes). Katrs apģērba gabals tiek apstrādāts kā atsevišķs mākslas darbs, saglabājot elastību un nodrošinot atlaidi, kas piemērojas pati – <span className="font-bold text-cta-red">redzēsi to savā grozā!</span>
                </p>
              </div>
              </div>
            </button>

            {/* Card B — Standard / Team bulk order */}
            <button
              onClick={() => openDesigner("bulk")}
              className="group relative flex flex-col text-left p-5 rounded-2xl border-2 border-border bg-card hover:border-cta-red hover:shadow-[0_10px_40px_-10px_hsl(var(--cta-red)/0.5)] hover:-translate-y-1 transition-all duration-300 overflow-hidden"
            >
              <div className="absolute top-0 right-0 bg-cta-red text-white text-[10px] font-bold font-body uppercase tracking-wider px-3 py-1 rounded-bl-xl">
                👑 Līdz -30%
              </div>
              <div className="flex items-center gap-2 mb-3 min-h-[28px]">
                <Users className="w-5 h-5 text-cta-red" />
                <span className="text-[10px] uppercase tracking-wider font-body font-bold text-cta-red">
                  {t("bulk.optionABadge", "Komandām / Pasākumiem")}
                </span>
              </div>
              <div className="relative h-28 mb-4 flex items-end justify-center gap-2 transition-transform duration-300 group-hover:scale-105">
                {[0, 1, 2].map((i) => (
                  <IdenticalShirtSvg key={i} delay={i * 80} />
                ))}
              </div>
              <h3 className="font-display text-xl sm:text-2xl mb-1 leading-tight tracking-wide min-h-[32px]">
                STANDARTA PASŪTĪJUMS
              </h3>
              <p className="text-[11px] font-body font-bold uppercase tracking-wider text-cta-red mb-2 min-h-[18px]">
                [ Viens dizains – visai komandai ]
              </p>
              <p className="text-xs sm:text-[13px] text-muted-foreground font-body leading-relaxed flex-1">
                Ideāls risinājums uzņēmumiem, sporta komandām, grupām un lieliem pasākumiem. Tavs izvēlētais dizains tiek fiksēts un precīzi atkārtots uz katra <span className="font-semibold text-foreground">izstrādājuma</span>. Izvēloties šo plūsmu, Tu vari ērti vienā tabulā salikt visus nepieciešamos izmērus un automātiski aktivizēt maksimālo apjoma atlaidi līdz pat <span className="font-bold text-cta-red">-30%</span>!
              </p>
            </button>
          </div>

          {/* Pricing explainer */}
          <div className="mt-5">
            <PricingExplainer />
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk size matrix — opens after Zakeke designer closes in bulk mode */}
      {bulkMatrixOpen && pendingBulkDesign && (
        <BulkSizeMatrixDialog
          open={bulkMatrixOpen}
          onClose={() => {
            setBulkMatrixOpen(false);
            setPendingBulkDesign(null);
          }}
          productName={displayName}
          unitPrice={product.price + (pendingBulkDesign.customizationPrice || 0)}
          sizes={sizes}
          onConfirm={handleBulkConfirm}
        />
      )}
    </div>
  );
};

export default ProductDetail;

/* ------------------------------------------------------------------ */
/* Inline SVG illustrations for the workflow choice cards.            */
/* ------------------------------------------------------------------ */

const ShirtShape = ({
  children,
  fill = "hsl(var(--muted))",
  stroke = "hsl(var(--border))",
}: { children?: React.ReactNode; fill?: string; stroke?: string }) => (
  <svg viewBox="0 0 60 70" className="w-14 h-16 transition-transform duration-500 group-hover:translate-y-[-2px]">
    <path
      d="M10 12 L22 4 Q30 10 38 4 L50 12 L56 22 L46 26 L46 64 Q46 68 42 68 L18 68 Q14 68 14 64 L14 26 L4 22 Z"
      fill={fill}
      stroke={stroke}
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    {children}
  </svg>
);

const IdenticalShirtSvg = ({ delay = 0 }: { delay?: number }) => (
  <div style={{ animationDelay: `${delay}ms` }}>
    <ShirtShape fill="hsl(var(--cta-red) / 0.15)" stroke="hsl(var(--cta-red))">
      {/* Small pocket logo (top-left chest) */}
      <rect x="17" y="22" width="6" height="6" rx="1" fill="hsl(var(--cta-red))" opacity="0.9" />
      <text x="20" y="27" textAnchor="middle" fontSize="5" fontWeight="800" fill="white" fontFamily="ui-sans-serif, system-ui, sans-serif">T</text>
      {/* Central chest emblem */}
      <circle cx="30" cy="46" r="9" fill="hsl(var(--cta-red))" />
      <circle cx="30" cy="46" r="9" fill="none" stroke="white" strokeWidth="0.8" strokeDasharray="2 1.5" opacity="0.6" />
      <text x="30" y="49" textAnchor="middle" fontSize="8" fontWeight="900" fill="white" fontFamily="ui-sans-serif, system-ui, sans-serif">★</text>
    </ShirtShape>
  </div>
);

const UniqueShirtSvg = ({
  motif,
  highlight,
  color,
}: { motif: string; highlight?: boolean; color?: string }) => (
  <svg viewBox="0 0 60 70" className="w-20 h-24 transition-transform duration-500 group-hover:translate-y-[-2px] drop-shadow-[0_6px_12px_hsl(var(--cta-red)/0.35)]">
    <defs>
      <linearGradient id="uniqShirtBody" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="hsl(var(--cta-red) / 0.35)" />
        <stop offset="100%" stopColor="hsl(var(--cta-red) / 0.10)" />
      </linearGradient>
      <linearGradient id="uniqStarGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FFD86B" />
        <stop offset="100%" stopColor="hsl(var(--cta-red))" />
      </linearGradient>
      <radialGradient id="uniqGlow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0%" stopColor="hsl(var(--cta-red) / 0.5)" />
        <stop offset="100%" stopColor="hsl(var(--cta-red) / 0)" />
      </radialGradient>
    </defs>
    {/* Glow halo */}
    <circle cx="30" cy="44" r="22" fill="url(#uniqGlow)" />
    {/* Shirt body */}
    <path
      d="M10 12 L22 4 Q30 10 38 4 L50 12 L56 22 L46 26 L46 64 Q46 68 42 68 L18 68 Q14 68 14 64 L14 26 L4 22 Z"
      fill="url(#uniqShirtBody)"
      stroke="hsl(var(--cta-red))"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    {/* Collar detail */}
    <path d="M22 4 Q30 14 38 4" fill="none" stroke="hsl(var(--cta-red))" strokeWidth="1" opacity="0.55" />
    {/* Sparkles */}
    <g fill="#FFD86B">
      <circle cx="14" cy="32" r="1.2" />
      <circle cx="48" cy="36" r="1.5" />
      <circle cx="20" cy="58" r="1" />
      <circle cx="42" cy="58" r="1.2" />
    </g>
    {/* Central star emblem */}
    <g transform="translate(30 44)">
      <circle r="11" fill="white" opacity="0.95" />
      <circle r="11" fill="none" stroke="hsl(var(--cta-red))" strokeWidth="1.2" />
      <path
        d="M0 -7 L2 -2 L7 -2 L3 1.5 L4.5 6.5 L0 3.5 L-4.5 6.5 L-3 1.5 L-7 -2 L-2 -2 Z"
        fill="url(#uniqStarGrad)"
        stroke="hsl(var(--cta-red))"
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
    </g>
    {/* Pocket logo */}
    <rect x="16" y="22" width="7" height="7" rx="1.2" fill="hsl(var(--cta-red))" />
    <text x="19.5" y="27.5" textAnchor="middle" fontSize="5.5" fontWeight="900" fill="white" fontFamily="ui-sans-serif, system-ui, sans-serif">★</text>
  </svg>
);
