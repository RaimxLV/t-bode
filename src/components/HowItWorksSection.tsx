import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ChevronRight, Smartphone, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
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
  const { canInstall, isIOS, isStandalone, promptInstall } = useInstallPrompt();

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

      {/* Install app CTA — sits at the end of the steps */}
      <div className="container mx-auto px-4 mt-14 md:mt-16 flex justify-center">
        {isStandalone ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-body"
            style={{
              background: "hsl(150 30% 18% / 0.5)",
              border: "1px solid hsl(150 35% 35%)",
              color: "hsl(150 35% 75%)",
            }}
          >
            <Check className="w-4 h-4" strokeWidth={2.5} />
            {t("install.alreadyInstalled", "Lietotne instalēta")}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {canInstall ? (
              <button
                onClick={() => promptInstall()}
                className="group inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full text-sm font-body font-medium text-white/90 border border-white/15 bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/25 transition-all duration-300"
              >
                <Smartphone className="w-4 h-4 transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:rotate-[-6deg]" />
                <span>{t("install.simpleCta", "Instalēt lietotni")}</span>
              </button>
            ) : (
              <Link
                to="/install"
                className="group inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full text-sm font-body font-medium text-white/90 border border-white/15 bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/25 transition-all duration-300"
              >
                <Smartphone className="w-4 h-4 transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:rotate-[-6deg]" />
                <span>{t("install.simpleCta", "Instalēt lietotni")}</span>
              </Link>
            )}
          </motion.div>
        )}
      </div>
    </section>
  );
};
