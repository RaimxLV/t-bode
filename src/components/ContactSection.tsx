import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Send, Paperclip, X, CheckCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { checkRateLimit } from "@/lib/rateLimit";

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

const contactSchema = z.object({
  name: z.string().trim().min(2, "Vārdam jābūt vismaz 2 simbolus garam").max(100),
  email: z.string().trim().email("Ievadiet derīgu e-pasta adresi"),
  phone: z.string().max(20).optional(),
  message: z.string().trim().min(10, "Ziņojumam jābūt vismaz 10 simbolus garam").max(500),
});

type FieldErrors = Record<string, string>;

export const ContactSection = () => {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  // Honeypot — real users never fill this. Bots usually do.
  const [honeypot, setHoneypot] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (selected.size > MAX_FILE_SIZE) {
      setFileError(t("contact.fileTooLarge"));
      setFile(null);
      return;
    }
    setFileError("");
    setFile(selected);
  };

  const updateField = (field: string, value: string) => {
    setForm({ ...form, [field]: value });
    if (errors[field]) setErrors({ ...errors, [field]: "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Honeypot trap — silently "succeed" to fool bots
    if (honeypot.trim() !== "") {
      setSubmitted(true);
      return;
    }

    // Rate limit: max 3 submissions per 10 minutes per browser
    const rl = checkRateLimit({ key: "contact_submit", max: 3, windowMs: 10 * 60 * 1000 });
    if (!rl.allowed) {
      toast.error(t("contact.rateLimited", { seconds: rl.retryAfter ?? 60 }));
      return;
    }

    const result = contactSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as string;
        if (!fieldErrors[field]) fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);

    try {
      let fileUrl: string | null = null;

      // Upload file if attached
      if (file) {
        const ext = file.name.split(".").pop();
        const filePath = `contact/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from("product-images")
          .getPublicUrl(filePath);
        fileUrl = urlData.publicUrl;
      }

      // Save to database
      const { error: insertError } = await supabase
        .from("contact_submissions")
        .insert({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          message: form.message.trim(),
          file_url: fileUrl,
        });

      if (insertError) throw insertError;

      setSubmitted(true);
      setForm({ name: "", email: "", phone: "", message: "" });
      setFile(null);
      toast.success(t("contact.successMessage"));
    } catch (error: any) {
      console.error("Contact form error:", error);
      toast.error(t("contact.errorMessage"));
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <section id="contact" className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center bg-card rounded-xl p-8 md:p-12 border border-border"
            >
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
              <h2 className="text-2xl font-display mb-2">{t("contact.thankYouTitle")}</h2>
              <p className="text-muted-foreground font-body">{t("contact.thankYouDesc")}</p>
              <button
                onClick={() => setSubmitted(false)}
                className="mt-6 text-primary hover:underline font-body text-sm"
              >
                {t("contact.sendAnother")}
              </button>
            </motion.div>
          </div>
        </div>
      </section>
    );
  }

  const FieldError = ({ field }: { field: string }) =>
    errors[field] ? <p className="text-destructive text-xs mt-1 font-body">{errors[field]}</p> : null;

  return (
    <section id="contact" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="text-3xl md:text-4xl font-display mb-4">{t("contact.title")}</h2>
            <p className="text-muted-foreground font-body text-sm md:text-base leading-relaxed" dangerouslySetInnerHTML={{ __html: t("contact.subtitle") }} />
          </motion.div>

          <motion.form
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            onSubmit={handleSubmit}
            className="space-y-5 bg-card rounded-xl p-6 md:p-8 border border-border shadow-sm"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium font-body mb-1.5">{t("contact.firstName")}</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  className={`w-full bg-background border rounded-md px-4 py-2.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring ${errors.name ? "border-destructive" : "border-border"}`}
                />
                <FieldError field="name" />
              </div>
              <div>
                <label className="block text-sm font-medium font-body mb-1.5">{t("contact.email") || "E-pasts"}</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className={`w-full bg-background border rounded-md px-4 py-2.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring ${errors.email ? "border-destructive" : "border-border"}`}
                />
                <FieldError field="email" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium font-body mb-1.5">{t("contact.phone")}</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                className="w-full bg-background border border-border rounded-md px-4 py-2.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="block text-sm font-medium font-body mb-1.5">
                {t("contact.message")} <span className="text-muted-foreground">({form.message.length}/500)</span>
              </label>
              <textarea
                maxLength={500}
                rows={4}
                value={form.message}
                onChange={(e) => updateField("message", e.target.value)}
                className={`w-full bg-background border rounded-md px-4 py-2.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring resize-none ${errors.message ? "border-destructive" : "border-border"}`}
              />
              <FieldError field="message" />
            </div>

            {/* File upload */}
            <div>
              <label className="block text-sm font-medium font-body mb-1.5">{t("contact.fileUpload")}</label>
              <input
                ref={fileRef}
                type="file"
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.ai,.eps,.svg"
              />
              {file ? (
                <div className="flex items-center gap-2 bg-muted rounded-md px-4 py-2.5 text-sm font-body">
                  <Paperclip className="w-4 h-4 text-muted-foreground" />
                  <span className="truncate flex-1">{file.name}</span>
                  <span className="text-muted-foreground text-xs">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                  <button type="button" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-md px-4 py-4 text-sm font-body text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-colors"
                >
                  <Paperclip className="w-4 h-4" />
                  {t("contact.attachFile")}
                </button>
              )}
              {fileError && <p className="text-destructive text-xs mt-1">{fileError}</p>}
              <p className="text-muted-foreground text-xs mt-1">{t("contact.fileHint")}</p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-md font-body font-semibold text-sm bg-foreground text-background hover:opacity-90 transition-all disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {submitting ? t("contact.sending") : t("contact.submit")}
            </button>
          </motion.form>
        </div>
      </div>
    </section>
  );
};