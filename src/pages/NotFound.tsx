import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Seo } from "@/components/Seo";
import { Home, Search } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Seo title={t("notFound.title")} description={t("notFound.message")} />
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full text-center">
          <div className="font-display text-[8rem] leading-none text-primary mb-4">
            404
          </div>
          <h1 className="font-display text-3xl mb-3 sr-only">{t("notFound.title")}</h1>
          <p className="text-xl text-foreground mb-2">{t("notFound.message")}</p>
          <p className="text-muted-foreground mb-8 text-sm">
            {t("notFound.backHome")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="gap-2">
              <Link to="/">
                <Home className="w-4 h-4" />
                {t("notFound.backHome")}
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="gap-2">
              <Link to="/collection">
                <Search className="w-4 h-4" />
                {t("nav.ourCollection")}
              </Link>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default NotFound;
