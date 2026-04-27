import { MapPin, Instagram, Facebook, Mail, Phone, Share2, Link2, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { toast } from "sonner";
import logo from "@/assets/logo.svg";

export const Footer = () => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const shareUrl = "https://RaimxLV.github.io/t-bode/";
  const shareText = t("footer.shareText");

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "T-Bode", text: shareText, url: shareUrl });
      } catch {
        /* cancelled */
      }
    } else {
      handleCopyLink();
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success(t("footer.share") + " ✓");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Error");
    }
  };

  const fbShare = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  const xShare = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
  const waShare = `https://wa.me/?text=${encodeURIComponent(shareText + " " + shareUrl)}`;
  const mailShare = `mailto:?subject=${encodeURIComponent("T-Bode")}&body=${encodeURIComponent(shareText + "\n\n" + shareUrl)}`;

  return (
    <footer className="bg-[#000000] text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          <div>
            <img src={logo} alt="T-Bode" className="h-12 mb-4 brightness-0 invert" />
            <p className="text-gray-400 text-sm font-body leading-relaxed mb-6">{t("footer.brandDesc")}</p>
            <div className="flex gap-3">
              <a href="https://www.instagram.com/t_bode_lv/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="w-10 h-10 rounded-full border border-gray-700 flex items-center justify-center text-gray-400 hover:text-white hover:border-white transition-colors">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="https://www.facebook.com/tbode.lv" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="w-10 h-10 rounded-full border border-gray-700 flex items-center justify-center text-gray-400 hover:text-white hover:border-white transition-colors">
                <Facebook className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-display text-lg tracking-wider mb-5">{t("footer.shop")}</h4>
            <ul className="space-y-3 text-sm font-body">
              <li><Link to="/design" className="text-gray-400 hover:text-white transition-colors">{t("footer.designYourOwn")}</Link></li>
              <li><Link to="/collection" className="text-gray-400 hover:text-white transition-colors">{t("footer.ourCollection")}</Link></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">{t("footer.news")}</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">{t("footer.giftCards")}</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-lg tracking-wider mb-5">{t("footer.stores")}</h4>
            <ul className="space-y-3 text-sm font-body">
              {[
                { name: "T/C AKROPOLE", detail: "akropole@t-bode.lv" },
                { name: "T/C DOMINA", detail: "domina@t-bode.lv" },
                { name: "T/C ORIGO", detail: "origo@t-bode.lv" },
                { name: "T/C ALFA", detail: "alfa@t-bode.lv" },
              ].map((store) => (
                <li key={store.name} className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-gray-300 font-medium">{store.name}</span>
                    <p className="text-gray-500 text-xs">{store.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display text-lg tracking-wider mb-5">{t("footer.help")}</h4>
            <ul className="space-y-3 text-sm font-body">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-400">Braslas iela 29-2, Rīga, LV-1084</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <a href="mailto:info@t-bode.lv" className="text-gray-400 hover:text-white transition-colors">info@t-bode.lv</a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <a href="tel:+37129475227" className="text-gray-400 hover:text-white transition-colors">+371 29 475 227</a>
              </li>
            </ul>

            <div className="mt-6">
              <h5 className="text-xs font-body font-semibold tracking-wider text-gray-500 uppercase mb-3">{t("footer.share")}</h5>
              <div className="flex flex-wrap gap-2">
                <button onClick={handleNativeShare} aria-label="Share" className="w-9 h-9 rounded-full border border-gray-700 flex items-center justify-center text-gray-400 hover:text-white hover:border-white transition-colors">
                  <Share2 className="w-4 h-4" />
                </button>
                <a href={fbShare} target="_blank" rel="noopener noreferrer" aria-label="Share on Facebook" className="w-9 h-9 rounded-full border border-gray-700 flex items-center justify-center text-gray-400 hover:text-white hover:border-white transition-colors">
                  <Facebook className="w-4 h-4" />
                </a>
                <a href={xShare} target="_blank" rel="noopener noreferrer" aria-label="Share on X" className="w-9 h-9 rounded-full border border-gray-700 flex items-center justify-center text-gray-400 hover:text-white hover:border-white transition-colors">
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
                <a href={waShare} target="_blank" rel="noopener noreferrer" aria-label="Share on WhatsApp" className="w-9 h-9 rounded-full border border-gray-700 flex items-center justify-center text-gray-400 hover:text-white hover:border-white transition-colors">
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true"><path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-1.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413z"/></svg>
                </a>
                <a href={mailShare} aria-label="Share via email" className="w-9 h-9 rounded-full border border-gray-700 flex items-center justify-center text-gray-400 hover:text-white hover:border-white transition-colors">
                  <Mail className="w-4 h-4" />
                </a>
                <button onClick={handleCopyLink} aria-label="Copy link" className="w-9 h-9 rounded-full border border-gray-700 flex items-center justify-center text-gray-400 hover:text-white hover:border-white transition-colors">
                  {copied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-800">
        <div className="container mx-auto px-4 py-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-500 font-body text-center md:text-left">{t("footer.copyright")}</p>
          <div className="flex items-center gap-5 text-xs font-body">
            <Link to="/privacy" className="text-gray-500 hover:text-white transition-colors">{t("footer.privacy")}</Link>
            <Link to="/terms" className="text-gray-500 hover:text-white transition-colors">{t("footer.terms")}</Link>
            <Link to="/install" className="text-gray-500 hover:text-white transition-colors">{t("install.shortLabel")}</Link>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 font-body">{t("footer.securePayments")}</span>
            <a href="https://stripe.com" target="_blank" rel="noopener noreferrer" aria-label="Stripe" className="text-gray-300 hover:text-white transition-colors">
              <svg viewBox="0 0 60 25" className="h-5 w-auto" fill="currentColor" aria-hidden="true">
                <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.04 1.26-.06 1.48zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.12.87V5.57h3.76l.08 1.02a4.7 4.7 0 0 1 3.23-1.29c2.9 0 5.62 2.6 5.62 7.4 0 5.23-2.7 7.6-5.65 7.6zM40 9.01c-.95 0-1.54.34-1.97.81l.02 6.32c.4.44.98.78 1.95.78 1.52 0 2.54-1.65 2.54-3.97 0-2.26-1.04-3.94-2.54-3.94zM28.24 5.57h4.13v14.44h-4.13V5.57zm0-4.7L32.37 0v3.36l-4.13.88V.88zm-4.32 9.35v9.79H19.8V5.57h3.7l.12 1.22c1-1.77 3.07-1.41 3.62-1.22v3.79c-.52-.17-2.29-.43-3.32.86zm-8.55 4.72c0 2.43 2.6 1.68 3.12 1.46v3.36c-.55.3-1.54.54-2.89.54a4.15 4.15 0 0 1-4.27-4.24l.01-13.17 4.02-.86v3.54h3.14V9.1h-3.13v5.85zm-4.91.7c0 2.97-2.31 4.66-5.73 4.66a11.2 11.2 0 0 1-4.46-.93v-3.93c1.38.75 3.1 1.31 4.46 1.31.92 0 1.58-.24 1.58-1C6.31 13.91 0 14.84 0 10.2 0 7.34 2.18 5.59 5.52 5.59c1.4 0 2.79.21 4.18.76v3.88a9.32 9.32 0 0 0-4.19-1.08c-.86 0-1.39.25-1.39.82 0 1.05 6.34.45 6.34 5.65z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
