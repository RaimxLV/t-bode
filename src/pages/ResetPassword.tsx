import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, ArrowLeft, CheckCircle2 } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import logo from "@/assets/logo.svg";

const passwordSchema = z.object({
  password: z.string().min(6, "Parolei jābūt vismaz 6 simbolus garai").max(100),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, { message: "Paroles nesakrīt", path: ["confirm"] });

const ResetPassword = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [validSession, setValidSession] = useState(false);
  const [checking, setChecking] = useState(true);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        // Flow 1: Newer Supabase — query params with token_hash + type=recovery
        const url = new URL(window.location.href);
        const tokenHash = url.searchParams.get("token_hash");
        const type = url.searchParams.get("type");
        const code = url.searchParams.get("code");

        if (tokenHash && type === "recovery") {
          const { error } = await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });
          if (!error && mounted) {
            setValidSession(true);
            window.history.replaceState({}, "", "/reset-password");
            setChecking(false);
            return;
          }
        }

        // Flow 2: PKCE — ?code=... exchange
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error && mounted) {
            setValidSession(true);
            window.history.replaceState({}, "", "/reset-password");
            setChecking(false);
            return;
          }
        }

        // Flow 3: Implicit — hash with access_token + type=recovery
        if (window.location.hash && window.location.hash.includes("access_token")) {
          const hash = new URLSearchParams(window.location.hash.slice(1));
          const accessToken = hash.get("access_token");
          const refreshToken = hash.get("refresh_token");
          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (!error && mounted) {
              setValidSession(true);
              window.history.replaceState({}, "", "/reset-password");
              setChecking(false);
              return;
            }
          }
        }

        // Fallback: existing session (e.g. PASSWORD_RECOVERY already fired)
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          if (session) setValidSession(true);
          setChecking(false);
        }
      } catch {
        if (mounted) setChecking(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        if (mounted) setValidSession(true);
      }
    });

    init();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = passwordSchema.safeParse(form);
    if (!result.success) {
      const fe: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const f = err.path[0] as string;
        if (!fe[f]) fe[f] = err.message;
      });
      setErrors(fe);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: form.password });
      if (error) throw error;
      setDone(true);
      toast.success(t("auth.passwordUpdated", "Parole veiksmīgi nomainīta!"));
      setTimeout(() => navigate("/auth"), 2000);
    } catch (error: any) {
      toast.error(error.message || t("auth.authError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-black text-white flex flex-col">
      <div className="flex items-center justify-between p-4 sm:p-6">
        <button
          onClick={() => navigate("/auth")}
          className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm font-body"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("checkout.back", "Atpakaļ")}
        </button>
        <a href="/" className="flex items-center">
          <img src={logo} alt="T-Bode" className="h-7 sm:h-8" />
        </a>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 pb-8 pt-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-6">
            <h1 className="text-3xl sm:text-4xl font-display tracking-wide">
              {t("auth.resetPasswordTitle", "Jauna parole")}
            </h1>
            <p className="text-sm text-white/60 font-body mt-2">
              {t("auth.resetPasswordSubtitle", "Ievadi savu jauno paroli")}
            </p>
          </div>

          <div className="bg-white/[0.04] border border-white/10 backdrop-blur-sm rounded-2xl p-5 sm:p-6 shadow-2xl">
            {done ? (
              <div className="text-center py-6">
                <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-3" />
                <p className="font-body text-white/80">
                  {t("auth.passwordUpdated", "Parole veiksmīgi nomainīta!")}
                </p>
              </div>
            ) : !validSession ? (
              <div className="text-center py-6 space-y-4">
                <p className="text-sm text-white/70 font-body">
                  {t("auth.invalidResetLink", "Nederīgs vai novecojis links. Lūdzu pieprasi jaunu paroles atjaunošanas e-pastu.")}
                </p>
                <Button
                  onClick={() => navigate("/auth")}
                  className="w-full font-body text-white border-0"
                  style={{ background: "var(--gradient-brand)" }}
                >
                  {t("auth.backToLogin", "Atpakaļ uz pieslēgšanos")}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                <div>
                  <Label htmlFor="password" className="font-body text-sm text-white/80">
                    {t("auth.newPassword", "Jaunā parole")}
                  </Label>
                  <div className="relative mt-1.5">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className={`pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-primary ${errors.password ? "border-destructive" : ""}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-destructive mt-1 font-body">{errors.password}</p>}
                </div>
                <div>
                  <Label htmlFor="confirm" className="font-body text-sm text-white/80">
                    {t("auth.confirmPassword", "Apstiprini paroli")}
                  </Label>
                  <div className="relative mt-1.5">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <Input
                      id="confirm"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={form.confirm}
                      onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                      className={`pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-primary ${errors.confirm ? "border-destructive" : ""}`}
                    />
                  </div>
                  {errors.confirm && <p className="text-xs text-destructive mt-1 font-body">{errors.confirm}</p>}
                </div>
                <Button
                  type="submit"
                  className="w-full font-body font-semibold py-6 mt-2 text-base text-white border-0 hover:opacity-90 transition-opacity"
                  style={{ background: "var(--gradient-brand)" }}
                  disabled={loading}
                >
                  {loading ? t("auth.loading") : t("auth.updatePassword", "Atjaunot paroli")}
                </Button>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ResetPassword;
