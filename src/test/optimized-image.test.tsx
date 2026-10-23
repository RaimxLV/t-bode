import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { OptimizedImage } from "@/components/OptimizedImage";

afterEach(cleanup);
const original = "https://images.example/storage/v1/object/public/product-images/mug.png";

it("retries the original once, then stops on the local placeholder", () => {
  const { getByRole } = render(<OptimizedImage src={original} alt="Mug" />);
  const image = getByRole("img");
  expect(image.getAttribute("srcset")).toContain("width=1600");
  fireEvent.error(image);
  expect(image.getAttribute("src")).toBe(original);
  expect(image.getAttribute("srcset")).toBeNull();
  fireEvent.error(image);
  expect(image.getAttribute("src")).toBe("/image-unavailable.svg");
  fireEvent.error(image);
  expect(image.getAttribute("src")).toBe("/image-unavailable.svg");
});

it("resets loaded and error state on every source change including returning to a prior color", () => {
  const { getByRole, rerender } = render(<OptimizedImage src={original} alt="Mug" />);
  fireEvent.load(getByRole("img"));
  fireEvent.error(getByRole("img"));
  rerender(<OptimizedImage src={original.replace("mug.png", "red.png")} alt="Mug" />);
  expect(getByRole("img").getAttribute("src")).toContain("render/image");
  rerender(<OptimizedImage src={original} alt="Mug" />);
  expect(getByRole("img").getAttribute("src")).toContain("render/image");
  expect(getByRole("img").className).toContain("opacity-0");
});

it("offers 192px thumbnails for 3x phones and keeps the original source unchanged", () => {
  const { getByRole } = render(<OptimizedImage src={original} alt="Mug" widths={[64, 128, 192, 256]} sizes="64px" />);
  expect(getByRole("img").getAttribute("srcset")).toContain("width=192");
  expect(getByRole("img").getAttribute("sizes")).toBe("64px");
  expect(original).toBe("https://images.example/storage/v1/object/public/product-images/mug.png");
});