import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, User, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import logo from "@/assets/logo.svg";

const loginSchema = z.object({
  email: z.string().trim().email("Ievadiet derīgu e-pasta adresi"),
  password: z.string().min(6, "Parolei jābūt vismaz 6 simbolus garai"),
});

const registerSchema = loginSchema.extend({
  fullName: z.string().trim().min(2, "Vārdam jābūt vismaz 2 simbolus garam").max(100, "Vārds pārāk garš"),
});

type FieldErrors = Record<string, string>;

const Auth = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, isAdmin, adminLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", fullName: "" });
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (!user || adminLoading) return;
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect");
    if (redirect) { navigate(redirect); return; }
    if (isAdmin) navigate("/admin");
    else navigate("/");
  }, [user, isAdmin, adminLoading, navigate]);

  const validate = (): boolean => {
    const schema = isLogin ? loginSchema : registerSchema;
    const result = schema.safeParse(form);
    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as string;
        if (!fieldErrors[field]) fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password });
        if (error) throw error;
        toast.success(t("auth.loginSuccess"));
      } else {
        const { error } = await supabase.auth.signUp({
          email: form.email.trim(), password: form.password,
          options: { data: { full_name: form.fullName.trim() }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success(t("auth.registerSuccess"));
      }
    } catch (error: any) {
      toast.error(error.message || t("auth.authError"));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
      if (result.error) { toast.error(t("auth.googleError")); return; }
      if (result.redirected) return;
      navigate("/");
    } catch {
      toast.error(t("auth.googleError"));
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setForm({ ...form, [field]: value });
    if (errors[field]) setErrors({ ...errors, [field]: "" });
  };

  return (
    <div className="min-h-screen w-full bg-black text-white flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between p-4 sm:p-6">
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm font-body"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("checkout.back", "Atpakaļ")}
        </button>
        <a href="/" className="flex items-center">
          <img src={logo} alt="T-Bode" className="h-7 sm:h-8" />
        </a>
      </div>

      {/* Centered card with bottom padding so cookie banner doesn't overlap */}
      <div className="flex-1 flex items-start justify-center px-4 pb-56 pt-4 sm:pt-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-6">
            <h1 className="text-3xl sm:text-4xl font-display tracking-wide">
              {isLogin ? t("auth.login") : t("auth.register")}
            </h1>
            <p className="text-sm text-white/60 font-body mt-2">
              {isLogin ? t("auth.loginSubtitle") : t("auth.registerSubtitle")}
            </p>
          </div>

          <div className="bg-white/[0.04] border border-white/10 backdrop-blur-sm rounded-2xl p-5 sm:p-6 shadow-2xl">
            <Button
              variant="outline"
              className="w-full mb-4 font-body bg-white text-black hover:bg-white/90 border-0"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {t("auth.continueGoogle")}
            </Button>

            <div className="relative my-5">
              <Separator className="bg-white/10" />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0c0c0c] px-3 text-xs text-white/50 font-body uppercase tracking-wider">
                {t("auth.or")}
              </span>
            </div>

            <form onSubmit={handleEmailAuth} className="flex flex-col gap-4" noValidate>
              {!isLogin && (
                <div>
                  <Label htmlFor="fullName" className="font-body text-sm text-white/80">
                    {t("auth.fullName")}
                  </Label>
                  <div className="relative mt-1.5">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <Input
                      id="fullName"
                      placeholder="Jānis Bērziņš"
                      value={form.fullName}
                      onChange={(e) => updateField("fullName", e.target.value)}
                      className={`pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-primary ${errors.fullName ? "border-destructive" : ""}`}
                    />
                  </div>
                  {errors.fullName && <p className="text-xs text-destructive mt-1 font-body">{errors.fullName}</p>}
                </div>
              )}
              <div>
                <Label htmlFor="email" className="font-body text-sm text-white/80">{t("auth.emailLabel")}</Label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="tavs@epasts.lv"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    className={`pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-primary ${errors.email ? "border-destructive" : ""}`}
                  />
                </div>
                {errors.email && <p className="text-xs text-destructive mt-1 font-body">{errors.email}</p>}
              </div>
              <div>
                <Label htmlFor="password" className="font-body text-sm text-white/80">{t("auth.password")}</Label>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => updateField("password", e.target.value)}
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
              <Button
                type="submit"
                className="w-full font-body font-semibold py-6 mt-2 text-base text-white border-0 hover:opacity-90 transition-opacity"
                style={{ background: "var(--gradient-brand)" }}
                disabled={loading}
              >
                {loading ? t("auth.loading") : isLogin ? t("auth.login") : t("auth.register")}
              </Button>
            </form>

            <p className="text-center text-sm text-white/60 font-body mt-5">
              {isLogin ? t("auth.noAccount") : t("auth.hasAccount")}
              <button
                onClick={() => { setIsLogin(!isLogin); setErrors({}); }}
                className="text-white hover:text-primary font-semibold underline-offset-4 hover:underline transition-colors"
              >
                {isLogin ? t("auth.register") : t("auth.login")}
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
