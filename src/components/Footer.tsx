import { Lock, MapPin, Instagram, Facebook, Mail, Phone, CreditCard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.svg";

export const Footer = () => {
  const navigate = useNavigate();

  return (
    <footer className="bg-[#000000] text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          {/* Column 1 — Brand */}
          <div>
            <img src={logo} alt="T-Bode" className="h-12 mb-4 brightness-0 invert" />
            <p className="text-gray-400 text-sm font-body leading-relaxed mb-6">
              SIA Ervitex — personalizētu apģērbu un aksesuāru ražotājs Latvijā. Izveido savu unikālo dizainu vai izvēlies no mūsu kolekcijas.
            </p>
            <div className="flex gap-3">
              <a
                href="https://www.instagram.com/t_bode_lv/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full border border-gray-700 flex items-center justify-center text-gray-400 hover:text-white hover:border-white transition-colors"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://www.facebook.com/tbode.lv"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full border border-gray-700 flex items-center justify-center text-gray-400 hover:text-white hover:border-white transition-colors"
              >
                <Facebook className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Column 2 — Shop */}
          <div>
            <h4 className="font-display text-lg tracking-wider mb-5">VEIKALS</h4>
            <ul className="space-y-3 text-sm font-body">
              <li>
                <a href="#products" className="text-gray-400 hover:text-white transition-colors">
                  Dizaini pats
                </a>
              </li>
              <li>
                <a href="#collection" className="text-gray-400 hover:text-white transition-colors">
                  Mūsu kolekcija
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  Jaunumi
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  Dāvanu kartes
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3 — Physical Stores */}
          <div>
            <h4 className="font-display text-lg tracking-wider mb-5">FIZISKIE VEIKALI</h4>
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

          {/* Column 4 — Help */}
          <div>
            <h4 className="font-display text-lg tracking-wider mb-5">PALĪDZĪBA</h4>
            <ul className="space-y-3 text-sm font-body">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-400">Braslas iela 29-2, Rīga, LV-1084</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <a href="mailto:info@t-bode.lv" className="text-gray-400 hover:text-white transition-colors">
                  info@t-bode.lv
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <a href="tel:+37129475227" className="text-gray-400 hover:text-white transition-colors">
                  +371 29 475 227
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800">
        <div className="container mx-auto px-4 py-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-500 font-body">
            © 2026 T-Bode (SIA Ervitex). Visas tiesības aizsargātas.
          </p>

          <div className="flex items-center gap-5 text-xs font-body">
            <a href="#" className="text-gray-500 hover:text-white transition-colors">
              Privātuma politika
            </a>
            <a href="#" className="text-gray-500 hover:text-white transition-colors">
              Noteikumi
            </a>
          </div>

          <div className="flex items-center gap-3">
            {/* Payment placeholders */}
            <span className="text-[10px] font-bold text-gray-500 border border-gray-700 rounded px-2 py-1 font-body">VISA</span>
            <span className="text-[10px] font-bold text-gray-500 border border-gray-700 rounded px-2 py-1 font-body">MC</span>
            <span className="text-[10px] font-bold text-gray-500 border border-gray-700 rounded px-2 py-1 font-body">Apple Pay</span>

            {/* Hidden admin */}
            <button
              className="text-gray-800 hover:text-gray-500 transition-colors p-1 ml-2"
              title="Admin"
              onClick={() => navigate("/admin")}
            >
              <Lock className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
