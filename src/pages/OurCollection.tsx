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
        title={isLv ? "T-Bode Veikals | Pērc gatavus T-kreklus un sezonas dizainus" : "T-Bode Shop | Ready-made T-shirts & seasonal designs"}
        description={
          isLv
            ? "Iepazīsti T-Bode veikalu! Atklāj mūsu jaunāko kolekciju un sezonas piedāvājumus. Gatavi dizaini, ērta iepirkšanās un ātra piegāde visā Latvijā. Izvēlies savējo!"
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
