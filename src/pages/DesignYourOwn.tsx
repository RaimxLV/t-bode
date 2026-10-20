import { Navbar } from "@/components/Navbar";
import { ProductsSection } from "@/components/ProductsSection";
import { Footer } from "@/components/Footer";
import { Seo } from "@/components/Seo";
import { useTranslation } from "react-i18next";

const DesignYourOwn = () => {
  const { i18n } = useTranslation();
  const isLv = i18n.language === "lv";
  const title = isLv
    ? "Sākt personalizēt — izveido savu kreklu online | T-Bode"
    : "Personalize your t-shirt, hoodie or mug online | T-Bode";
  const description = isLv
    ? "Izvēlies kreklu, hūdiju vai krūzi, pievieno savu attēlu, logo vai tekstu un pasūti internetā. Piegāde Omniva pakomātā visā Latvijā. Vari pasūtīt arī vienu preci."
    : "Choose a t-shirt, hoodie or mug, add your image, logo or text and order online. Omniva parcel-locker delivery across Latvia. Order as little as one item.";

  const jsonLd: Record<string, any>[] = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: title,
      description,
      url: "https://t-bode.lv/design",
      inLanguage: ["lv-LV", "en"],
      isPartOf: { "@type": "WebSite", url: "https://t-bode.lv/", name: "T-Bode" },
      publisher: { "@id": "https://t-bode.lv/#organization" },
    },
  ];

  return (
    <div className="min-h-screen">
      <Seo
        title={title}
        description={description}
        type="website"
        canonical="https://t-bode.lv/design"
        breadcrumbs={[
          { name: "T-Bode", url: "https://t-bode.lv/" },
          { name: isLv ? "Izveido savu dizainu" : "Design your own", url: "https://t-bode.lv/design" },
        ]}
        jsonLd={jsonLd}
      />
      <Navbar />
      <div className="pt-16">
        <h1 className="sr-only">
          {isLv ? "Izveido savu dizainu online — T-krekli, hūdiji un krūzes ar apdruku" : "Design your own — T-shirts, hoodies and mugs with custom print"}
        </h1>
        <ProductsSection />
      </div>
      <Footer />
    </div>
  );
};

export default DesignYourOwn;
