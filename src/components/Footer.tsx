import { MapPin, Instagram, Facebook, Mail, Phone, Share2, Link2, Check, Truck } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { toast } from "sonner";
import logo from "@/assets/logo.svg";

export const Footer = () => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const shareUrl = "https://t-bode.lv/";
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8 text-left">
          {/* Brand */}
          <div>
            <img src={logo} alt="T-Bode" className="h-12 mb-4 brightness-0 invert" />
            <p className="text-gray-400 text-sm font-body leading-relaxed mb-6">{t("footer.brandDesc")}</p>
            <div className="flex gap-3 mb-6">
              <a href="https://www.instagram.com/t_bode_lv/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="w-10 h-10 rounded-full border border-gray-700 flex items-center justify-center text-gray-400 hover:text-white hover:border-white transition-colors">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="https://www.facebook.com/tbode.lv" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="w-10 h-10 rounded-full border border-gray-700 flex items-center justify-center text-gray-400 hover:text-white hover:border-white transition-colors">
                <Facebook className="w-4 h-4" />
              </a>
            </div>

            {/* Trust badges */}
            <div className="space-y-2 text-xs font-body text-gray-500 text-left">
              <div className="flex items-center gap-2">
                <Truck className="w-3.5 h-3.5 text-gray-400" />
                <span>{t("footer.trustDelivery", "Piegāde Omniva pakomātos visā Latvijā")}</span>
              </div>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h4 className="font-display text-lg tracking-wider mb-5">{t("footer.shop")}</h4>
            <ul className="space-y-3 text-sm font-body">
              <li><Link to="/design" className="text-gray-400 hover:text-white transition-colors">{t("footer.designYourOwn")}</Link></li>
              <li><Link to="/collection" className="text-gray-400 hover:text-white transition-colors">{t("footer.ourCollection")}</Link></li>
              <li><Link to="/#about" className="text-gray-400 hover:text-white transition-colors">{t("nav.ourStory", "Mūsu stāsts")}</Link></li>
              <li><Link to="/#stores" className="text-gray-400 hover:text-white transition-colors">{t("nav.findStore", "Mūsu veikali")}</Link></li>
              <li><Link to="/#faq" className="text-gray-400 hover:text-white transition-colors">{t("nav.faq", "BUJ")}</Link></li>
            </ul>
          </div>

          {/* Physical stores */}
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
                    <a href={`mailto:${store.detail}`} className="block text-gray-500 text-xs hover:text-white transition-colors break-all">
                      {store.detail}
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Help / Contact */}
          <div>
            <h4 className="font-display text-lg tracking-wider mb-5">{t("footer.help")}</h4>
            <ul className="space-y-3 text-sm font-body mb-6">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-400">{t("footer.officeAddress", "Birojs: Braslas iela 29, ieeja D, Rīga, LV-1084")}</span>
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

            {/* Quick legal links */}
            <ul className="space-y-2 text-sm font-body mb-6">
              <li><Link to="/privacy" className="text-gray-400 hover:text-white transition-colors">{t("footer.privacy")}</Link></li>
              <li><Link to="/terms" className="text-gray-400 hover:text-white transition-colors">{t("footer.terms")}</Link></li>
              <li><Link to="/install" className="text-gray-400 hover:text-white transition-colors">{t("install.shortLabel", "Instalēt lietotni")}</Link></li>
            </ul>

            <div>
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
        <div className="container mx-auto px-4 py-5 flex flex-col items-center gap-1 text-center text-xs text-gray-500 font-body">
          <p>{t("footer.copyright")}</p>
        </div>
      </div>
    </footer>
  );
};
