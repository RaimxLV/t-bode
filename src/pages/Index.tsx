import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { AboutSection } from "@/components/AboutSection";
import { ProductsSection } from "@/components/ProductsSection";
import { OurCollectionSection } from "@/components/OurCollectionSection";
import { GallerySection } from "@/components/GallerySection";
import { ContactSection } from "@/components/ContactSection";
import { StoresSection } from "@/components/StoresSection";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection />
      <AboutSection />
      <ProductsSection />
      <OurCollectionSection />
      <GallerySection />
      <ContactSection />
      <StoresSection />
      <Footer />
    </div>
  );
};

export default Index;
