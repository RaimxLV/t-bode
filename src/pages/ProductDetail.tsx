import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ShoppingCart, Ruler, Palette, ExternalLink } from "lucide-react";
import { products } from "@/data/products";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";

const sizeOptions: Record<string, string[]> = {
  "t-shirts": ["XS", "S", "M", "L", "XL", "XXL"],
  hoodies: ["XS", "S", "M", "L", "XL", "XXL"],
  kids: ["92", "98", "104", "110", "116", "122", "128"],
  mugs: ["300ml", "450ml"],
  bags: ["One Size"],
};

const colorOptions = [
  { name: "White", value: "#FFFFFF" },
  { name: "Black", value: "#1a1a1a" },
  { name: "Red", value: "#DC2626" },
  { name: "Navy", value: "#1e3a5f" },
  { name: "Grey", value: "#6b7280" },
];

const ProductDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const product = products.find((p) => p.slug === slug);

  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCart();

  const handleAddToCart = () => {
    if (!product || !selectedSize || !selectedColor) return;
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      size: selectedSize,
      color: selectedColor,
      quantity,
      slug: product.slug,
    });
    toast.success(`${product.name} pievienots grozam!`);
  };

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl mb-4">Product Not Found</h1>
            <Link to="/#products" className="text-primary hover:underline">
              ← Back to Products
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const sizes = sizeOptions[product.category] || ["One Size"];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Breadcrumb */}
          <Link
            to="/#products"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 font-body text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Products
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Product Image */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="aspect-square rounded-lg overflow-hidden bg-card border border-border">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </motion.div>

            {/* Product Info */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex flex-col"
            >
              <span className="text-xs font-body font-medium uppercase tracking-wider text-muted-foreground mb-2">
                {product.category}
              </span>
              <h1 className="text-3xl md:text-4xl mb-4">{product.name}</h1>
              <p className="text-3xl font-bold font-body mb-8" style={{ color: "hsl(var(--primary))" }}>
                {product.price.toFixed(2).replace(".", ",")} €
              </p>

              {/* Size Selection */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Ruler className="w-4 h-4 text-muted-foreground" />
                  <span className="font-body font-semibold text-sm">Size</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`px-4 py-2 rounded-md text-sm font-body font-medium border transition-all ${
                        selectedSize === size
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Selection */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Palette className="w-4 h-4 text-muted-foreground" />
                  <span className="font-body font-semibold text-sm">Color</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {colorOptions.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => setSelectedColor(color.name)}
                      title={color.name}
                      className={`w-10 h-10 rounded-full border-2 transition-all ${
                        selectedColor === color.name
                          ? "border-primary scale-110 ring-2 ring-primary/30"
                          : "border-border hover:border-foreground"
                      }`}
                      style={{ backgroundColor: color.value }}
                    />
                  ))}
                </div>
                {selectedColor && (
                  <p className="text-xs text-muted-foreground mt-2 font-body">
                    Selected: {selectedColor}
                  </p>
                )}
              </div>

              {/* Quantity */}
              <div className="mb-8">
                <span className="font-body font-semibold text-sm mb-3 block">Quantity</span>
                <div className="inline-flex items-center border border-border rounded-md">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-4 py-2 text-lg font-body hover:bg-secondary transition-colors"
                  >
                    −
                  </button>
                  <span className="px-6 py-2 font-body font-semibold border-x border-border">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-4 py-2 text-lg font-body hover:bg-secondary transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Zakeke Customization Placeholder */}
              <div className="mb-8 p-6 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5">
                <div className="flex items-center gap-3 mb-3">
                  <ExternalLink className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-display">Customize Your Design</h3>
                </div>
                <p className="text-sm text-muted-foreground font-body mb-4">
                  Use our visual editor to add your own text, images, and designs to this product.
                </p>
                <Button
                  variant="outline"
                  className="border-primary/40 text-primary hover:bg-primary/10"
                  disabled
                >
                  Open Designer (Zakeke)
                </Button>
                <p className="text-xs text-muted-foreground mt-2 font-body italic">
                  Zakeke integration will be connected here.
                </p>
              </div>

              {/* Add to Cart */}
              <button
                className="w-full flex items-center justify-center gap-3 px-8 py-4 rounded-lg text-lg font-semibold font-body text-primary-foreground transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "var(--gradient-brand)" }}
                disabled={!selectedSize || !selectedColor}
                onClick={handleAddToCart}
              >
                <ShoppingCart className="w-5 h-5" />
                Pievienot grozam — {(product.price * quantity).toFixed(2).replace(".", ",")} €
              </button>
              {(!selectedSize || !selectedColor) && (
                <p className="text-xs text-muted-foreground text-center mt-2 font-body">
                  Please select size and color
                </p>
              )}
            </motion.div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProductDetail;
