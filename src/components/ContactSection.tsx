import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Send, Paperclip, X } from "lucide-react";
import { useTranslation } from "react-i18next";

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

export const ContactSection = () => {
  const [form, setForm] = useState({ name: "", phone: "", message: "" });
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("B2B form:", { ...form, file: file?.name });
  };

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
                  required
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-background border border-border rounded-md px-4 py-2.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium font-body mb-1.5">{t("contact.phone")}</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full bg-background border border-border rounded-md px-4 py-2.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium font-body mb-1.5">
                {t("contact.message")} <span className="text-muted-foreground">({form.message.length}/500)</span>
              </label>
              <textarea
                maxLength={500}
                rows={4}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full bg-background border border-border rounded-md px-4 py-2.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
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
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-md font-body font-semibold text-sm bg-foreground text-background hover:opacity-90 transition-all"
            >
              <Send className="w-4 h-4" />
              {t("contact.submit")}
            </button>
          </motion.form>
        </div>
      </div>
    </section>
  );
};
