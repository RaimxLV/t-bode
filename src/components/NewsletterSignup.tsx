import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Mail, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const NewsletterSignup = () => {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!EMAIL_RE.test(value)) {
      toast.error(t("footer.newsletterInvalid"));
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase
        .from("newsletter_subscribers")
        .insert({ email: value, language: i18n.language || "lv", source: "footer" });
      if (error) {
        // 23505 = unique_violation
        if ((error as any).code === "23505") {
          toast.info(t("footer.newsletterAlready"));
          setDone(true);
        } else {
          throw error;
        }
      } else {
        toast.success(t("footer.newsletterSuccess"));
        setDone(true);
      }
    } catch (err: any) {
      toast.error(t("footer.newsletterError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-2">
      <h5 className="text-xs font-body font-semibold tracking-wider text-gray-500 uppercase mb-3">
        {t("footer.newsletterTitle")}
      </h5>
      <p className="text-xs text-gray-400 font-body mb-3 leading-relaxed">
        {t("footer.newsletterDesc")}
      </p>
      <form onSubmit={submit} className="flex gap-2">
        <div className="relative flex-1">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" aria-hidden />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("footer.newsletterPlaceholder")}
            disabled={loading || done}
            aria-label={t("footer.newsletterPlaceholder")}
            className="w-full pl-9 pr-3 py-2 rounded-md bg-white/5 border border-gray-700 text-xs text-white placeholder:text-gray-500 font-body focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 disabled:opacity-60"
          />
        </div>
        <button
          type="submit"
          disabled={loading || done}
          className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-xs font-display tracking-wider hover:opacity-90 transition-opacity disabled:opacity-60 inline-flex items-center gap-1.5"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : done ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            t("footer.newsletterSubmit")
          )}
        </button>
      </form>
    </div>
  );
};
