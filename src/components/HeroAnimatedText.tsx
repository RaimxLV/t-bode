import { useTranslation } from "react-i18next";

export const HeroAnimatedText = () => {
  const { t } = useTranslation();

  const line1 = t("hero.heroAnim.line1");
  const line2 = t("hero.heroAnim.line2");

  return (
    <div className="mt-4 flex flex-col items-center lg:items-start gap-3 md:gap-5 px-0 pointer-events-none">
      <p className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-display font-extrabold tracking-tight text-white text-center lg:text-left leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
        {line1}
      </p>

      <p className="text-sm sm:text-base md:text-lg lg:text-xl font-body text-white/85 max-w-xl text-center lg:text-left leading-relaxed whitespace-pre-line drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]">
        {line2}
      </p>
    </div>
  );
};
