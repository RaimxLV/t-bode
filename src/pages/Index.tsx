import { Navbar } from "@/components/Navbar";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HeroSection } from "@/components/HeroSection";
import { AboutSection } from "@/components/AboutSection";
import { HowItWorksSection } from "@/components/HowItWorksSection";
import { GallerySection } from "@/components/GallerySection";
import { StoresSection } from "@/components/StoresSection";
import { ContactSection } from "@/components/ContactSection";
import { Footer } from "@/components/Footer";
import { FAQSection } from "@/components/FAQSection";
import { useTranslation } from "react-i18next";
import { Seo } from "@/components/Seo";

const Index = () => {
  const { t, i18n } = useTranslation();
  const isLv = (i18n.language || "lv") === "lv";
  const title = isLv
    ? "Izveido savu kreklu online — personalizēta apdruka ar piegādi visā Latvijā"
    : "Design your own t-shirt online — custom printing with delivery across Latvia";
  const description = isLv
    ? "Izveido savu t-krekla, hūdija, krūzes vai somas dizainu online un saņem to pakomātā visā Latvijā vai mūsu veikalos Rīgā. Personalizēta DTF apdruka — ātri, kvalitatīvi, no jebkuras ierīces."
    : "Design your own t-shirt, hoodie, mug or bag online and get it delivered to any parcel locker in Latvia or pick it up at our Riga stores. Custom DTF printing, made in Riga.";
  const [faqs, setFaqs] = useState<{ q: string; a: string }[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("faqs")
        .select("question_lv,answer_lv,question_en,answer_en,sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      setFaqs(
        (data || []).map((f: any) => ({
          q: isLv ? f.question_lv : f.question_en || f.question_lv,
          a: isLv ? f.answer_lv : f.answer_en || f.answer_lv,
        }))
      );
    })();
  }, [isLv]);
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "T-Bode", item: "https://www.t-bode.lv/" },
      { "@type": "ListItem", position: 2, name: isLv ? "Izveido savu dizainu" : "Design your own", item: "https://www.t-bode.lv/design" },
      { "@type": "ListItem", position: 3, name: isLv ? "Kolekcija" : "Collection", item: "https://www.t-bode.lv/collection" },
    ],
  };

  const stripHtml = (s: string) => s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  const faqJsonLd = faqs.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: stripHtml(f.q),
      acceptedAnswer: { "@type": "Answer", text: stripHtml(f.a) },
    })),
  } : null;

  const jsonLdArray: Record<string, any>[] = [breadcrumbJsonLd];
  if (faqJsonLd) jsonLdArray.push(faqJsonLd);

  return (
    <div className="min-h-screen">
      <Seo title={title} description={description} type="website" jsonLd={jsonLdArray} />
      <a href="#main-content" className="skip-to-content">
        {t("nav.skipToContent", "Pāriet uz saturu")}
      </a>
      <Navbar />
      <main id="main-content">
        <HeroSection />
        <AboutSection />
        <HowItWorksSection />
        <GallerySection />
        <StoresSection />
        <ContactSection />
        <FAQSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
