export type Product = {
  id: string;
  name: string;
  price: number;
  image: string;
  category: "t-shirts" | "hoodies" | "mugs" | "bags" | "kids";
  slug: string;
};

export const products: Product[] = [
  {
    id: "1",
    name: "Unisex Iconic",
    price: 12.9,
    image: "https://www.mml.s-host.net/t-bode/wp-content/uploads/2026/02/sieviete.jpg",
    category: "t-shirts",
    slug: "unisex-iconic",
  },
  {
    id: "2",
    name: "Unisex Hoodie",
    price: 29.9,
    image: "https://www.mml.s-host.net/t-bode/wp-content/uploads/2026/02/hoodijs.jpg",
    category: "hoodies",
    slug: "unisex-hoodie",
  },
  {
    id: "3",
    name: "The Unisex Dry-Handfeel Heavyweight",
    price: 19.9,
    image: "https://www.mml.s-host.net/t-bode/wp-content/uploads/2026/02/krekls.jpg",
    category: "t-shirts",
    slug: "unisex-dry-handfeel-heavyweight",
  },
  {
    id: "4",
    name: "T-shirt Kids",
    price: 5.9,
    image: "https://www.mml.s-host.net/t-bode/wp-content/uploads/2026/02/unnamed-4-500x500.jpg",
    category: "kids",
    slug: "t-shirt-kids",
  },
  {
    id: "5",
    name: "Sweatshirt Without a Hood",
    price: 19.9,
    image: "https://www.mml.s-host.net/t-bode/wp-content/uploads/2026/02/dzemperis.jpg",
    category: "hoodies",
    slug: "sweatshirt-without-hood",
  },
  {
    id: "6",
    name: "Organic Cotton T-shirt",
    price: 12.9,
    image: "https://www.mml.s-host.net/t-bode/wp-content/uploads/2026/02/skatebord-500x500.jpg",
    category: "t-shirts",
    slug: "organic-cotton-t-shirt",
  },
  {
    id: "7",
    name: "White Mug 300ml",
    price: 9.9,
    image: "https://www.mml.s-host.net/t-bode/wp-content/uploads/2026/02/Gemini_Generated_Image_okd57sokd57sokd5-500x500.png",
    category: "mugs",
    slug: "white-mug-300ml",
  },
  {
    id: "8",
    name: "Mug with Gold/Silver Rim 300ml",
    price: 12.9,
    image: "https://www.mml.s-host.net/t-bode/wp-content/uploads/2026/02/Gemini_Generated_Image_2nezwg2nezwg2nez-500x500.png",
    category: "mugs",
    slug: "mug-gold-silver-rim",
  },
  {
    id: "9",
    name: "Large Mug 450ml",
    price: 12.9,
    image: "https://www.mml.s-host.net/t-bode/wp-content/uploads/2026/02/unnamed-2-500x500.jpg",
    category: "mugs",
    slug: "large-mug-450ml",
  },
  {
    id: "10",
    name: "DUO Two-Tone Mug 300ml",
    price: 10.9,
    image: "https://www.mml.s-host.net/t-bode/wp-content/uploads/2026/02/Gemini_Generated_Image_4u1spb4u1spb4u1s-500x500.png",
    category: "mugs",
    slug: "duo-two-tone-mug",
  },
  {
    id: "11",
    name: "Cotton Bag",
    price: 3.9,
    image: "https://www.mml.s-host.net/t-bode/wp-content/uploads/2025/12/balta-1-500x500.png",
    category: "bags",
    slug: "cotton-bag",
  },
  {
    id: "12",
    name: "Color-Changing Mug (MAGIC)",
    price: 10.9,
    image: "https://www.mml.s-host.net/t-bode/wp-content/uploads/2026/02/unnamed-3-500x500.jpg",
    category: "mugs",
    slug: "color-changing-mug-magic",
  },
  {
    id: "13",
    name: "Baby Bodysuits",
    price: 9.9,
    image: "https://www.mml.s-host.net/t-bode/wp-content/uploads/2025/12/bodijs.jpg",
    category: "kids",
    slug: "baby-bodysuits",
  },
];

export const categories = [
  { id: "all", label: "All Products" },
  { id: "t-shirts", label: "T-Shirts" },
  { id: "hoodies", label: "Hoodies & Sweatshirts" },
  { id: "mugs", label: "Mugs" },
  { id: "bags", label: "Bags" },
  { id: "kids", label: "Kids" },
] as const;

export const stores = [
  {
    name: "AKROPOLE ALFA",
    phone: "+371 25 486 124",
    email: "alfa@t-bode.lv",
    image: "https://www.mml.s-host.net/t-bode/wp-content/uploads/2026/02/veikals-3-1024x789.jpg",
  },
  {
    name: "T/C DOMINA",
    phone: "+371 67 130 030",
    email: "domina@t-bode.lv",
    image: "https://www.mml.s-host.net/t-bode/wp-content/uploads/2026/02/veikals-3-1024x789.jpg",
  },
  {
    name: "T/C ORIGO",
    phone: "+371 28 603 383",
    email: "origo@t-bode.lv",
    image: "https://www.mml.s-host.net/t-bode/wp-content/uploads/2026/02/veikals2-1024x789.jpg",
  },
  {
    name: "T/C AKROPOLE",
    phone: "+371 20 219 844",
    email: "akropole@t-bode.lv",
    image: "https://www.mml.s-host.net/t-bode/wp-content/uploads/2026/02/veikals-1-1024x789.jpg",
  },
];
