import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

export type UploadedDesign = { id: string; name: string; url: string; createdAt: string };

const imageTypes: Record<string, string> = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
  webp: "image/webp", svg: "image/svg+xml",
};

export function DesignImageUpload({ disabled, onUploaded }: {
  disabled?: boolean;
  onUploaded: (design: UploadedDesign) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadingRef = useRef(false);
  const [uploading, setUploading] = useState(false);

  async function upload(file: File) {
    if (uploadingRef.current || disabled) return;
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    const contentType = imageTypes[extension];
    if (!contentType || (file.type && file.type !== contentType)) {
      toast.error("Izvēlies PNG, JPG, WebP vai SVG attēlu.");
      return;
    }
    uploadingRef.current = true;
    setUploading(true);
    const bucket = supabase.storage.from("design-library");
    let uploadedPath: string | null = null;
    try {
      const path = `uncat/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await bucket.upload(path, file, { contentType, upsert: false });
      if (uploadError) throw uploadError;
      uploadedPath = path;
      const name = file.name.replace(/\.[^.]+$/, "").trim() || "Mans dizains";
      const { data, error } = await supabase.from("design_library").insert({
        name, file_path: path, file_size: file.size, category_id: null, tags: [],
      }).select("id,name,created_at").single();
      if (error) throw error;
      if (!data) throw new Error("Dizains netika saglabāts.");
      uploadedPath = null;
      onUploaded({ id: data.id, name: data.name, createdAt: data.created_at,
        url: bucket.getPublicUrl(path).data.publicUrl });
      toast.success("Attēls augšupielādēts un izvēlēts.");
    } catch {
      if (uploadedPath) {
        try { await bucket.remove([uploadedPath]); } catch { /* Preserve the original upload error. */ }
      }
      toast.error("Neizdevās saglabāt attēlu. Mēģini vēlreiz.");
    } finally {
      uploadingRef.current = false;
      setUploading(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}>
        {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
        {uploading ? "Augšupielādē…" : "Augšupielādēt savu attēlu"}
      </Button>
      <input ref={inputRef} type="file" className="hidden" aria-label="Augšupielādēt savu dizainu"
        accept="image/png,image/jpeg,image/webp,image/svg+xml,.png,.jpg,.jpeg,.webp,.svg"
        disabled={disabled || uploading}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void upload(file);
        }} />
    </>
  );
}