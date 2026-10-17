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

const Index = ({ withSeo = true }: { withSeo?: boolean }) => {
  const { t, i18n } = useTranslation();
  const isLv = (i18n.language || "lv") === "lv";
  const title = isLv
    ? "T-Bode — Izveido savu dizainu un pasūti online uz pakomātu"
    : "T-Bode — Design your own t-shirt online with parcel delivery";
  const description = isLv
    ? "Izveido savu dizainu un pasūti online uz pakomātu. Personalizē kreklu ar attēlu, logo vai tekstu. Piegāde visā Latvijā; apdruka 1–2 darba dienās, arī vienam kreklam."
    : "Design your own t-shirt online: add an image, logo or text and order online. Parcel-locker delivery across Latvia. Printed in 1–2 business days, even for one shirt.";
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
      { "@type": "ListItem", position: 1, name: "T-Bode", item: "https://t-bode.lv/" },
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

  const navItems = isLv
    ? [
        ["Sākt personalizēt", "/design"],
        ["Kolekcija", "/collection"],
        ["Idejas un padomi", "/idejas"],
        ["Kas ir DTF apdruka", "/kas-ir-dtf"],
        ["Veikali un kontakti", "/veikali"],
      ]
    : [
        ["Design your own", "/design"],
        ["Collection", "/collection"],
        ["Ideas & tips", "/idejas"],
        ["What is DTF printing", "/kas-ir-dtf"],
        ["Stores & contacts", "/veikali"],
      ];
  const siteNavJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: isLv ? "Galvenā izvēlne" : "Main menu",
    itemListElement: navItems.map(([name, path], i) => ({
      "@type": "SiteNavigationElement",
      position: i + 1,
      name,
      url: `https://t-bode.lv${path}`,
    })),
  };

  const jsonLdArray: Record<string, any>[] = [breadcrumbJsonLd, siteNavJsonLd];
  if (faqJsonLd) jsonLdArray.push(faqJsonLd);

  return (
    <div className="min-h-screen">
      {withSeo && <Seo title={title} description={description} type="website" canonical="/" jsonLd={jsonLdArray} />}
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
