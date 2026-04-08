export type ColorVariant = {
  name: string;
  hex: string;
  image?: string;
};

export type Product = {
  id: string;
  name: string;
  price: number;
  image: string;
  images: string[];
  category: "t-shirts" | "hoodies" | "mugs" | "bags" | "kids" | "latvia";
  slug: string;
  description?: string;
  composition?: string;
  careInstructions?: string;
  colors: ColorVariant[];
  sizes: string[];
  customizable: boolean;
};

const BASE = "https://www.mml.s-host.net/t-bode/wp-content/uploads";

export const products: Product[] = [
  // ── T-SHIRTS ──────────────────────────────────────────
  {
    id: "1",
    name: "Unisex Iconic",
    price: 12.9,
    image: `${BASE}/2026/02/sieviete.jpg`,
    images: [
      `${BASE}/2026/02/sieviete.jpg`,
      `${BASE}/2026/02/mid-heather-gray-front.png`,
    ],
    category: "t-shirts",
    slug: "unisex-iconic",
    description: "1×1 rib at neckline. Self-fabric back neck tape. Set-in sleeves. Twin-needle topstitching at sleeve cuffs and hem.",
    composition: "Shell – Single Jersey, 100% Cotton – Organic Combed Ring Spun / Heather Haze: 70% Organic Cotton – 30% Recycled Cotton, Combed Ring Spun – 180.0 GSM. Fabric washed.",
    careInstructions: "Wash similar colours together, no ironing on print, wash and iron inside out.",
    colors: [
      { name: "White", hex: "#FFFFFF" },
      { name: "Black", hex: "#1a1a1a" },
      { name: "Red", hex: "#DC2626" },
      { name: "Aloe", hex: "#7DB46C" },
      { name: "Anthracite", hex: "#383838" },
      { name: "Aqua blue", hex: "#7FDBFF" },
      { name: "Burgundy", hex: "#800020" },
      { name: "Cotton pink", hex: "#FFB7C5" },
      { name: "French navy", hex: "#002147" },
      { name: "Heather gray", hex: "#9CA3AF" },
      { name: "India ink gray", hex: "#4B5563" },
      { name: "Mid heather gray", hex: "#B0B0B0" },
      { name: "Natural raw", hex: "#F5F0E8" },
      { name: "Vintage", hex: "#D4C5A9" },
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
  },
  {
    id: "3",
    name: "The Unisex Dry-Handfeel Heavyweight",
    price: 19.9,
    image: `${BASE}/2026/02/krekls.jpg`,
    images: [
      `${BASE}/2026/02/krekls.jpg`,
      `${BASE}/2026/02/rock.jpg`,
    ],
    category: "t-shirts",
    slug: "unisex-dry-handfeel-heavyweight",
    description: "1×1 rib at neckline. Self-fabric back neck tape. Set-in sleeves. Wide twin-needle topstitching at sleeve cuffs and hem. Slightly textured fabric.",
    composition: "Shell: Single Jersey, 100% Cotton – Organic Open End Carded. Fabric washed.",
    careInstructions: "Wash similar colours together, no ironing on print, wash and iron inside out.",
    colors: [
      { name: "Black", hex: "#1a1a1a" },
      { name: "White", hex: "#FFFFFF" },
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
  },
  {
    id: "6",
    name: "Organic Cotton T-shirt",
    price: 12.9,
    image: `${BASE}/2026/02/skatebord.jpg`,
    images: [
      `${BASE}/2026/02/skatebord.jpg`,
    ],
    category: "t-shirts",
    slug: "organic-cotton-t-shirt",
    description: "1×1 rib at neckline. Self-fabric back neck tape. Set-in sleeves. Twin-needle topstitching at sleeve cuffs and hem.",
    composition: "Shell: Single Jersey, 100% Cotton – Organic Combed Ring Spun / Heather Haze: 70% Organic Cotton – 30% Recycled Cotton, Combed Ring Spun. Fabric washed.",
    careInstructions: "Wash similar colours together, no ironing on print, wash and iron inside out.",
    colors: [
      { name: "White", hex: "#FFFFFF" },
      { name: "Black", hex: "#1a1a1a" },
      { name: "Red", hex: "#DC2626" },
      { name: "Aloe", hex: "#7DB46C" },
      { name: "Anthracite", hex: "#383838" },
      { name: "Aqua blue", hex: "#7FDBFF" },
      { name: "Burgundy", hex: "#800020" },
      { name: "Desert dust", hex: "#C4A882" },
      { name: "Ink gray", hex: "#4B5563" },
      { name: "Khaki", hex: "#806B2A" },
      { name: "Navy", hex: "#002147" },
      { name: "Pink", hex: "#FFB7C5" },
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
  },

  // ── HOODIES / SWEATERS ────────────────────────────────
  {
    id: "2",
    name: "Unisex Hoodie",
    price: 29.9,
    image: `${BASE}/2026/02/hoodijs.jpg`,
    images: [
      `${BASE}/2026/02/hoodijs.jpg`,
      `${BASE}/2026/02/lat-1.jpg`,
      `${BASE}/2026/02/mocha-1.jpg`,
      `${BASE}/2026/02/olive-1.jpg`,
      `${BASE}/2026/02/urban-gray-1.jpg`,
      `${BASE}/2026/02/mineral-blue-1.jpg`,
      `${BASE}/2026/02/light-oxford-1.jpg`,
      `${BASE}/2026/02/indigo-blue-1.jpg`,
      `${BASE}/2026/02/convoy-gray-1.jpg`,
      `${BASE}/2026/02/black-1.jpg`,
      `${BASE}/2026/02/bottle-green-1.jpg`,
      `${BASE}/2026/02/burgundy-1.jpg`,
    ],
    category: "hoodies",
    slug: "unisex-hoodie",
    description: "Modern, sporty style sweatshirt with hood and front pocket. Double-thick and adjustable hood with thick, reinforced cords. Extended cut. MP3 output in the pocket. Made of soft, three-layer polycotton material.",
    composition: "Material: 80% cotton, 20% polyester. Density: 280g.",
    careInstructions: "Wash similar colours together, no ironing on print, wash and iron inside out.",
    colors: [
      { name: "Black", hex: "#1a1a1a", image: `${BASE}/2026/02/black-1.jpg` },
      { name: "Bottle green", hex: "#006A4E", image: `${BASE}/2026/02/bottle-green-1.jpg` },
      { name: "Burgundy", hex: "#800020", image: `${BASE}/2026/02/burgundy-1.jpg` },
      { name: "Convoy gray", hex: "#808080", image: `${BASE}/2026/02/convoy-gray-1.jpg` },
      { name: "Indigo blue", hex: "#3F51B5", image: `${BASE}/2026/02/indigo-blue-1.jpg` },
      { name: "Light oxford", hex: "#D4D0C8", image: `${BASE}/2026/02/light-oxford-1.jpg` },
      { name: "Mineral blue", hex: "#5B9BD5", image: `${BASE}/2026/02/mineral-blue-1.jpg` },
      { name: "Mocha", hex: "#967969", image: `${BASE}/2026/02/mocha-1.jpg` },
      { name: "Olive", hex: "#808000", image: `${BASE}/2026/02/olive-1.jpg` },
      { name: "Urban gray", hex: "#6B6B6B", image: `${BASE}/2026/02/urban-gray-1.jpg` },
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
  },
  {
    id: "5",
    name: "Sweatshirt Without a Hood",
    price: 19.9,
    image: `${BASE}/2026/02/dzemperis.jpg`,
    images: [
      `${BASE}/2026/02/dzemperis.jpg`,
      `${BASE}/2026/02/light-oxford-1-2.jpg`,
    ],
    category: "hoodies",
    slug: "sweatshirt-without-hood",
    description: "A classic style sweater made of soft three-layer polycotton material. Inside 50% polyester, 50% cotton – for warmth and comfort.",
    composition: "Material: 80% cotton, 20% polyester. Density: 280g.",
    careInstructions: "Wash similar colours together, no ironing on print, wash and iron inside out.",
    colors: [
      { name: "Black", hex: "#1a1a1a" },
      { name: "Light oxford", hex: "#D4D0C8", image: `${BASE}/2026/02/light-oxford-1-2.jpg` },
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
  },

  // ── MUGS ──────────────────────────────────────────────
  {
    id: "7",
    name: "White Mug 300ml",
    price: 9.9,
    image: `${BASE}/2026/02/Gemini_Generated_Image_okd57sokd57sokd5.png`,
    images: [
      `${BASE}/2026/02/Gemini_Generated_Image_okd57sokd57sokd5.png`,
      `${BASE}/2026/02/white-1-3.jpg`,
    ],
    category: "mugs",
    slug: "white-mug-300ml",
    description: "Ceramic cylinder mug. Volume 300ml. Unlimited number of colors for printing. Printing area 210×85mm.",
    colors: [
      { name: "White", hex: "#FFFFFF" },
    ],
    sizes: ["300ml"],
  },
  {
    id: "8",
    name: "Mug with Gold/Silver Rim 300ml",
    price: 12.9,
    image: `${BASE}/2026/02/Gemini_Generated_Image_2nezwg2nezwg2nez.png`,
    images: [
      `${BASE}/2026/02/Gemini_Generated_Image_2nezwg2nezwg2nez.png`,
      `${BASE}/2026/02/gold-1-1.jpg`,
    ],
    category: "mugs",
    slug: "mug-gold-silver-rim",
    description: "Ceramic cylinder mug. Volume 300ml. Unlimited number of colors for printing. Printing area 210×85mm.",
    colors: [
      { name: "Gold", hex: "#FFD700", image: `${BASE}/2026/02/gold-1-1.jpg` },
      { name: "Silver", hex: "#C0C0C0" },
    ],
    sizes: ["300ml"],
  },
  {
    id: "9",
    name: "Large Mug 450ml",
    price: 12.9,
    image: `${BASE}/2026/02/unnamed-2.jpg`,
    images: [
      `${BASE}/2026/02/unnamed-2.jpg`,
      `${BASE}/2026/02/450ml-1-1.jpg`,
    ],
    category: "mugs",
    slug: "large-mug-450ml",
    description: "Ceramic cylinder mug. Volume 450ml. Unlimited number of colors for printing. Printing area 210×85mm.",
    colors: [
      { name: "White", hex: "#FFFFFF" },
    ],
    sizes: ["450ml"],
  },
  {
    id: "10",
    name: "DUO Two-Tone Mug 300ml",
    price: 10.9,
    image: `${BASE}/2026/02/Gemini_Generated_Image_4u1spb4u1spb4u1s-500x500.png`,
    images: [
      `${BASE}/2026/02/Gemini_Generated_Image_4u1spb4u1spb4u1s-500x500.png`,
    ],
    category: "mugs",
    slug: "duo-two-tone-mug",
    description: "Ceramic cylinder mug with two-tone design. Volume 300ml. Unlimited number of colors for printing.",
    colors: [
      { name: "Two-tone", hex: "#E0E0E0" },
    ],
    sizes: ["300ml"],
  },
  {
    id: "12",
    name: "Color-Changing Mug (MAGIC)",
    price: 10.9,
    image: `${BASE}/2026/02/unnamed-3.jpg`,
    images: [
      `${BASE}/2026/02/unnamed-3.jpg`,
      `${BASE}/2026/02/magic-1-1.jpg`,
    ],
    category: "mugs",
    slug: "color-changing-mug-magic",
    description: "Ceramic cylinder-shaped mug that changes color when heated – the mug remains white, so the print becomes visible. Volume 300ml. Printing area 210×85mm.",
    colors: [
      { name: "Magic", hex: "#1a1a1a" },
    ],
    sizes: ["300ml"],
  },

  // ── BAGS ──────────────────────────────────────────────
  {
    id: "11",
    name: "Cotton Bag",
    price: 3.9,
    image: `${BASE}/2025/12/balta-1.png`,
    images: [
      `${BASE}/2025/12/balta-1.png`,
      `${BASE}/2026/01/Gemini_Generated_Image_mge42xmge42xmge4.png`,
    ],
    category: "bags",
    slug: "cotton-bag",
    colors: [
      { name: "White", hex: "#FFFFFF" },
      { name: "Black", hex: "#1a1a1a" },
      { name: "Red", hex: "#DC2626" },
      { name: "Blue", hex: "#3B82F6" },
      { name: "Burgundy", hex: "#800020" },
      { name: "Dark blue", hex: "#1e3a5f" },
      { name: "Dark green", hex: "#006400" },
      { name: "Gray", hex: "#9CA3AF" },
      { name: "Green", hex: "#22C55E" },
      { name: "Light blue", hex: "#93C5FD" },
      { name: "Light green", hex: "#86EFAC" },
      { name: "Neutral", hex: "#F5F0E8" },
      { name: "Orange", hex: "#F97316" },
      { name: "Pink", hex: "#FFB7C5" },
      { name: "Purple", hex: "#9333EA" },
      { name: "Yellow", hex: "#EAB308" },
    ],
    sizes: ["One Size"],
  },

  // ── KIDS ──────────────────────────────────────────────
  {
    id: "4",
    name: "T-shirt Kids",
    price: 5.9,
    image: `${BASE}/2026/02/unnamed-4.jpg`,
    images: [
      `${BASE}/2026/02/unnamed-4.jpg`,
      `${BASE}/2026/02/royal-1.jpg`,
      `${BASE}/2026/02/red-1.jpg`,
      `${BASE}/2026/02/orange-1.jpg`,
      `${BASE}/2026/02/lime-1.jpg`,
      `${BASE}/2026/02/blue-atol-1.jpg`,
      `${BASE}/2026/02/kelly-1.jpg`,
      `${BASE}/2026/02/lemon-1.jpg`,
      `${BASE}/2026/02/black-1-1.jpg`,
      `${BASE}/2026/02/white-1.jpg`,
    ],
    category: "kids",
    slug: "t-shirt-kids",
    description: "Single Jersey, 100% cotton. Cut with side seams, narrow 1:1 rib knit neckline hem, inner back neckline with shell fabric tape, fixing shoulder seams.",
    colors: [
      { name: "White", hex: "#FFFFFF", image: `${BASE}/2026/02/white-1.jpg` },
      { name: "Black", hex: "#1a1a1a", image: `${BASE}/2026/02/black-1-1.jpg` },
      { name: "Red", hex: "#DC2626", image: `${BASE}/2026/02/red-1.jpg` },
      { name: "Royal", hex: "#4169E1", image: `${BASE}/2026/02/royal-1.jpg` },
      { name: "Orange", hex: "#F97316", image: `${BASE}/2026/02/orange-1.jpg` },
      { name: "Lime", hex: "#84CC16", image: `${BASE}/2026/02/lime-1.jpg` },
      { name: "Lemon", hex: "#FDE047", image: `${BASE}/2026/02/lemon-1.jpg` },
      { name: "Kelly", hex: "#4CBB17", image: `${BASE}/2026/02/kelly-1.jpg` },
      { name: "Blue atol", hex: "#00CED1", image: `${BASE}/2026/02/blue-atol-1.jpg` },
    ],
    sizes: ["4gadi/110cm", "6gadi/122cm", "8gadi/134cm", "10gadi/146cm", "12gadi/158cm"],
  },
  {
    id: "13",
    name: "Baby Bodysuits",
    price: 9.9,
    image: `${BASE}/2025/12/bodijs.jpg`,
    images: [
      `${BASE}/2025/12/bodijs.jpg`,
      `${BASE}/2026/02/baby.jpg`,
    ],
    category: "kids",
    slug: "baby-bodysuits",
    description: "Children's bodysuit with short sleeves. Side seams, U-shaped neckline with lapels and one button. Three press studs at the bottom. Certified by OEKO-TEX® and GOTS.",
    composition: "100% organic cotton. Weight: 210g.",
    colors: [
      { name: "White", hex: "#FFFFFF" },
      { name: "Blue", hex: "#93C5FD" },
      { name: "Pink", hex: "#FFB7C5" },
    ],
    sizes: ["0-3 months/56-62cm", "3-6 months/62-68cm", "6-9 months/68-74cm", "9-12 months/74-80cm", "12-18 months/80-86cm", "18-24 months/86-92cm"],
  },

  // ── LATVIA COLLECTION (NEW) ───────────────────────────
  {
    id: "14",
    name: "Oak Leaf Shirt",
    price: 18.9,
    image: `${BASE}/2026/02/Ozollapu-krekls-melns-_prieksa_-1890-eur.png`,
    images: [
      `${BASE}/2026/02/Ozollapu-krekls-melns-_prieksa_-1890-eur.png`,
      `${BASE}/2026/02/Ozollapu-krekls-melns-_mugura_1890-eur-1.png`,
      `${BASE}/2026/02/Ozollapu-krekls-melns-_prieksa_-1890-eur-1.png`,
      `${BASE}/2026/02/Ozollapu-krekls-Vintage-white-_mugra_-1890-eur-1.png`,
      `${BASE}/2026/02/Ozollapu-krekls-Vintage-white-_prieksa_-1890-eur-2.png`,
    ],
    category: "latvia",
    slug: "oak-leaf-shirt",
    description: "1×1 rib at neckline. Self-fabric back neck tape. Set-in sleeves. Twin-needle topstitching at sleeve cuffs and hem.",
    composition: "Shell: Single Jersey, 100% Cotton – Organic Combed Ring Spun. Fabric washed.",
    careInstructions: "Wash similar colours together, no ironing on print, wash and iron inside out.",
    colors: [
      { name: "Black", hex: "#1a1a1a", image: `${BASE}/2026/02/Ozollapu-krekls-melns-_prieksa_-1890-eur.png` },
      { name: "Vintage white", hex: "#F5F0E8", image: `${BASE}/2026/02/Ozollapu-krekls-Vintage-white-_prieksa_-1890-eur-2.png` },
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
  },
  {
    id: "15",
    name: "KIDS Fan Shirt",
    price: 14.9,
    image: `${BASE}/2026/02/FANU-bernu-krekls-_bordo_-1490-eur.png`,
    images: [
      `${BASE}/2026/02/FANU-bernu-krekls-_bordo_-1490-eur.png`,
      `${BASE}/2026/02/FANU-bernu-krekls-_bordo_-1490-eur-2.png`,
    ],
    category: "latvia",
    slug: "kids-fan-shirt",
    description: "1×1 rib at neckline. Self-fabric back neck tape. Set-in sleeves. Narrow twin-needle topstitching at sleeve hems.",
    composition: "Shell: Single Jersey, 100% Cotton – Organic Ring Spun Combed. Fabric washed.",
    careInstructions: "Wash similar colours together, no ironing on print, wash and iron inside out.",
    colors: [
      { name: "Burgundy", hex: "#800020" },
    ],
    sizes: ["3-4/98-104cm", "5-6/110-116cm", "7-8/122-128cm", "9-11/134-146cm", "12-13/152-158cm"],
  },
  {
    id: "16",
    name: "LATVIA Shirt with Embroidery",
    price: 19.9,
    image: `${BASE}/2026/02/Gemini_Generated_Image_n6r8ptn6r8ptn6r8.png`,
    images: [
      `${BASE}/2026/02/Gemini_Generated_Image_n6r8ptn6r8ptn6r8.png`,
      `${BASE}/2026/02/LV-krekls-ar-izsuvi-_bordo_1990-eur-1.png`,
      `${BASE}/2026/02/LV-krekls-ar-izsuvi-_desert-dust_-1990-eur-1.png`,
      `${BASE}/2026/02/LV-krekls-ar-izsuvi-_khaki_-1990-eur-1.png`,
    ],
    category: "latvia",
    slug: "latvia-shirt-with-embroidery",
    description: "1×1 rib at neckline. Self-fabric back neck tape. Set-in sleeves. Twin-needle topstitching at sleeve cuffs and hem.",
    composition: "Shell: Single Jersey, 100% Cotton – Organic Combed Ring Spun. Fabric washed.",
    careInstructions: "Wash similar colours together, no ironing on print, wash and iron inside out.",
    colors: [
      { name: "Burgundy", hex: "#800020", image: `${BASE}/2026/02/LV-krekls-ar-izsuvi-_bordo_1990-eur-1.png` },
      { name: "Desert dust", hex: "#C4A882", image: `${BASE}/2026/02/LV-krekls-ar-izsuvi-_desert-dust_-1990-eur-1.png` },
      { name: "Khaki", hex: "#806B2A", image: `${BASE}/2026/02/LV-krekls-ar-izsuvi-_khaki_-1990-eur-1.png` },
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
  },
  {
    id: "17",
    name: "LATVIA Hoodie Three Stars",
    price: 39.9,
    image: `${BASE}/2026/02/Gemini_Generated_Image_1fowuf1fowuf1fow.png`,
    images: [
      `${BASE}/2026/02/Gemini_Generated_Image_1fowuf1fowuf1fow.png`,
      `${BASE}/2026/02/LV-dzemperis-_Tris-Zvaignes_-3990-eur.png`,
    ],
    category: "latvia",
    slug: "latvia-hoodie-three-stars",
    description: "Double-layered hood in self-fabric. Single-jersey back neck tape. Set-in sleeves. 1×1 rib at sleeve cuffs and hem. Kangaroo pocket with 3mm single-needle topstitching.",
    composition: "Shell: Brushed, 100% Cotton – Organic Ring Spun Combed. Panel washed.",
    careInstructions: "Wash similar colours together, no ironing on print, wash and iron inside out.",
    colors: [
      { name: "Heather Grey", hex: "#B0B0B0" },
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
  },
];

export const categories = [
  { id: "all", label: "All Products" },
  { id: "t-shirts", label: "T-Shirts" },
  { id: "hoodies", label: "Hoodies & Sweatshirts" },
  { id: "mugs", label: "Mugs" },
  { id: "bags", label: "Bags" },
  { id: "kids", label: "Kids" },
  { id: "latvia", label: "The Latvia Edit" },
] as const;

export const stores = [
  {
    name: "AKROPOLE ALFA",
    phone: "+371 25 486 124",
    email: "alfa@t-bode.lv",
    image: `${BASE}/2026/02/veikals-3-1024x789.jpg`,
  },
  {
    name: "T/C DOMINA",
    phone: "+371 67 130 030",
    email: "domina@t-bode.lv",
    image: `${BASE}/2026/02/veikals-3-1024x789.jpg`,
  },
  {
    name: "T/C ORIGO",
    phone: "+371 28 603 383",
    email: "origo@t-bode.lv",
    image: `${BASE}/2026/02/veikals2-1024x789.jpg`,
  },
  {
    name: "T/C AKROPOLE",
    phone: "+371 20 219 844",
    email: "akropole@t-bode.lv",
    image: `${BASE}/2026/02/veikals-1-1024x789.jpg`,
  },
];
