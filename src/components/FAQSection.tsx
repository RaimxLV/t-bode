import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

interface FAQ {
  id: string;
  question_lv: string;
  answer_lv: string;
  question_en: string;
  answer_en: string;
  sort_order: number;
}

export const FAQSection = () => {
  const { t, i18n } = useTranslation();
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFaqs = async () => {
      const { data } = await supabase
        .from("faqs")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      setFaqs(data || []);
      setLoading(false);
    };
    fetchFaqs();
  }, []);

  if (loading || faqs.length === 0) return null;

  const lang = i18n.language === "lv" ? "lv" : "en";

  return (
    <section id="faq" className="py-20 bg-muted/30">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <HelpCircle className="w-6 h-6 text-primary" />
            <h2 className="font-display text-3xl md:text-4xl tracking-tight">
              {t("faq.title")}
            </h2>
          </div>
          <p className="text-muted-foreground font-body">
            {t("faq.subtitle")}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          viewport={{ once: true }}
        >
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={faq.id}
                value={faq.id}
                className="bg-background border border-border rounded-lg px-6 data-[state=open]:shadow-sm transition-shadow"
              >
                <AccordionTrigger className="text-left font-body font-semibold text-sm md:text-base hover:no-underline">
                  {lang === "lv" ? faq.question_lv : (faq.question_en || faq.question_lv)}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground font-body text-sm leading-relaxed">
                  {lang === "lv" ? faq.answer_lv : (faq.answer_en || faq.answer_lv)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};
