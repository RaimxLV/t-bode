import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import ProductDetail from "@/pages/ProductDetail";

const fixtures = vi.hoisted(() => {
  const base = { description: "", category: "shirts", sizes: ["S", "M", "L"], customizable: true, in_stock: true, gallery_images: [], showcase_images: [], image_url: "/shirt.png", price: 18.9 };
  return {
    products: {
      stanley: { ...base, id: "stanley-id", slug: "stanley", name: "Stanley Stella", color_variants: [{ name: "Aloe", hex: "#aaaaaa", images: ["/aloe-1.png", "/aloe-2.png"] }, { name: "Black", hex: "#000000", images: ["/black.png"] }] },
      fanu: { ...base, id: "fanu-id", slug: "fanu", name: "T-krekls FANU", color_variants: [{ name: "Burgundy", hex: "#990000", sizes: ["S"], images: ["/burgundy.png"] }, { name: "White", hex: "#ffffff", images: ["/white.png"] }] },
    },
  };
});
vi.mock("@/hooks/useProducts", () => ({
  useProductBySlug: (slug: keyof typeof fixtures.products) => ({ data: fixtures.products[slug], isLoading: false }),
  getProductName: (p: { name: string }) => p.name,
  getProductDescription: () => "",
}));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: "lv" } }) }));
vi.mock("@/context/CartContext", () => ({ useCart: () => ({ addItem: vi.fn() }) }));
vi.mock("@/lib/zakeke-loader", () => ({ prefetchZakeke: vi.fn() }));
vi.mock("@/lib/zakeke", () => ({ getZakekeProductCode: () => "code", buildZakekeVariantCodes: () => ({}) }));
vi.mock("@/components/Navbar", () => ({ Navbar: () => null }));
vi.mock("@/components/Footer", () => ({ Footer: () => null }));
vi.mock("@/components/Seo", () => ({ Seo: () => null }));
vi.mock("@/components/WishlistButton", () => ({ WishlistButton: () => null }));
vi.mock("@/components/RelatedProducts", () => ({ RelatedProducts: () => null }));
vi.mock("@/components/LifestyleGallery", () => ({ LifestyleGallery: () => null }));
vi.mock("@/components/ShowcaseGallery", () => ({ ShowcaseGallery: () => null }));
vi.mock("@/components/PricingExplainer", () => ({ PricingExplainer: () => null }));
vi.mock("@/components/ImageLightbox", () => ({ ImageLightbox: () => null }));
vi.mock("@/components/ZakekeDesigner", () => ({ ZakekeDesigner: () => null }));
vi.mock("@/components/BulkSizeMatrixDialog", () => ({ BulkSizeMatrixDialog: () => null }));

function Navigation() {
  const navigate = useNavigate();
  return <><button onClick={() => navigate("/produkti/stanley")}>Go Stanley</button><button onClick={() => navigate("/produkti/fanu")}>Go FANU</button></>;
}
function App() {
  return <MemoryRouter initialEntries={["/produkti/stanley"]}><Navigation /><Routes><Route path="/produkti/:slug" element={<ProductDetail />} /></Routes></MemoryRouter>;
}
const choose = (name: string) => fireEvent.click(screen.getAllByRole("button", { name, exact: true })[0]);
const color = () => screen.getAllByText(/^productDetail.color/)[0].textContent;
const quantity = () => screen.getAllByRole("button", { name: "Palielināt daudzumu" })[0].previousElementSibling?.textContent;
const mainImage = () => screen.getAllByRole("img").find((img) => img.className.includes("max-h"))?.getAttribute("src");
afterEach(cleanup);

it("resets color, restricted size, image and quantity on same-component product navigation in both directions", () => {
  render(<App />);
  expect(color()).toBe("productDetail.color — Aloe");
  choose("M");
  choose("Palielināt daudzumu");
  expect(quantity()).toBe("2");
  choose("Go FANU");
  expect(color()).toBe("productDetail.color — Burgundy");
  expect(quantity()).toBe("1");
  expect(screen.getAllByRole("button", { name: "S", exact: true })[0].className).toContain("bg-primary/10");
  choose("White");
  choose("L");
  choose("Go Stanley");
  expect(color()).toBe("productDetail.color — Aloe");
  expect(screen.getAllByRole("button", { name: "M", exact: true })[0].className).toContain("bg-primary/10");
});

it("retains same-product customer color, size and quantity on a new fetched object", () => {
  const view = render(<App />);
  choose("Black");
  choose("L");
  choose("Palielināt daudzumu");
  fixtures.products.stanley = { ...fixtures.products.stanley };
  view.rerender(<App />);
  expect(color()).toBe("productDetail.color — Black");
  expect(quantity()).toBe("2");
  expect(screen.getAllByRole("button", { name: "L", exact: true })[0].className).toContain("bg-primary/10");
});

it("closes the previous product's personalization chooser on product navigation", () => {
  render(<App />);
  choose("productDetail.customizeDesign");
  expect(screen.getByRole("dialog")).toBeTruthy();
  choose("Go FANU");
  expect(screen.queryByRole("dialog")).toBeNull();
});