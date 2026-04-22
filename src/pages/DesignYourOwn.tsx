import { Navbar } from "@/components/Navbar";
import { ProductsSection } from "@/components/ProductsSection";
import { Footer } from "@/components/Footer";
import { Seo } from "@/components/Seo";
import { useTranslation } from "react-i18next";

const DesignYourOwn = () => {
  const { i18n } = useTranslation();
  const isLv = i18n.language === "lv";
  return (
    <div className="min-h-screen">
      <Seo
        title={isLv ? "Izveido savu dizainu" : "Design Your Own"}
        description={
          isLv
            ? "Izveido pats savu unikālo apdruku — augšupielādē attēlu, izvēlies krāsu un izmēru. Profesionāla apdruka uz t-krekliem, hūdijiem un vairāk."
            : "Create your own unique print — upload your image, choose color and size. Professional printing on t-shirts, hoodies and more."
        }
      />
      <Navbar />
      <div className="pt-16">
        <ProductsSection />
      </div>
      <Footer />
    </div>
  );
};

export default DesignYourOwn;
