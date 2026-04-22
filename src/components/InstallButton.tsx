import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

/**
 * Compact install button — visible only when install is available
 * (native prompt ready) or on iOS where manual install is possible.
 * Hidden when already running as standalone PWA.
 */
export const InstallButton = ({ variant = "outline" }: { variant?: "outline" | "default" | "ghost" }) => {
  const { t } = useTranslation();
  const { canInstall, isIOS, isStandalone } = useInstallPrompt();

  if (isStandalone) return null;
  if (!canInstall && !isIOS) return null;

  return (
    <Button asChild variant={variant} size="sm" className="gap-2">
      <Link to="/install">
        <Download className="w-4 h-4" />
        {t("install.shortLabel")}
      </Link>
    </Button>
  );
};