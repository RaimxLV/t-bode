import { useState } from "react";
import { Mail } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const emailSchema = z.string().trim().email("Ievadiet derīgu e-pasta adresi");

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultEmail?: string;
}

export const ForgotPasswordDialog = ({ open, onOpenChange, defaultEmail = "" }: Props) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState(defaultEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setError(parsed.error.errors[0].message);
      return;
    }
    setError("");
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(parsed.data, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (err) throw err;
      toast.success(t("auth.resetEmailSent", "Ja konts eksistē, e-pasts ar paroles atjaunošanas linku ir nosūtīts. Pārbaudi arī spam mapi."));
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || t("auth.authError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0c0c0c] border-white/10 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-wide">
            {t("auth.forgotPasswordTitle", "Aizmirsi paroli?")}
          </DialogTitle>
          <DialogDescription className="text-white/60 font-body">
            {t("auth.forgotPasswordSubtitle", "Ievadi savu e-pastu un mēs nosūtīsim linku paroles atjaunošanai.")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2" noValidate>
          <div>
            <Label htmlFor="reset-email" className="font-body text-sm text-white/80">
              {t("auth.emailLabel")}
            </Label>
            <div className="relative mt-1.5">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input
                id="reset-email"
                type="email"
                placeholder="tavs@epasts.lv"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (error) setError(""); }}
                className={`pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-primary ${error ? "border-destructive" : ""}`}
                autoFocus
              />
            </div>
            {error && <p className="text-xs text-destructive mt-1 font-body">{error}</p>}
          </div>
          <Button
            type="submit"
            className="w-full font-body font-semibold py-6 text-base text-white border-0 hover:opacity-90 transition-opacity"
            style={{ background: "var(--gradient-brand)" }}
            disabled={loading}
          >
            {loading ? t("auth.loading") : t("auth.sendResetLink", "Nosūtīt linku")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
