import { useState } from "react";
import { ShoppingCart, Menu, X, User, LogOut } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "@/assets/logo.svg";

const navLinks = [
  { label: "Design Your Own", href: "/design" },
  { label: "Our Collection", href: "/collection" },
  { label: "Our Story", href: "/#about" },
  { label: "Find a Store", href: "/#stores" },
];

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { totalItems, setIsOpen: setCartOpen } = useCart();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md border-b border-white/10">
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
          {user ? (
            <button
              onClick={signOut}
              className="p-2 text-white/70 hover:text-white transition-colors"
              title="Iziet"
            >
              <LogOut className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={() => navigate("/auth")}
              className="p-2 text-white/70 hover:text-white transition-colors"
              title="Pieslēgties"
            >
              <User className="w-5 h-5" />
            </button>
          )}
          <button
            className="relative p-2 text-white/70 hover:text-white transition-colors"
            onClick={() => setCartOpen(true)}
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
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="lg:hidden bg-background border-t border-border">
          <div className="container mx-auto py-4 px-4 flex flex-col gap-4">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => handleNavClick(link.href)}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2 text-left bg-transparent border-none cursor-pointer"
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
