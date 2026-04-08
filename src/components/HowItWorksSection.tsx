import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

const TShirtIcon = () => (
  <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <path
      d="M38 25L50 18C52 30 68 30 70 18L82 25L95 40L82 48L78 42V95H42V42L38 48L25 40L38 25Z"
      stroke="url(#grad1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    />
    <path d="M50 18C52 26 68 26 70 18" stroke="url(#grad1)" strokeWidth="2" strokeLinecap="round" />
    <defs>
      <linearGradient id="grad1" x1="25" y1="18" x2="95" y2="95" gradientUnits="userSpaceOnUse">
        <stop stopColor="#DC2626" />
        <stop offset="1" stopColor="#EA580C" />
      </linearGradient>
    </defs>
  </svg>
);

const PencilIcon = () => (
  <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <path
      d="M80 20L95 35L45 85L25 90L30 70L80 20Z"
      stroke="url(#grad2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    />
    <path d="M70 30L85 45" stroke="url(#grad2)" strokeWidth="2" strokeLinecap="round" />
    <path d="M30 70L45 85" stroke="url(#grad2)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 3" />
    <path d="M50 95H95" stroke="url(#grad2)" strokeWidth="2" strokeLinecap="round" />
    <defs>
      <linearGradient id="grad2" x1="25" y1="20" x2="95" y2="95" gradientUnits="userSpaceOnUse">
        <stop stopColor="#DC2626" />
        <stop offset="1" stopColor="#EA580C" />
      </linearGradient>
    </defs>
  </svg>
);

const PaymentIcon = () => (
  <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <rect x="20" y="30" width="80" height="55" rx="6" stroke="url(#grad3)" strokeWidth="2" />
    <line x1="20" y1="48" x2="100" y2="48" stroke="url(#grad3)" strokeWidth="2" />
    <rect x="30" y="58" width="25" height="8" rx="2" stroke="url(#grad3)" strokeWidth="1.5" />
    <circle cx="80" cy="62" r="6" stroke="url(#grad3)" strokeWidth="1.5" />
    <path d="M76 62L79 65L85 59" stroke="url(#grad3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <defs>
      <linearGradient id="grad3" x1="20" y1="30" x2="100" y2="85" gradientUnits="userSpaceOnUse">
        <stop stopColor="#DC2626" />
        <stop offset="1" stopColor="#EA580C" />
      </linearGradient>
    </defs>
  </svg>
);

const DeliveryIcon = () => (
  <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <rect x="30" y="25" width="60" height="70" rx="4" stroke="url(#grad4)" strokeWidth="2" />
    <line x1="30" y1="55" x2="90" y2="55" stroke="url(#grad4)" strokeWidth="1.5" />
    <rect x="42" y="60" width="16" height="20" rx="2" stroke="url(#grad4)" strokeWidth="1.5" />
    <rect x="62" y="60" width="16" height="20" rx="2" stroke="url(#grad4)" strokeWidth="1.5" />
    <path d="M55 38L60 43L70 33" stroke="url(#grad4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    {/* motion lines */}
    <path d="M18 40H26" stroke="url(#grad4)" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    <path d="M15 50H24" stroke="url(#grad4)" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
    <path d="M18 60H26" stroke="url(#grad4)" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
    <defs>
      <linearGradient id="grad4" x1="15" y1="25" x2="90" y2="95" gradientUnits="userSpaceOnUse">
        <stop stopColor="#DC2626" />
        <stop offset="1" stopColor="#EA580C" />
      </linearGradient>
    </defs>
  </svg>
);

const icons = [TShirtIcon, PencilIcon, PaymentIcon, DeliveryIcon];

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
          {/* Connecting line (desktop only) */}
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, delay: 0.5, ease: "easeInOut" }}
            className="hidden md:block absolute top-[90px] left-[12.5%] right-[12.5%] h-[2px] origin-left"
            style={{ background: "linear-gradient(90deg, #DC2626, #EA580C, #DC2626)" }}
          />

          {steps.map((step, i) => {
            const Icon = icons[i];
            return (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.2 }}
                className="relative flex flex-col items-center text-center group"
              >
                {/* Large background number */}
                <span
                  className="absolute -top-2 font-display text-[120px] md:text-[140px] leading-none select-none pointer-events-none"
                  style={{
                    background: "linear-gradient(180deg, rgba(220,38,38,0.12) 0%, rgba(220,38,38,0) 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {step.num}
                </span>

                {/* Icon container */}
                <div className="relative z-10 w-28 h-28 md:w-32 md:h-32 mb-6 transition-transform duration-300 group-hover:scale-110">
                  <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ boxShadow: "0 0 40px rgba(220,38,38,0.2)" }}
                  />
                  <Icon />
                </div>

                {/* Mobile card wrapper */}
                <div className="md:bg-transparent bg-white/[0.03] md:border-0 border border-white/[0.06] rounded-xl md:rounded-none p-4 md:p-0 w-full">
                  <h3 className="font-display text-xl md:text-2xl text-white mb-2 tracking-wide">
                    {t(step.titleKey)}
                  </h3>
                  <p className="text-gray-400 font-body text-sm leading-relaxed max-w-[220px] mx-auto">
                    {t(step.descKey)}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
