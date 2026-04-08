import React from "react";

interface IconProps {
  className?: string;
  size?: number;
}

export const TShirtIcon: React.FC<IconProps> = ({ className, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M8 2L2 6l3 2v12h14V8l3-2-6-4" />
    <path d="M8 2c0 2 2 4 4 4s4-2 4-4" />
  </svg>
);

export const HoodieIcon: React.FC<IconProps> = ({ className, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M8 2L2 7l3 2v11h14V9l3-2-6-5" />
    <path d="M8 2c0 3 2 5 4 5s4-2 4-5" />
    <path d="M9 13a3 3 0 0 0 6 0" />
    <path d="M12 7v3" />
  </svg>
);

export const MugIcon: React.FC<IconProps> = ({ className, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 6h11v10a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V6z" />
    <path d="M16 9h2a2 2 0 0 1 0 4h-2" />
    <path d="M4 21h13" />
    <path d="M8 3v3M11 3v3" />
  </svg>
);

export const BagIcon: React.FC<IconProps> = ({ className, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 2L3 7v13a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V7l-3-5H6z" />
    <path d="M3 7h18" />
    <path d="M16 11a4 4 0 0 1-8 0" />
  </svg>
);

export const KidsIcon: React.FC<IconProps> = ({ className, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="5" r="3" />
    <path d="M7 10l-2 3h4l-1 8h8l-1-8h4l-2-3" />
  </svg>
);

export const LatviaIcon: React.FC<IconProps> = ({ className, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="5" width="18" height="14" rx="1" />
    <line x1="3" y1="9.5" x2="21" y2="9.5" />
    <line x1="3" y1="14.5" x2="21" y2="14.5" />
  </svg>
);

export const AccessoriesIcon: React.FC<IconProps> = ({ className, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const AllIcon: React.FC<IconProps> = ({ className, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

export const CATEGORY_ICONS: Record<string, React.FC<IconProps>> = {
  all: AllIcon,
  "t-shirts": TShirtIcon,
  hoodies: HoodieIcon,
  mugs: MugIcon,
  bags: BagIcon,
  kids: KidsIcon,
  latvia: LatviaIcon,
  accessories: AccessoriesIcon,
};
