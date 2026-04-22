import { Navbar } from "@/components/Navbar";
import { OurCollectionSection } from "@/components/OurCollectionSection";
import { Footer } from "@/components/Footer";
import { Seo } from "@/components/Seo";
import { useTranslation } from "react-i18next";

const OurCollection = () => {
  const { i18n } = useTranslation();
  const isLv = i18n.language === "lv";
  return (
    <div className="min-h-screen">
      <Seo
        title={isLv ? "Mūsu kolekcija" : "Our Collection"}
        description={
          isLv
            ? "Pārlūko T-Bode gatavo apģērbu un aksesuāru kolekciju — t-krekli, hūdiji, krūzes un somas ar oriģināliem dizainiem."
            : "Browse the T-Bode ready-made collection of t-shirts, hoodies, mugs and bags with original designs."
        }
      />
      <Navbar />
      <div className="pt-16">
        <OurCollectionSection />
      </div>
      <Footer />
    </div>
  );
};

export default OurCollection;
