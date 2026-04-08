import { Navbar } from "@/components/Navbar";
import { ProductsSection } from "@/components/ProductsSection";
import { Footer } from "@/components/Footer";

const DesignYourOwn = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-16">
        <ProductsSection />
      </div>
      <Footer />
    </div>
  );
};

export default DesignYourOwn;
