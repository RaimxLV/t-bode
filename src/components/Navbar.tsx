import { useState } from "react";
import { ShoppingCart, Menu, X, User, LogOut } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import logo from "@/assets/logo.svg";

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { totalItems, setIsOpen: setCartOpen } = useCart();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();

  const navLinks = [
    { label: t("nav.ourStory"), href: "/#about" },
    { label: t("nav.designYourOwn"), href: "/design" },
    { label: t("nav.ourCollection"), href: "/collection" },
    { label: t("nav.findStore"), href: "/#stores" },
    { label: t("nav.faq"), href: "/#faq" },
  ];

  const handleNavClick = (href: string) => {
    setIsOpen(false);
    if (href.startsWith("/#")) {
      const sectionId = href.slice(2);
      if (location.pathname === "/") {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
      } else {
        navigate("/" + "#" + sectionId);
      }
    } else {
      navigate(href);
    }
  };

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === "lv" ? "en" : "lv");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md border-b border-white/10" role="navigation" aria-label={t("nav.main", "Galvenā navigācija")}>
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <a
          href="/"
          onClick={(e) => { e.preventDefault(); navigate("/"); }}
          className="flex-shrink-0"
        >
          <img src={logo} alt="T-Bode" className="h-10" />
        </a>

        <div className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <button
              key={link.label}
              onClick={() => handleNavClick(link.href)}
              className="text-sm font-medium text-white/70 hover:text-white transition-colors bg-transparent border-none cursor-pointer"
            >
              {link.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleLanguage}
            className="px-2 py-1 text-xs font-body font-bold text-white/70 hover:text-white transition-colors border border-white/20 rounded"
          >
            {i18n.language === "lv" ? "EN" : "LV"}
          </button>

          {user ? (
            <button
              onClick={signOut}
              className="p-2 text-white/70 hover:text-white transition-colors"
              title={t("auth.signOut", "Izrakstīties")}
              aria-label={t("auth.signOut", "Izrakstīties")}
            >
              <LogOut className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={() => navigate("/auth")}
              className="p-2 text-white/70 hover:text-white transition-colors"
              title={t("auth.login")}
            >
              <User className="w-5 h-5" />
            </button>
          )}
          <button
            className="relative p-2 text-white/70 hover:text-white transition-colors"
            onClick={() => setCartOpen(true)}
            aria-label={t("cart.openCart", "Atvērt grozu") + (totalItems > 0 ? ` (${totalItems})` : "")}
          >
            <ShoppingCart className="w-5 h-5" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-cta-red text-white text-[10px] flex items-center justify-center font-bold">
                {totalItems}
              </span>
            )}
          </button>
          <button
            className="lg:hidden p-2 text-white/70"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? t("nav.closeMenu", "Aizvērt izvēlni") : t("nav.openMenu", "Atvērt izvēlni")}
            aria-expanded={isOpen}
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="lg:hidden bg-black border-t border-white/10">
          <div className="container mx-auto py-4 px-4 flex flex-col gap-4">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => handleNavClick(link.href)}
                className="text-sm font-medium text-white/70 hover:text-white transition-colors py-2 text-left bg-transparent border-none cursor-pointer"
              >
                {link.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};
