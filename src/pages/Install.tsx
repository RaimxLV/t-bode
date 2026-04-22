import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { Seo } from "@/components/Seo";
import { Download, Smartphone, Share, PlusSquare, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

const Install = () => {
  const { t } = useTranslation();
  const { canInstall, isIOS, isAndroid, isStandalone, promptInstall } = useInstallPrompt();

  const handleInstall = async () => {
    const outcome = await promptInstall();
    if (outcome === "accepted") toast.success(t("install.installed"));
    else if (outcome === "dismissed") toast.info(t("install.dismissed"));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Seo title={t("install.title")} description={t("install.description")} />
      <Navbar />
      <main className="flex-1 container max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-primary/10 items-center justify-center mb-4">
            <Smartphone className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-display text-4xl mb-2">{t("install.title")}</h1>
          <p className="text-muted-foreground">{t("install.description")}</p>
        </div>

        {isStandalone ? (
          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h2 className="font-semibold text-xl mb-2">{t("install.alreadyInstalled")}</h2>
              <p className="text-muted-foreground">{t("install.alreadyInstalledDesc")}</p>
            </CardContent>
          </Card>
        ) : isIOS ? (
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="font-semibold text-lg">{t("install.iosTitle")}</h2>
              <ol className="space-y-3">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">1</span>
                  <span className="flex items-center gap-2">{t("install.iosStep1")} <Share className="w-4 h-4 inline" /></span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">2</span>
                  <span className="flex items-center gap-2">{t("install.iosStep2")} <PlusSquare className="w-4 h-4 inline" /></span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">3</span>
                  <span>{t("install.iosStep3")}</span>
                </li>
              </ol>
            </CardContent>
          </Card>
        ) : canInstall ? (
          <Card>
            <CardContent className="p-6 text-center space-y-4">
              <p>{t("install.readyDesc")}</p>
              <Button size="lg" onClick={handleInstall} className="gap-2">
                <Download className="w-5 h-5" />
                {t("install.installButton")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="font-semibold text-lg">{isAndroid ? t("install.androidTitle") : t("install.desktopTitle")}</h2>
              <p className="text-muted-foreground text-sm">
                {isAndroid ? t("install.androidManual") : t("install.desktopManual")}
              </p>
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Install;