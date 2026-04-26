import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";
import stepChoose from "@/assets/step-choose.png";
import stepDesign from "@/assets/step-design.png";
import stepPayment from "@/assets/step-payment.png";
import stepDelivery from "@/assets/step-delivery.png";

const images = [stepChoose, stepDesign, stepPayment, stepDelivery];

const steps = [
  { num: "1", titleKey: "about.steps.s1.title", descKey: "about.steps.s1.desc" },
  { num: "2", titleKey: "about.steps.s2.title", descKey: "about.steps.s2.desc" },
  { num: "3", titleKey: "about.steps.s3.title", descKey: "about.steps.s3.desc" },
  { num: "4", titleKey: "about.steps.s4.title", descKey: "about.steps.s4.desc" },
];

export const HowItWorksSection = () => {
  const { t } = useTranslation();

  return (
    <section className="relative py-24 md:py-32 overflow-hidden" style={{ background: "#000" }}>
      {/* Section heading */}
      <div className="container mx-auto px-4 mb-16 md:mb-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl text-white tracking-tight mb-4">
            {t("about.howItWorks", "KĀ TAS STRĀDĀ")}
          </h2>
          <p className="text-gray-400 font-body text-lg max-w-xl mx-auto">
            {t("about.howItWorksDesc", "Četri vienkārši soļi līdz tavam unikālajam produktam")}
          </p>
        </motion.div>
      </div>

      {/* Steps grid */}
      <div className="container mx-auto px-4">
        <div className="relative grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-6">
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.2 }}
              className="relative flex flex-col items-center text-center group"
            >
              {/* Illustration */}
              <div className="relative z-10 w-64 h-64 sm:w-72 sm:h-72 md:w-48 md:h-48 mb-6 transition-transform duration-300 group-hover:scale-105">
                <img
                  src={images[i]}
                  alt={t(step.titleKey)}
                  loading="lazy"
                  width={512}
                  height={512}
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Arrow connector (desktop, between items) */}
              {i < 3 && (
                <div className="hidden md:flex absolute top-24 -right-3 z-20 text-gray-600">
                  <ChevronRight className="w-6 h-6" />
                </div>
              )}

              {/* Mobile card wrapper */}
              <div className="md:bg-transparent bg-white/[0.03] md:border-0 border border-white/[0.06] rounded-xl md:rounded-none p-4 md:p-0 w-full">
                <span className="inline-block font-display text-sm text-red-500 mb-1 tracking-widest">
                  {t("about.steps.step", "SOLIS")} {step.num}
                </span>
                <h3 className="font-display text-xl md:text-2xl text-white mb-2 tracking-wide">
                  {t(step.titleKey)}
                </h3>
                <p className="text-gray-400 font-body text-sm leading-relaxed max-w-[220px] mx-auto">
                  {t(step.descKey)}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
