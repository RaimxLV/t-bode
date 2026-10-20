import { afterEach, expect, it, vi } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { GaPageviews } from "@/components/GaPageviews";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  delete document.documentElement.dataset.analyticsPath;
  delete document.documentElement.dataset.analyticsTitle;
  delete window.gtag;
});

it("waits for the resolved product title instead of the previous page", () => {
  vi.useFakeTimers();
  const gtag = vi.fn();
  window.gtag = gtag;
  document.title = "Previous home page";
  render(<MemoryRouter initialEntries={["/produkti/example?email=private@example.test#token"]}><GaPageviews /></MemoryRouter>);
  act(() => vi.runAllTimers());
  expect(gtag.mock.calls.filter((call) => call[0] === "event")).toHaveLength(0);
  act(() => {
    document.documentElement.dataset.analyticsPath = "/produkti/example";
    document.documentElement.dataset.analyticsTitle = "Actual product | T-Bode";
    window.dispatchEvent(new Event("tbode:seo-ready"));
    vi.runAllTimers();
  });
  const events = gtag.mock.calls.filter((call) => call[0] === "event");
  expect(events).toHaveLength(1);
  expect(events[0][2]).toMatchObject({ page_title: "Actual product | T-Bode", page_path: "/produkti/example", send_to: "G-09YMNHC0BF" });
  expect(events[0][2].page_location).not.toContain("email=");
  act(() => {
    window.dispatchEvent(new Event("tbode:seo-ready"));
    vi.runAllTimers();
  });
  expect(gtag.mock.calls.filter((call) => call[0] === "event")).toHaveLength(1);
});

it("never sends a private checkout page_view", () => {
  vi.useFakeTimers();
  const gtag = vi.fn();
  window.gtag = gtag;
  render(<MemoryRouter initialEntries={["/checkout?email=private@example.test"]}><GaPageviews /></MemoryRouter>);
  act(() => vi.runAllTimers());
  expect(gtag.mock.calls.filter((call) => call[0] === "event")).toHaveLength(0);
  expect(gtag.mock.calls[0][1].page_location).not.toContain("checkout");
});