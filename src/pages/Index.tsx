import { Navbar } from "@/components/Navbar";
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
  const { t } = useTranslation();
  const lang = (t as any).i18n?.language || "lv";
  const isLv = lang === "lv";
  const title = isLv
    ? "T-Bode — Apdrukāti T-krekli, hūdiji un krūzes Latvijā"
    : "T-Bode — Custom printed t-shirts, hoodies and mugs in Latvia";
  const description = isLv
    ? "Izveido savu unikālo dizainu vai izvēlies no mūsu kolekcijas. Apdruka uz t-krekliem, hūdijiem, krūzēm un somām. Veikali Rīgā: Akropole, Domina, Origo, Alfa."
    : "Design your own or shop our collection of custom-printed t-shirts, hoodies, mugs and bags. Stores in Riga: Akropole, Domina, Origo, Alfa.";
  return (
    <div className="min-h-screen">
      <Seo title={title} description={description} type="website" />
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
