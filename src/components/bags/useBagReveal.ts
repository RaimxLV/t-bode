import { useEffect, useRef } from "react";

/** One-shot entrance; offscreen/hidden animations pause without scroll handlers. */
export function useBagReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node || !window.IntersectionObserver) return;
    let intersecting = false;
    const visibility = () => { node.dataset.paused = String(!intersecting || document.hidden); };
    const observer = new IntersectionObserver(([entry]) => {
      intersecting = entry.isIntersecting;
      if (intersecting) node.dataset.seen = "true";
      visibility();
    }, { threshold: 0.12 });
    observer.observe(node);
    document.addEventListener("visibilitychange", visibility);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", visibility); };
  }, []);
  return ref;
}