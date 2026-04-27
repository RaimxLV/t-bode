import { useEffect, useRef, useState, useCallback } from "react";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface ZakekeDesignerProps {
  productId: string;
  zakekeModelCode: string;
  productName: string;
  productPrice: number;
  productSlug: string;
  productImage: string;
  selectedColor: string;
  selectedColorHex?: string;
  selectedSize: string;
  /** Pre-built variant codes that match what the `zakeke-products` edge function exposes. */
  variantCodes?: { color?: string; size?: string };
  quantity: number;
  onClose: () => void;
}

declare global {
  interface Window {
    ZakekeDesigner: new () => {
      createIframe: (config: Record<string, unknown>) => void;
      removeIframe: () => void;
    };
  }
}

export const ZakekeDesigner = ({
  productId,
  zakekeModelCode,
  productName,
  productPrice,
  productSlug,
  productImage,
  selectedColor,
  selectedColorHex,
  selectedSize,
  variantCodes,
  quantity,
  onClose,
}: ZakekeDesignerProps) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const customizerRef = useRef<ReturnType<typeof window.ZakekeDesigner.prototype.createIframe> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { addItem, setIsOpen } = useCart();
  const { t, i18n } = useTranslation();

  const getToken = useCallback(async () => {
    let visitorCode = localStorage.getItem("zakeke-visitor");
    if (!visitorCode) {
      visitorCode = crypto.randomUUID();
      localStorage.setItem("zakeke-visitor", visitorCode);
    }

    const { data, error } = await supabase.functions.invoke("zakeke-token", {
      body: { visitorCode },
    });

    if (error || !data?.access_token) {
      throw new Error(error?.message || "Failed to get token");
    }

    return data.access_token as string;
  }, []);

  useEffect(() => {
    let mounted = true;
    let customizerInstance: { removeIframe: () => void } | null = null;

    const loadScript = () =>
      new Promise<void>((resolve, reject) => {
        if (window.ZakekeDesigner) {
          resolve();
          return;
        }
        const script = document.createElement("script");
        script.src = "https://portal.zakeke.com/scripts/integration/apiV2/customizer.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load Zakeke script"));
        document.head.appendChild(script);
      });

    const init = async () => {
      try {
        const [token] = await Promise.all([getToken(), loadScript()]);
        if (!mounted) return;

        const culture = i18n.language === "lv" ? "lv-LV" : "en-US";
        const isMobile = window.innerWidth < 768;

        const customizer = new window.ZakekeDesigner();
        customizerInstance = customizer;

        const colorVariantCode = variantCodes?.color;
        const sizeVariantCode = variantCodes?.size;
        // Zakeke accepts an array of value codes that match the codes returned by /options
        const variantsCodes = [colorVariantCode, sizeVariantCode].filter(
          (v): v is string => Boolean(v)
        );

        const config: Record<string, unknown> = {
          containerId: "zakeke-container",
          tokenOauth: token,
          productId: zakekeModelCode,
          productCode: zakekeModelCode,
          productName,
          quantity,
          currency: "EUR",
          culture,
          mobileVersion: isMobile,
          labelTax: "hidden",
          priceTaxIncluded: true,
          isClientPreviews: true,
          hideVariants: true,
          cartButtonText: t("productDetail.addToCart"),
          selectedAttributes: {
            ...(selectedColor ? { Color: selectedColor, Colour: selectedColor } : {}),
            ...(selectedColorHex ? { ColorHex: selectedColorHex } : {}),
            ...(selectedSize ? { Size: selectedSize } : {}),
          },
          // Pass the canonical variant codes so Zakeke skips its variant picker
          // and opens directly with the right color/size selected.
          ...(colorVariantCode ? { variantCode: colorVariantCode } : {}),
          ...(variantsCodes.length ? { variantsCodes, variantCodes: variantsCodes } : {}),
          variant: [
            ...(selectedColor ? [`Color:${selectedColor}`] : []),
            ...(selectedSize ? [`Size:${selectedSize}`] : []),
          ].join(",") || undefined,

          getProductInfo: () => ({
            price: productPrice,
            isOutOfStock: false,
          }),

          getProductPrice: () => ({
            price: productPrice,
            isOutOfStock: false,
          }),

          getProductAttribute: () => ({}),

          addToCart: (zakekeData: any) => {
            console.log("[Zakeke] addToCart payload:", zakekeData);
            const thumbnail = zakekeData?.previews?.[0]?.url || productImage;
            const designId =
              zakekeData?.designId ||
              zakekeData?.designID ||
              zakekeData?.design?.id ||
              zakekeData?.design?.designId ||
              zakekeData?.id ||
              null;
            addItem({
              productId,
              name: productName,
              price: productPrice,
              image: thumbnail,
              size: selectedSize,
              color: selectedColor,
              quantity: zakekeData?.quantity || quantity,
              slug: productSlug,
              designId: designId,
              designThumbnail: thumbnail,
            });
            toast.success(t("productDetail.addedToCart", { name: productName }));
            onClose();
            setIsOpen(true);
          },

          editAddToCart: (zakekeData: any) => {
            console.log("[Zakeke] editAddToCart payload:", zakekeData);
            const thumbnail = zakekeData?.previews?.[0]?.url || productImage;
            const designId =
              zakekeData?.designId ||
              zakekeData?.designID ||
              zakekeData?.design?.id ||
              zakekeData?.design?.designId ||
              zakekeData?.id ||
              null;
            addItem({
              productId,
              name: productName,
              price: productPrice,
              image: thumbnail,
              size: selectedSize,
              color: selectedColor,
              quantity: zakekeData?.quantity || quantity,
              slug: productSlug,
              designId: designId,
              designThumbnail: thumbnail,
            });
            toast.success(t("productDetail.addedToCart", { name: productName }));
            onClose();
            setIsOpen(true);
          },

          onBackClicked: () => {
            onClose();
          },
        };

        customizer.createIframe(config);
        setLoading(false);
      } catch (err) {
        if (!mounted) return;
        console.error("Zakeke init error:", err);
        setError(err instanceof Error ? err.message : "Failed to initialize designer");
        setLoading(false);
      }
    };

    init();

    return () => {
      mounted = false;
      try {
        customizerInstance?.removeIframe();
      } catch {
        // Cleanup silently
      }
    };
  }, [getToken, productId, productName, productPrice, productSlug, productImage, selectedColor, selectedSize, quantity, onClose, addItem, setIsOpen, t, i18n.language, variantCodes?.color, variantCodes?.size, zakekeModelCode, selectedColorHex]);

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
        <h2 className="text-lg font-display">
          {t("productDetail.customizeDesign")}
        </h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Content - capped at 80vh so buttons stay visible on large/TV screens */}
      <div
        ref={containerRef}
        className="flex-1 relative min-h-0"
        style={{ maxHeight: '85vh', overflow: 'hidden' }}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
            <div className="text-center p-6">
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={onClose} variant="outline">
                {t("productDetail.backToProducts")}
              </Button>
            </div>
          </div>
        )}
        <div id="zakeke-container" className="absolute inset-0" style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
};
