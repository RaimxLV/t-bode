import { useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OptimizedImage } from "@/components/OptimizedImage";
import { getProductDescription, type DBProduct } from "@/hooks/useProducts";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { bagColorLabels } from "./bagContent";

export function bagProductHref(product: DBProduct, color?: string) {
  const valid = product.color_variants.some((variant) => variant.name === color);
  return `/produkti/${encodeURIComponent(product.slug)}${valid ? `?color=${encodeURIComponent(color ?? "")}` : ""}`;
}

export function BagProduct({ product }: { product: DBProduct }) {
  const variants = product.color_variants;
  const [selectedName, setSelectedName] = useState(() => variants.find((v) => v.name === "Natural")?.name ?? variants[0]?.name ?? "");
  const selected = variants.find((v) => v.name === selectedName) ?? variants[0];
  const label = selected ? bagColorLabels[selected.name] ?? selected.name : "";
  const image = selected?.images[0] ?? product.image_url;
  return <div className="bag-product-grid">
    <figure className="bag-product-photo">
      {image ? <OptimizedImage src={image} alt={`Kokvilnas soma — ${label.toLocaleLowerCase("lv")}`} width={720} sizes="(max-width: 760px) 90vw, 48vw" wrapperClassName="bag-product-image" className="bag-photo-img" /> : <div className="bag-no-image">Preces attēls nav pieejams</div>}
      <figcaption>Maisiņš bez apdrukas · <span aria-live="polite">{label}</span></figcaption>
    </figure>
    <div className="bag-product-info">
      <p className="bag-eyebrow">TAVAS IDEJAS PAMATS</p>
      <h3>{product.name_lv || product.name}</h3>
      <p className="bag-lead">Vienkārša forma, vieta tavai idejai. Izvēlies krāsu ikdienai, personiskai dāvanai vai sava zīmola stāstam.</p>
      <div className="bag-color-heading"><span>Krāsa — <strong aria-live="polite">{label}</strong></span><span>{variants.length} krāsas</span></div>
      <div className="bag-swatches" role="group" aria-label="Maisiņa krāsas">
        {variants.map((variant) => <Button key={variant.name} variant="ghost" size="icon" className="bag-swatch" aria-label={bagColorLabels[variant.name] ?? variant.name} aria-pressed={selected?.name === variant.name} title={bagColorLabels[variant.name] ?? variant.name} onClick={() => setSelectedName(variant.name)}>
          <span className="bag-swatch-color" style={{ "--variant-color": /^#[0-9a-f]{3,8}$/i.test(variant.hex) ? variant.hex : "hsl(var(--bag-line))" } as CSSProperties} />
        </Button>)}
      </div>
      <div className="bag-price"><span>{new Intl.NumberFormat("lv-LV", { style: "currency", currency: "EUR" }).format(product.price)}</span><span>Maisiņš bez apdrukas</span></div>
      <p className="bag-small">Apdrukas cena tiek aprēķināta konstruktorā. Piegādes izmaksas redzēsi pirms pasūtījuma apmaksas.</p>
      {product.in_stock ? <Button asChild className="bag-cta"><Link to={bagProductHref(product, selected?.name)}>Sākt personalizēt <ArrowRight aria-hidden="true" /></Link></Button> : <p className="bag-stock">Šis maisiņš pašlaik nav pieejams pasūtīšanai.</p>}
      <p className="bag-small bag-next">Nākamajā solī atvērsies prece izvēlētajā krāsā. Tur varēsi atvērt personalizēšanas rīku.</p>
      <div className="bag-specs" dangerouslySetInnerHTML={{ __html: sanitizeHtml(getProductDescription(product, "lv")) }} />
    </div>
  </div>;
}