import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { OptimizedImage } from "@/components/OptimizedImage";
import { useDesignProducts } from "@/hooks/useProducts";
import { BagProduct, bagProductHref } from "@/components/bags/BagProduct";
import { bagFaqs, bagSteps } from "@/components/bags/bagContent";
import heroImage from "@/assets/bags-editorial-hero.webp";
import "@/components/bags/bags.css";

const TITLE = "Auduma maisiņu apdruka — izveido savu dizainu | T-Bode";
const DESCRIPTION = "Izveido savu auduma maisiņu ar attēlu, logo vai tekstu un pasūti tiešsaistē. Izvēlies īsto krāsu un piegādi Latvijā. Arī viens maisiņš.";

const AudumaMaisinuApdruka = () => {
  const { data, isLoading, isError, refetch } = useDesignProducts();
  const product = !isError ? data?.find((p) => p.slug === "kokvilnas-soma" && p.category === "bags" && p.customizable) : undefined;
  const natural = product?.color_variants.find((v) => v.name === "Natural");
  const href = product?.in_stock ? bagProductHref(product, natural?.name ?? product.color_variants[0]?.name) : "/design?category=bags";
  const cta = <Button asChild className="bag-cta"><Link to={href}>Sākt personalizēt <ArrowRight aria-hidden="true" /></Link></Button>;
  return <>
    <Seo title={TITLE} noTitleSuffix description={DESCRIPTION} locale="lv" noindex canonical="/auduma-maisinu-apdruka" breadcrumbs={[{ name: "Sākums", url: "/" }, { name: "Auduma maisiņu apdruka", url: "/auduma-maisinu-apdruka" }]} jsonLd={[
      { "@context": "https://schema.org", "@type": "Service", name: "Auduma maisiņu apdruka", serviceType: "Auduma maisiņu personalizēšana tiešsaistē", areaServed: { "@type": "Country", name: "Latvija" }, provider: { "@type": "Organization", name: "T-Bode", url: "https://t-bode.lv" }, url: "https://t-bode.lv/auduma-maisinu-apdruka", description: DESCRIPTION },
      { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: bagFaqs.map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer + (faq.email ? " info@t-bode.lv" : "") } })) },
    ]} />
    <Navbar />
    <main className="bag-page" lang="lv">
      <div className="bag-container">
        <div className="bag-breadcrumb"><nav aria-label="Lapas ceļš"><ol><li><Link to="/">Sākums</Link></li><li aria-hidden="true">/</li><li>Auduma maisiņu apdruka</li></ol></nav><span className="bag-draft">Melnraksts</span></div>
        <section className="bag-hero" aria-labelledby="bag-title">
          <div className="bag-hero-copy">
            <p className="bag-eyebrow">AUDUMA MAISIŅU APDRUKA</p>
            <h1 id="bag-title"><span>Tavs stāsts.</span><span>Uz tava</span><span className="bag-red">maisiņa.</span></h1>
            <p>Ikdienai, dāvanai vai tava zīmola idejai. Pievieno auduma maisiņam savu attēlu, logo vai tekstu un pasūti to tiešsaistē.</p>
            <div className="bag-hero-actions">{cta}<a className="bag-text-link" href="#izvelies-maisinu">Apskatīt krāsas</a></div>
            <div className="bag-support"><span>Arī 1 gabals</span><span>Tavs attēls vai teksts</span><span>Piegāde Latvijā</span></div>
          </div>
          <figure className="bag-hero-image"><img src={heroImage} alt="Dizaina vizualizācija: dabīgs auduma maisiņš ar sarkanu saules zīmējumu un tekstu LABA DIENA." width={768} height={960} fetchPriority="high" /><figcaption>Dizaina vizualizācija</figcaption></figure>
        </section>
        <section id="izvelies-maisinu" className="bag-section" aria-labelledby="bag-selection-title">
          <p className="bag-eyebrow">SĀC AR KRĀSU</p><h2 id="bag-selection-title">Viena soma. Daudz iespēju.</h2>
          {isLoading ? <div className="bag-load" role="status">Ielādējam maisiņa krāsas…</div> : product ? <BagProduct key={product.id} product={product} /> : <div className="bag-load"><p>{isError ? "Maisiņa informāciju šobrīd neizdevās ielādēt." : "Maisiņš šobrīd nav pieejams."}</p><Button variant="outline" onClick={() => void refetch()}>Mēģināt vēlreiz</Button><Link className="bag-text-link" to="/design?category=bags">Apskatīt pieejamos maisiņus</Link></div>}
        </section>
        <section className="bag-section" aria-labelledby="bag-process-title"><p className="bag-eyebrow">TRĪS SOĻI. TAVA IDEJA.</p><h2 id="bag-process-title">No idejas līdz plecam.</h2><div className="bag-steps">{bagSteps.map(([title, text], index) => <div className="bag-step" key={title}><span className="bag-number">0{index + 1}</span><h3>{title}</h3><p>{text}</p></div>)}</div></section>
        <section className="bag-section" aria-labelledby="bag-ideas-title"><p className="bag-eyebrow">DIZAINA IDEJAS</p><h2 id="bag-ideas-title">Kam tu nesīsi savu stāstu?</h2>
          <div className="bag-ideas">
            {natural?.images[0] && <figure className="bag-ideas-photo"><OptimizedImage src={natural.images[0]} alt="Dabīgas krāsas kokvilnas soma bez apdrukas — pamats tavai dizaina idejai" width={600} wrapperClassName="bag-product-image" className="bag-photo-img" /><figcaption>Viena soma. Tavs personiskais vēstījums.</figcaption></figure>}
            <div className="bag-idea-list">{[["IKDIENAI", "LABA DIENA."], ["DĀVANAI", "TIEŠI TEV."], ["ZĪMOLAM", "TAVS LOGO"]].map(([label, text]) => <div className="bag-idea" key={label}><div><p>{label}</p><h3>{text}</h3></div><Button asChild variant="ghost" size="icon"><Link to={href} aria-label={`Sākt savu dizainu — ${label.toLocaleLowerCase("lv")}`}><ArrowRight aria-hidden="true" /></Link></Button></div>)}</div>
          </div><p className="bag-small bag-ideas-note">Dizaina idejas iedvesmai, nevis gatavi pasūtījumi. Šie teksti netiek pārnesti uz personalizēšanas rīku — savu dizainu izveidosi pats.</p>
        </section>
        <section className="bag-section bag-faq-layout" aria-labelledby="bag-faq-title"><div><p className="bag-eyebrow">NODERĪGI ZINĀT</p><h2 id="bag-faq-title">Pirms sāc, īsi un skaidri.</h2></div><div className="bag-faq-list">{bagFaqs.map((faq) => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}{faq.email && <> <a href="mailto:info@t-bode.lv">info@t-bode.lv</a></>}</p></details>)}</div></section>
      </div>
      <section className="bag-finale"><div className="bag-container bag-finale-inner"><h2>Tava ideja ir gatava doties līdzi<span className="bag-red">.</span></h2>{cta}</div></section>
    </main>
    <Footer />
  </>;
};

export default AudumaMaisinuApdruka;