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
    ? "T-Bode — Profesionāla T-kreklu un apģērbu apdruka Rīgā"
    : "Custom T-shirt printing in Riga | T-Bode";
  const description = isLv
    ? "👕 Tavs dizains. Mūsu augstākās kvalitātes izpildījums!\n\n🎨 Apdruka uz t-krekliem, hūdijiem, krūzēm un somām ar mūsdienīgu DTF tehnoloģiju.\n\n📍 Mūsu veikali Rīgā:\n• Akropole Rīga (Maskavas iela 257)\n• Domina Shopping (Ieriķu iela 3)\n• Origo (Stacijas laukums 2)\n• Alfa / Akropole Alfa (Brīvības gatve 372)\n\n🏢 Birojs un ražošana:\n• Braslas iela 29, Rīga\n\n✨ Izveido savu stilu pats mūsu tiešsaistes dizaina rīkā! Ātra izgatavošana un draudzīgas cenas."
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
  const faqJsonLd = faqs.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      }
    : undefined;
  return (
    <div className="min-h-screen">
      <Seo title={title} description={description} type="website" jsonLd={faqJsonLd} />
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
