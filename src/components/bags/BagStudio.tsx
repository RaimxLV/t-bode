import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Minus, Plus } from "lucide-react";
import illustrationAsset from "@/assets/bag-art-illustration.webp.asset.json";
import photoAsset from "@/assets/bag-art-photo.webp.asset.json";
import graphicAsset from "@/assets/bag-art-graphic.webp.asset.json";
import { Button } from "@/components/ui/button";
import { BagIdeasGallery } from "./BagIdeasGallery";

const concepts = [
  {
    id: "illustration", number: "01", label: "Ilustrācija", image: illustrationAsset.url,
    title: "Mazliet mākslas.", emphasis: "Daudz rakstura.",
    description: "Zīmējums, ko gribas parādīt. Tavs mājdzīvnieks, iemīļots tēls vai paša ilustrācija — uz ikdienas maisiņa.",
    note: "Tavs zīmējums · ilustrācija · kolāža",
    alt: "Apdrukas idejas vizualizācija: kokvilnas maisiņš ar melnu kaķi, zilām lapām un oranžu sauli",
  },
  {
    id: "photo", number: "02", label: "Fotogrāfija", image: photoAsset.url,
    title: "Atmiņai nav", emphasis: "jāpaliek telefonā.",
    description: "Piekrastes brīvdienas, ģimenes kadrs vai pilsēta, kurā iemīlējies. Izvēlies savu fotogrāfiju un paņem to līdzi.",
    note: "Tavs foto · ceļojums · īpašs mirklis",
    alt: "Apdrukas idejas vizualizācija: kokvilnas maisiņš ar krāsainu jūras piekrastes fotogrāfiju",
  },
  {
    id: "graphic", number: "03", label: "Grafika", image: graphicAsset.url,
    title: "Ideja, kuru", emphasis: "pamana.",
    description: "Izteiksmīga tipografika, pasākuma plakāts vai komandas vizuālais stils. Spēlējies ar kompozīciju, krāsām un savu noskaņu.",
    note: "Tavs plakāts · burti · vizuālais stils",
    alt: "Apdrukas idejas vizualizācija: kokvilnas maisiņš ar zilu un dzeltenu grafisko dizainu RADI SAVU",
  },
] as const;

/** A locally authored visual composition. Concept pictures never replace real product variants. */
export function BagHeroArt() {
  const circleId = `bag-stamp-${useId().replace(/:/g, "")}`;
  return <div className="bag-art-composition">
    <div className="bag-art-coordinates" aria-hidden="true"><span>T–B / PRINT STUDIO</span><span>01 — 03</span></div>
    <figure className="bag-art-main">
      <img src={illustrationAsset.url} width={1122} height={1402} alt={concepts[0].alt} fetchPriority="high" decoding="async" />
      <figcaption>Kaķis maisā? Šoreiz — uz maisiņa.</figcaption>
    </figure>
    <figure className="bag-art-secondary" aria-hidden="true">
      <img src={graphicAsset.url} width={1122} height={1402} alt="" loading="lazy" decoding="async" />
      <figcaption>03 / GRAFIKA</figcaption>
    </figure>
    <a href="#ideju-studija" className="bag-art-stamp" aria-label="Apskatīt apdrukas ideju studiju">
      <svg viewBox="0 0 100 100" aria-hidden="true"><defs><path id={circleId} d="M50 10a40 40 0 1 1-.1 0" /></defs><text><textPath href={`#${circleId}`} textLength="245" lengthAdjust="spacing">TAVA IDEJA · TAVS MAISIŅŠ · </textPath></text></svg>
      <ArrowDownRight aria-hidden="true" />
    </a>
  </div>;
}

/** Manual gallery: no autoplay, no runtime AI, no transaction or editor side effects. */
export function BagStudio({ href }: { href: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [loadedId, setLoadedId] = useState<string>();
  const active = concepts[activeIndex];
  const ready = loadedId === active.id;

  function select(index: number) {
    if (index === activeIndex) return;
    setActiveIndex(index);
    setZoomed(false);
  }

  return <section className="bag-studio" id="ideju-studija" aria-labelledby="bag-studio-title" data-concept={active.id}>
    <div className="bag-container">
      <div className="bag-studio-heading">
        <div><p className="bag-studio-kicker"><span aria-hidden="true">✳</span> T–BODE IDEJU STUDIJA</p><h2 id="bag-studio-title">Viena forma.<br /><em>Bezgalīgi stāsti.</em></h2></div>
        <p>Fotogrāfija, ilustrācija vai paša zīmējums.</p>
      </div>

      <div className="bag-studio-choices" role="group" aria-label="Apdrukas ideju izvēle">
        {concepts.map((concept, index) => <Button variant="ghost" key={concept.id} type="button" aria-pressed={index === activeIndex} aria-controls="bag-studio-display" onClick={() => select(index)}>
          <span className="bag-choice-number">{concept.number}</span><span>{concept.label}</span><ArrowUpRight aria-hidden="true" />
        </Button>)}
      </div>

      <div id="bag-studio-display" className="bag-studio-stage">
        <div className="bag-studio-image-wrap">
          <span className="bag-studio-edition" aria-hidden="true">{active.number} / APDRUKAS IDEJA</span>
          <Button variant="ghost" type="button" className="bag-studio-image" data-zoomed={zoomed} data-loaded={ready} onClick={() => setZoomed((value) => !value)} aria-pressed={zoomed} aria-label={zoomed ? "Rādīt visu maisiņu" : "Apskatīt apdruku tuvplānā"}>
            {!ready && <span className="bag-studio-loading" role="status">Ielādē attēlu…</span>}
            <img key={active.id} src={active.image} width={1122} height={1402} alt={active.alt} decoding="async" loading="lazy" onLoad={() => setLoadedId(active.id)} onError={(event) => { const image = event.currentTarget; if (image.dataset.fallback !== "true") { image.dataset.fallback = "true"; image.src = "/image-unavailable.svg"; } setLoadedId(active.id); }} />
            <span className="bag-studio-zoom">{zoomed ? <Minus aria-hidden="true" /> : <Plus aria-hidden="true" />}{zoomed ? "Viss maisiņš" : "Apdruka tuvplānā"}</span>
          </Button>
          <span className="bag-studio-corner" aria-hidden="true">+</span>
        </div>

        <div className="bag-studio-copy">
          <div key={active.id} className="bag-studio-copy-enter" aria-live="polite" aria-atomic="true">
            <p className="bag-studio-type">{active.label} / {active.number}</p>
            <h3>{active.title}<br /><em>{active.emphasis}</em></h3>
            <p className="bag-studio-description">{active.description}</p>
            <p className="bag-studio-materials">{active.note}</p>
          </div>
          <Button asChild variant="ghost" className="bag-studio-cta"><Link to={href}>Izveidot savu maisiņu <ArrowRight aria-hidden="true" /></Link></Button>
        </div>
      </div>

      <BagIdeasGallery href={href} />
      <div className="bag-studio-bottom"><span>Apdrukas piemēri iedvesmai</span><a href="#izvelies-maisinu">Izvēlēties maisiņa krāsu <ArrowDownRight aria-hidden="true" /></a></div>
    </div>
  </section>;
}
