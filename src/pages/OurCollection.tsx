import { Navbar } from "@/components/Navbar";
import { OurCollectionSection } from "@/components/OurCollectionSection";
import { Footer } from "@/components/Footer";

const OurCollection = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-16">
        <OurCollectionSection />
      </div>
      <Footer />
    </div>
  );
};

export default OurCollection;
