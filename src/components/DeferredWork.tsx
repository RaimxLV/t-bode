import { useEffect, useRef, useState, type ReactNode } from "react";

/** Reserve the existing frame, but don't initialize expensive offscreen work. */
export function DeferredWork({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      setVisible(true);
      observer.disconnect();
    }, { rootMargin: "300px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className={className}>{visible ? children : null}</div>;
}