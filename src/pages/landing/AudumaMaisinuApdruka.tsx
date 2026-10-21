import { useEffect, useState } from "react";
import type Lenis from "lenis";
import { Link, useLocation, useNavigationType } from "react-router-dom";
import { ArrowDownRight, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { useDesignProducts } from "@/hooks/useProducts";
import { BagProduct, bagProductHref } from "@/components/bags/BagProduct";
import { BagHeroArt, BagStudio } from "@/components/bags/BagStudio";
import { bagFaqs, bagSteps } from "@/components/bags/bagContent";
import "@/components/bags/bags.css";
import "@/components/bags/bagStudio.css";

const TITLE = "Auduma maisiņu apdruka ar savu dizainu | T-Bode";
const DESCRIPTION = "Apdrukāts auduma maisiņš ar tavu attēlu, logo vai tekstu. Izvēlies krāsu, izveido dizainu tiešsaistē un saņem piegādi Omniva pakomātā Latvijā. Arī 1 gabals.";

const AudumaMaisinuApdruka = () => {
  const { key: locationKey } = useLocation();
  const navigationType = useNavigationType();
  const { data, isLoading, isError, refetch } = useDesignProducts();
  const product = !isError ? data?.find((p) => p.slug === "kokvilnas-soma" && p.category === "bags" && p.customizable) : undefined;
  const natural = product?.color_variants.find((variant) => variant.name === "Natural");
  const [colorChoice, setColorChoice] = useState<{ productId: string; name: string }>();
  const selectedName = product?.color_variants.find((variant) => colorChoice?.productId === product.id && variant.name === colorChoice.name)?.name
    ?? natural?.name ?? product?.color_variants[0]?.name ?? "";
  const href = product?.in_stock ? bagProductHref(product, selectedName) : "/design?category=bags";

  // Position lazy-route deep links after layout settles, using the active scroll
  // controller. Never compete with user input or restored history positions.
  useEffect(() => {
    const hash = window.location.hash;
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (!hash || navigation?.type === "back_forward" || (navigationType === "POP" && locationKey !== "default" && navigation?.type !== "reload")) return;
    let id: string;
    try { id = decodeURIComponent(hash.slice(1)); } catch { return; }
    if (!document.getElementById(id)?.closest(".bag-page")) return;

    let cancelled = false;
    let frame = 0;
    const cancel = () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
    const onKey = (event: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " ", "Tab"].includes(event.key)) cancel();
    };
    window.addEventListener("wheel", cancel, { passive: true });
    window.addEventListener("touchstart", cancel, { passive: true });
    window.addEventListener("keydown", onKey);
    window.addEventListener("hashchange", cancel);
    window.addEventListener("popstate", cancel);

    const position = () => {
      if (cancelled || window.location.hash !== hash) return;
      const el = document.getElementById(id);
      if (!el) return;
      const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
      const top = window.scrollY + el.getBoundingClientRect().top - margin;
      const lenis = (window as Window & { __lenis?: Lenis }).__lenis;
      if (lenis) {
        lenis.resize();
        // This Lenis version already subtracts CSS scroll-margin for elements;
        // use a numeric position so the header offset is applied exactly once.
        lenis.scrollTo(top, { immediate: true, force: true });
      } else {
        window.scrollTo({ top, behavior: "instant" });
      }
    };
    void document.fonts.ready.then(() => {
      if (cancelled) return;
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(position);
      });
    });
    return () => {
      cancel();
      window.removeEventListener("wheel", cancel);
      window.removeEventListener("touchstart", cancel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("hashchange", cancel);
      window.removeEventListener("popstate", cancel);
    };
  }, []);
  const cta = <Button asChild className="bag-cta"><Link to={href}>Sākt personalizēt <ArrowRight aria-hidden="true" /></Link></Button>;

  return <>
    <Seo title={TITLE} noTitleSuffix description={DESCRIPTION} locale="lv" canonical="/auduma-maisinu-apdruka" breadcrumbs={[{ name: "Sākums", url: "/" }, { name: "Auduma maisiņu apdruka", url: "/auduma-maisinu-apdruka" }]} jsonLd={[
      { "@context": "https://schema.org", "@type": "Service", name: "Auduma maisiņu apdruka", serviceType: "Auduma maisiņu personalizēšana tiešsaistē", areaServed: { "@type": "Country", name: "Latvija" }, provider: { "@type": "Organization", name: "T-Bode", url: "https://t-bode.lv" }, inLanguage: "lv", url: "https://t-bode.lv/auduma-maisinu-apdruka", description: DESCRIPTION },
      { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: bagFaqs.map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer + (faq.email ? " info@t-bode.lv" : "") } })) },
    ]} />
    <Navbar />
    <main className="bag-page bag-v2" lang="lv">
      <div className="bag-container">
        <div className="bag-breadcrumb">
          <nav aria-label="Lapas ceļš"><ol><li><Link to="/">Sākums</Link></li><li aria-hidden="true">/</li><li>Auduma maisiņu apdruka</li></ol></nav>
        </div>
        <section className="bag-hero" aria-labelledby="bag-title">
          <div className="bag-hero-copy">
            <h1 id="bag-title"><span className="bag-eyebrow">AUDUMA MAISIŅU APDRUKA</span><span>Tavs stāsts.</span><span>Uz tava</span><span className="bag-red">maisiņa.</span></h1>
            <p>Skice no piezīmju klades. Foto no pēdējā ceļojuma. Ideja, kas neliek mieru. Uzliec to uz auduma maisiņa — un paņem līdzi.</p>
            <div className="bag-hero-actions">{cta}<a className="bag-text-link" href="#ideju-studija">Smelties idejas <ArrowDownRight size={17} aria-hidden="true" /></a></div>
            <div className="bag-support"><span>Arī 1 gabals</span><span>Tavs attēls vai teksts</span><span>Piegāde Latvijā</span></div>
          </div>
          <BagHeroArt />
        </section>
      </div>

      <BagStudio href={href} />

      <div className="bag-container">
        <section id="izvelies-maisinu" className="bag-section" aria-labelledby="bag-selection-title">
          <div className="bag-selection-head">
            <div><p className="bag-eyebrow">DIZAINS SĀKAS AR PAMATU</p><h2 id="bag-selection-title">Atrodi savu krāsu.</h2></div>
            <p>Attēlu vai tekstu pievienosi nākamajā solī.</p>
          </div>
          {isLoading ? <div className="bag-load" role="status">Ielādējam maisiņa krāsas…</div> : product ? <BagProduct key={product.id} product={product} selectedName={selectedName} onColorChange={(name) => setColorChoice({ productId: product.id, name })} /> : <div className="bag-load"><p>{isError ? "Maisiņa informāciju šobrīd neizdevās ielādēt." : "Maisiņš šobrīd nav pieejams."}</p><Button variant="outline" onClick={() => void refetch()}>Mēģināt vēlreiz</Button><Link className="bag-text-link" to="/design?category=bags">Apskatīt pieejamos maisiņus</Link></div>}
        </section>

        <section className="bag-section bag-process-editorial" aria-labelledby="bag-process-title">
          <div><p className="bag-eyebrow">NO EKRĀNA IKDIENĀ</p><h2 id="bag-process-title">Trīs soļi līdz<br /><em>tavam maisiņam.</em></h2></div>
          <div className="bag-steps">{bagSteps.map(([title, text], index) => <div className="bag-step" key={title}><span className="bag-number">0{index + 1}</span><h3>{title}</h3><p>{text}</p></div>)}</div>
        </section>

        <section className="bag-section bag-faq-layout" aria-labelledby="bag-faq-title">
          <div><p className="bag-eyebrow">NODERĪGI ZINĀT</p><h2 id="bag-faq-title">Jautājumi par maisiņu apdruku</h2></div>
          <div className="bag-faq-list">{bagFaqs.map((faq) => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}{faq.email && <> <a href="mailto:info@t-bode.lv">info@t-bode.lv</a></>}</p></details>)}</div>
        </section>
      </div>

      <section className="bag-finale" aria-labelledby="bag-finale-title">
        <span className="bag-finale-watermark" aria-hidden="true">RADI SAVU</span>
        <div className="bag-container bag-finale-inner"><h2 id="bag-finale-title">Ideju pietiek.<br /><em>Tagad tavējā.</em></h2>{cta}</div>
      </section>
    </main>
    <Footer />
  </>;
};

export default AudumaMaisinuApdruka;
