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
    ? "T-Bode | Kvalitatīva apģērbu apdruka un personalizēti dizaini"
    : "Custom T-shirt printing in Riga | T-Bode";
  const description = isLv
    ? "Pasūti unikālus T-kreklus un hūdijus ar savu dizainu! T-Bode piedāvā augstākās kvalitātes apdruku, modernas tehnoloģijas un ātru izgatavošanu. Ienāc!"
    : "Custom t-shirt, hoodie, mug & bag printing in Riga with DTF technology. Design your own or shop the T-Bode collection. Stores: Akropole, Domina, Origo, Alfa.";
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
