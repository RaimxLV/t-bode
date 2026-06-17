import { Navbar } from "@/components/Navbar";
import { ProductsSection } from "@/components/ProductsSection";
import { Footer } from "@/components/Footer";
import { Seo } from "@/components/Seo";
import { useTranslation } from "react-i18next";

const DesignYourOwn = () => {
  const { i18n } = useTranslation();
  const isLv = i18n.language === "lv";
  const title = isLv
    ? "Izveido savu T-kreklu dizainu | T-Bode"
    : "Design your own T-shirt | T-Bode";
  const description = isLv
    ? "Dizaina konstruktors t-kreklu, hūdiju un cepuru apdrukai. Augšupielādē attēlu vai tekstu un redzi vizualizāciju. Ražojam Rīgā."
    : "Online design tool for t-shirts, hoodies and caps. Upload your image or text, preview instantly. Printed in Riga.";

  const steps = isLv
    ? [
        { name: "Izvēlies apģērba modeli un krāsu", text: "Atver konstruktoru un izvēlies vēlamo apģērba modeli — t-kreklu, hūdiju vai cepuri — un krāsu." },
        { name: "Augšupielādē savu dizainu, logo vai ieraksti tekstu", text: "Pievieno attēlu, logo vai tekstu, izvēlies fontu un pielāgo izmēru un novietojumu." },
        { name: "Skaties tūlītēju vizualizāciju un noformē pasūtījumu", text: "Apskati reālistisku vizualizāciju, pievieno grozam un noformē pasūtījumu — apdrukāsim Rīgā." },
      ]
    : [
        { name: "Pick a garment model and color", text: "Open the configurator and select your garment — t-shirt, hoodie or cap — and color." },
        { name: "Upload your design, logo or type text", text: "Add an image, logo or text, choose a font, adjust size and placement." },
        { name: "Preview instantly and place your order", text: "Review the live preview, add to cart and place your order — we print it in Riga." },
      ];

  const jsonLd: Record<string, any>[] = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "T-Bode Apdrukas Konstruktors",
      alternateName: "T-Bode Print Designer",
      url: "https://www.t-bode.lv/design",
      applicationCategory: "DesignApplication",
      applicationSubCategory: "OnlineDesignTool",
      operatingSystem: "All",
      browserRequirements: "Requires JavaScript. Works in all modern browsers.",
      inLanguage: ["lv-LV", "en"],
      isAccessibleForFree: true,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "EUR",
      },
      provider: {
        "@type": "Organization",
        name: "T-Bode",
        url: "https://www.t-bode.lv",
      },
      featureList: isLv
        ? [
            "Augšupielādē savu attēlu vai logo",
            "Pievieno tekstu ar dažādiem fontiem",
            "Pielāgo izmēru un novietojumu",
            "Reālistiska tūlītēja vizualizācija",
            "DTF apdruka uz krekliem, hūdijiem, krūzēm, somām",
          ]
        : [
            "Upload your image or logo",
            "Add text with multiple fonts",
            "Adjust size and placement",
            "Realistic instant preview",
            "DTF printing on t-shirts, hoodies, mugs, bags",
          ],
    },
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: isLv ? "Kā izveidot savu T-kreklu dizainu tiešsaistē" : "How to design your own T-shirt online",
      description,
      totalTime: "PT3M",
      estimatedCost: { "@type": "MonetaryAmount", currency: "EUR", value: "0" },
      supply: [
        { "@type": "HowToSupply", name: isLv ? "Tavs attēls, logo vai teksts" : "Your image, logo or text" },
      ],
      tool: [
        { "@type": "HowToTool", name: "T-Bode Apdrukas Konstruktors" },
      ],
      step: steps.map((s, i) => ({
        "@type": "HowToStep",
        position: i + 1,
        name: s.name,
        text: s.text,
        url: `https://www.t-bode.lv/design#step-${i + 1}`,
      })),
    },
  ];

  return (
    <div className="min-h-screen">
      <Seo
        title={title}
        description={description}
        type="website"
        canonical="https://www.t-bode.lv/design"
        breadcrumbs={[
          { name: "T-Bode", url: "https://www.t-bode.lv/" },
          { name: isLv ? "Izveido savu dizainu" : "Design your own", url: "https://www.t-bode.lv/design" },
        ]}
        jsonLd={jsonLd}
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
