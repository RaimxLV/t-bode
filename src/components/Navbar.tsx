import { useState } from "react";
import { ShoppingCart, Menu, X, User, LogOut, Shield } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import logo from "@/assets/logo.svg";

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { totalItems, setIsOpen: setCartOpen } = useCart();
  const { user, signOut, isAdmin, isWhitelisted } = useAuth();
  const showAdmin = isAdmin || isWhitelisted;
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();

  const handleSignOut = async () => {
    await signOut();
    toast.success(t("auth.signedOut", "Veiksmīgi izrakstījies"));
    navigate("/");
  };

  const navLinks = [
    { label: t("nav.ourStory"), href: "/#about" },
    { label: t("nav.designYourOwn"), href: "/design" },
    { label: t("nav.ourCollection"), href: "/collection" },
    { label: t("nav.blog", "Blogs"), href: "/blog" },
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
      <div className="container mx-auto flex items-center justify-between gap-2 h-16 min-w-0 px-2 sm:px-4">
        <a
          href="/"
          onClick={(e) => { e.preventDefault(); navigate("/"); }}
          className="flex-shrink min-w-0 mr-2"
        >
          <img src={logo} alt="T-Bode" className="h-8 sm:h-10 w-auto max-w-[112px] sm:max-w-none" />
        </a>

        <div className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={(e) => { e.preventDefault(); handleNavClick(link.href); }}
              className="text-sm font-medium text-white/70 hover:text-white transition-colors bg-transparent border-none cursor-pointer"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-0.5 sm:gap-3 flex-shrink-0">
          <button
            onClick={toggleLanguage}
            className="px-1.5 sm:px-2 py-1 text-[11px] sm:text-xs font-body font-bold text-white/70 hover:text-white transition-colors border border-white/20 rounded"
          >
            {i18n.language === "lv" ? "EN" : "LV"}
          </button>

{user ? (
            <div className="flex items-center gap-0 sm:gap-0.5">
              {showAdmin && (
                <button
                  onClick={() => navigate("/admin")}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-body font-bold text-white bg-cta-red/90 hover:bg-cta-red rounded transition-colors"
                >
                  <Shield className="w-3.5 h-3.5" />
                  Admin Panelis
                </button>
              )}
              <button
                onClick={() => navigate("/profile")}
                className="p-1.5 sm:p-2 text-white/70 hover:text-white transition-colors"
                title={t("profile.title", "Mans profils")}
                aria-label={t("profile.title", "Mans profils")}
              >
                <User className="w-5 h-5" />
              </button>
              <button
                onClick={handleSignOut}
                className="hidden sm:inline-flex p-1.5 sm:p-2 text-white/70 hover:text-white transition-colors"
                title={t("auth.signOut", "Izrakstīties")}
                aria-label={t("auth.signOut", "Izrakstīties")}
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate("/auth")}
              className="p-1.5 sm:p-2 text-white/70 hover:text-white transition-colors"
              title={t("auth.login")}
              aria-label={t("auth.login")}
            >
              <User className="w-5 h-5" />
            </button>
          )}
          <button
            className="relative p-1.5 sm:p-2 text-white/70 hover:text-white transition-colors"
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
            className="lg:hidden p-1.5 sm:p-2 text-white/70"
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
            {showAdmin && (
              <button
                onClick={() => { setIsOpen(false); navigate("/admin"); }}
                className="flex items-center gap-2 text-sm font-bold text-cta-red hover:text-white transition-colors py-2 text-left bg-transparent border-none cursor-pointer"
              >
                <Shield className="w-4 h-4" />
                Admin Panelis
              </button>
            )}
            {user ? (
              <>
                <button
                  onClick={() => { setIsOpen(false); navigate("/profile"); }}
                  className="flex items-center gap-2 text-sm font-medium text-white/80 hover:text-white transition-colors py-2 text-left bg-transparent border-none cursor-pointer"
                >
                  <User className="w-4 h-4" />
                  {t("profile.title", "Mans profils")}
                </button>
                <button
                  onClick={() => { setIsOpen(false); handleSignOut(); }}
                  className="flex items-center gap-2 text-sm font-medium text-white/80 hover:text-white transition-colors py-2 text-left bg-transparent border-none cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  {t("auth.signOut", "Izrakstīties")}
                </button>
              </>
            ) : (
              <button
                onClick={() => { setIsOpen(false); navigate("/auth"); }}
                className="flex items-center gap-2 text-sm font-medium text-white/80 hover:text-white transition-colors py-2 text-left bg-transparent border-none cursor-pointer"
              >
                <User className="w-4 h-4" />
                {t("auth.login")}
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
