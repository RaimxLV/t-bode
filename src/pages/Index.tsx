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
  const { t, i18n } = useTranslation();
  const isLv = (i18n.language || "lv") === "lv";
  const title = isLv
    ? "T-kreklu apdruka Rīgā — Krekli, hūdiji, krūzes ar savu dizainu"
    : "Custom T-shirt printing in Riga — Hoodies, mugs & bags with your design";
  const description = isLv
    ? "T-kreklu apdruka ar savu dizainu Rīgā. Kreklu, džemperu, krūžu un somu apdruka ar DTF tehnoloģiju. T-Bode veikali: Akropole, Domina, Origo, Alfa."
    : "Custom t-shirt, hoodie, mug & bag printing in Riga with DTF technology. Design your own or shop the T-Bode collection. Stores: Akropole, Domina, Origo, Alfa.";
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
