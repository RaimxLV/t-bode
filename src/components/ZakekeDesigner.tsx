import { useEffect, useRef, useState } from "react";
import { X, Loader2, AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { sanitizeZakekeCodePart } from "@/lib/zakeke";
import {
  getZakekeToken,
  loadZakekeScript,
  clearZakekeTokenCache,
} from "@/lib/zakeke-loader";

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
  availableColors?: string[];
  availableSizes?: string[];
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
  availableColors = [],
  availableSizes = [],
  variantCodes,
  quantity,
  onClose,
}: ZakekeDesignerProps) => {
  const [loading, setLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const { addItem, setIsOpen } = useCart();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    let mounted = true;
    let customizerInstance: { removeIframe: () => void } | null = null;

    const init = async () => {
      try {
        setError(null);
        setLoading(true);
        setLoadingStep(t("productDetail.zakekeLoadingScript", "Sagatavojam dizaineri…"));
        // Kick off both in parallel — both have their own caches so this
        // is essentially free if the user (or the product page) already
        // warmed them up.
        const tokenP = getZakekeToken();
        const scriptP = loadZakekeScript();

        const [token] = await Promise.all([tokenP, scriptP]);
        if (!mounted) return;
        setLoadingStep(t("productDetail.zakekeLoadingDesigner", "Iel\u0101d\u0113jam dizaineri…"));

        const culture = i18n.language === "lv" ? "lv-LV" : "en-US";
        const isMobile = window.innerWidth < 768;

        const customizer = new window.ZakekeDesigner();
        customizerInstance = customizer;

        const colorVariantCode = variantCodes?.color;
        const sizeVariantCode = variantCodes?.size;
        const colorAttributeCode = `${zakekeModelCode}-color`;
        const sizeAttributeCode = `${zakekeModelCode}-size`;
        const colorValues = availableColors.map((color) => ({
          code: `${colorAttributeCode}-${sanitizeZakekeCodePart(color)}`,
          label: color,
        }));
        const sizeValues = availableSizes.map((size) => ({
          code: `${sizeAttributeCode}-${sanitizeZakekeCodePart(size)}`,
          label: size,
        }));
        const selectedAttributes = {
          ...(colorVariantCode ? { [colorAttributeCode]: colorVariantCode } : {}),
          ...(sizeVariantCode ? { [sizeAttributeCode]: sizeVariantCode } : {}),
        };
        const attributeDefinitions = [
          ...(colorValues.length
            ? [{ code: colorAttributeCode, label: "Color", values: colorValues }]
            : []),
          ...(sizeValues.length
            ? [{ code: sizeAttributeCode, label: "Size", values: sizeValues }]
            : []),
        ];
        const variantSelections =
          colorValues.length && sizeValues.length
            ? colorValues.flatMap((color) =>
                sizeValues.map((size) => [
                  { code: colorAttributeCode, value: { code: color.code } },
                  { code: sizeAttributeCode, value: { code: size.code } },
                ])
              )
            : colorValues.length
              ? colorValues.map((color) => [
                  { code: colorAttributeCode, value: { code: color.code } },
                ])
              : sizeValues.map((size) => [
                  { code: sizeAttributeCode, value: { code: size.code } },
                ]);
        // The Zakeke v2 SDK reads `firstVariantId` to pre-select a variant and skip
        // the "Choose a variant" picker. The id must match a value code that the
        // `zakeke-products` /options endpoint returned.
        // Color is the dominant variant (mug Gold/Silver), so we prefer it.
        const firstVariantId = colorVariantCode || sizeVariantCode;

        const config: Record<string, unknown> = {
          containerId: "zakeke-container",
          tokenOauth: token,
          productId: zakekeModelCode,
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
          selectedAttributes,
          // Pre-select the variant so Zakeke skips its built-in variant picker.
          // `firstVariantId` is the actual SDK field (see customizer.js v2).
          ...(firstVariantId ? { firstVariantId } : {}),

          getProductInfo: () => ({
            price: productPrice,
            isOutOfStock: false,
          }),

          getProductPrice: () => ({
            price: productPrice,
            isOutOfStock: false,
          }),

          getProductAttribute: () => ({
            attributes: attributeDefinitions,
            variants: variantSelections,
            ...(selectedColorHex ? { colorHex: selectedColorHex } : {}),
          }),

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
        // If this looks like an auth error, drop the cached token so the
        // next attempt fetches a fresh one.
        const msg = err instanceof Error ? err.message : String(err);
        if (/401|403|token/i.test(msg)) {
          clearZakekeTokenCache();
        }
        setError(msg || "Failed to initialize designer");
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
  }, [productId, productName, productPrice, productSlug, productImage, selectedColor, selectedSize, quantity, onClose, addItem, setIsOpen, t, i18n.language, variantCodes?.color, variantCodes?.size, zakekeModelCode, selectedColorHex, availableColors, availableSizes, retryNonce]);

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
        {loading && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
            <div className="flex flex-col items-center gap-3 text-center px-6">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="text-sm font-body text-muted-foreground">
                {loadingStep || t("productDetail.zakekeLoadingScript", "Sagatavojam dizaineri…")}
              </p>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
            <div className="text-center p-6 max-w-sm">
              <AlertTriangle className="w-10 h-10 text-destructive mx-auto mb-3" />
              <p className="font-body font-semibold mb-2">
                {t("productDetail.zakekeErrorTitle", "Neizdev\u0101s atv\u0113rt dizaineri")}
              </p>
              <p className="text-sm text-muted-foreground mb-4 break-words">
                {error}
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button
                  onClick={() => {
                    clearZakekeTokenCache();
                    setRetryNonce((n) => n + 1);
                  }}
                  className="gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  {t("productDetail.tryAgain", "M\u0113\u0123in\u0101t v\u0113lreiz")}
                </Button>
                <Button onClick={onClose} variant="outline">
                  {t("productDetail.backToProducts")}
                </Button>
              </div>
            </div>
          </div>
        )}
        <div id="zakeke-container" className="absolute inset-0" style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
};
