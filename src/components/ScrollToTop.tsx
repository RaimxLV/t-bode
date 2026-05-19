import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export const ScrollToTop = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      // Defer to next tick so the target section has mounted.
      const id = hash.slice(1);
      const tryScroll = (attempt = 0) => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        } else if (attempt < 10) {
          setTimeout(() => tryScroll(attempt + 1), 100);
        }
      };
      tryScroll();
      return;
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
};
