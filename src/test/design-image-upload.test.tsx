import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DesignImageUpload } from "@/components/admin/DesignImageUpload";

const mocks = vi.hoisted(() => ({
  upload: vi.fn(), remove: vi.fn(), insert: vi.fn(), single: vi.fn(),
  success: vi.fn(), error: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  storage: { from: () => ({ upload: mocks.upload, remove: mocks.remove,
    getPublicUrl: () => ({ data: { publicUrl: "https://example.test/original.png" } }) }) },
  from: () => ({ insert: mocks.insert }),
} }));

describe("direct mockup design upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.upload.mockResolvedValue({ error: null });
    mocks.remove.mockResolvedValue({ error: null });
    mocks.insert.mockReturnValue({ select: () => ({ single: mocks.single }) });
    mocks.single.mockResolvedValue({ data: { id: "design-1", name: "Kaķītis", created_at: "2026-10-23" }, error: null });
  });
  afterEach(cleanup);

  function choose(file: File) {
    fireEvent.change(screen.getByLabelText("Augšupielādēt savu dizainu"), { target: { files: [file] } });
  }

  it("saves the untouched original and selects the persisted design", async () => {
    const onUploaded = vi.fn();
    render(<DesignImageUpload onUploaded={onUploaded} />);
    const file = new File(["original pixels"], "Kaķītis.png", { type: "image/png" });
    choose(file);
    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith({ id: "design-1", name: "Kaķītis",
      createdAt: "2026-10-23", url: "https://example.test/original.png" }));
    expect(mocks.upload).toHaveBeenCalledWith(expect.stringMatching(/^uncat\/.*\.png$/), file,
      { contentType: "image/png", upsert: false });
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ name: "Kaķītis", file_size: file.size }));
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it("does not create a design when storage upload fails", async () => {
    mocks.upload.mockResolvedValue({ error: new Error("failed") });
    const onUploaded = vi.fn();
    render(<DesignImageUpload onUploaded={onUploaded} />);
    choose(new File(["pixels"], "own.jpg", { type: "image/jpeg" }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(onUploaded).not.toHaveBeenCalled();
  });

  it("cleans up the uploaded file if the library record fails and permits retry", async () => {
    mocks.single.mockResolvedValueOnce({ data: null, error: new Error("failed") });
    const onUploaded = vi.fn();
    render(<DesignImageUpload onUploaded={onUploaded} />);
    const file = new File(["pixels"], "own.png", { type: "image/png" });
    choose(file);
    await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith([mocks.upload.mock.calls[0][0]]));
    expect(onUploaded).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByLabelText("Augšupielādēt savu dizainu")).not.toBeDisabled());
    choose(file);
    await waitFor(() => expect(onUploaded).toHaveBeenCalledTimes(1));
  });

  it("rejects unsupported files without writing anything", () => {
    render(<DesignImageUpload onUploaded={vi.fn()} />);
    choose(new File(["pdf"], "own.pdf", { type: "application/pdf" }));
    expect(mocks.error).toHaveBeenCalled();
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});