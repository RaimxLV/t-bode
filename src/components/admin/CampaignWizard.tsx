import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, RefreshCw, Star, Wand2, Package, FileText, Eye, X, ArrowLeft, ArrowRight, RotateCcw, Sparkles, CheckCircle2, ExternalLink, Trash2, Download, Heart, Library, Info, Eraser, Upload } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { downloadPrintReadyPng } from "@/lib/printFile";
import { toast } from "sonner";
import { composeMockup } from "@/lib/imageCrop";
import { RichTextEditor } from "./RichTextEditor";
import { BlogInlinePreview } from "./BlogInlinePreview";
import { getOptimizedSrc } from "@/lib/imageOptimization";
import { removeDesignBackground } from "@/lib/removeDesignBackground";

/* ------------ Types ------------ */
type Holiday = { id: string; name_lv: string; month: number; day: number };

type Brief = {
  title_lv?: string;
  tagline_lv?: string;
  description_lv?: string;
  target_audience?: string;
  color_palette?: string[];
  design_ideas?: { title: string; prompt: string; slogan?: string }[];
  product_types?: string[];
  fit_in_frame?: boolean;
};

type Campaign = {
  id: string;
  holiday_id: string | null;
  year: number;
  status: string;
  title: string | null;
  description: string | null;
  brief: Brief | null;
  style?: string | null;
  custom_style_id?: string | null;
  image_size?: string | null;
  preferred_colors?: { r: number; g: number; b: number }[] | null;
  transparent_bg?: boolean | null;
};

type DesignRow = {
  id: string;
  campaign_id: string;
  image_url: string | null;
  prompt: string;
  generation_error: string | null;
  is_primary: boolean;
  product_id: string | null;
  style?: string | null;
  slogan?: string | null;
};

type DesignLinkInfo = {
  designId: string | null;
  baseProductId: string | null;
};

type ColorVariant = { name: string; hex: string; images: string[] };

function summarizeGenerationError(message: string | null | undefined) {
  if (!message) return "Neizdevās uzģenerēt dizainu.";
  const raw = message.replace(/https?:\/\/\S+/g, "").replace(/\s+/g, " ").trim();
  if (/exhausted balance|fal\.ai 403|ideogram 403/i.test(message)) return "Iepriekšējais ģenerators vairs nav pieejams. Spied mēģināt vēlreiz, lai ģenerētu ar jauno modeli.";
  if (/Transparent background is not supported for this model|transparent background/i.test(message)) return "Šim režīmam caurspīdīgs fons nav pieejams. Pārslēdzu uz saderīgu ģenerēšanu — mēģini vēlreiz.";
  if (/bg-remove failed|Failed to load the image|Failed to download the image/i.test(message)) return "Neizdevās iegūt caurspīdīgu fonu. Mēģini vēlreiz.";
  if (/exact string|diacritic|extra letters|Typography is critical/i.test(message)) return "AI nesanāca korekts teksts. Mēģini vēlreiz vai lieto īsāku saukli.";
  if (/timeout|timed out/i.test(message)) return "Ģenerēšana aizņēma pārāk ilgu laiku. Mēģini vēlreiz.";
  return raw.slice(0, 120) || "Neizdevās uzģenerēt dizainu.";
}

type CatalogProduct = {
  id: string;
  name: string;
  name_lv: string | null;
  category: string;
  sizes: string[] | null;
  description: string | null;
  description_lv: string | null;
  color_variants: ColorVariant[];
  image_url: string | null;
  print_area: { x: number; y: number; w: number; h: number } | null;
};

type CampProduct = {
  id: string;
  name: string;
  name_lv: string | null;
  image_url: string | null;
  color_variants: ColorVariant[];
  print_offset_y: number | null;
  print_scale: number | null;
  base_product_id: string | null;
  design_id?: string | null;
};

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  cover_image_url: string | null;
  status: string;
  campaign_id: string | null;
  published_at: string | null;
};

const DEFAULT_PRINT_AREA = { x: 0.3, y: 0.25, w: 0.4, h: 0.45 };

/** Style preset catalog used to guide generated artwork. */
type StyleOpt = { value: string; label: string };
const STYLE_GROUPS: { group: string; options: StyleOpt[] }[] = [
  { group: "Stils", options: [{ value: "digital_illustration", label: "Noklusējums" }] },
];
const STYLE_PRESETS: StyleOpt[] = STYLE_GROUPS.flatMap((g) => g.options);

const IMAGE_SIZES: { value: string; label: string }[] = [
  { value: "square_hd", label: "Kvadrāts HD" },
  { value: "square", label: "Kvadrāts" },
  { value: "portrait_4_3", label: "Portrets 4:3" },
  { value: "portrait_16_9", label: "Portrets 16:9" },
  { value: "landscape_4_3", label: "Ainava 4:3" },
  { value: "landscape_16_9", label: "Ainava 16:9" },
];

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([a-f0-9]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function rgbToHex(c: { r: number; g: number; b: number }): string {
  return "#" + [c.r, c.g, c.b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

function slugify(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "produkts";
}

function splitBaseProductName(name?: string | null) {
  const raw = (name ?? "").trim();
  if (!raw) return { display: "Krekls", model: "Krekls" };

  const compact = raw.replace(/\s+/g, " ").trim();
  const parts = compact.split(/\s+-\s+|\s+—\s+/).map((p) => p.trim()).filter(Boolean);
  const tail = parts[parts.length - 1] ?? compact;
  const hasModelWord = /(stanley|stella|creator|cruiser|blaster|drummer|sparker|changer|radder|rocker|trekker|mover|roller|t-krekls|krekls|hoodie|džemperis|maika)/i.test(tail);
  const model = hasModelWord ? tail : compact;
  return { display: compact, model };
}

function buildDraftProductName(designName: string, baseProductName?: string | null) {
  const cleanDesign = (designName || "Dizains").trim();
  const { model } = splitBaseProductName(baseProductName);
  return `${cleanDesign} - ${model}`;
}

function extractDesignIdFromProductAsset(url?: string | null) {
  if (!url) return null;
  const match = url.match(/\/campaigns\/(?:[^/]+)\/([0-9a-f-]{36})(?:\/|\.)/i);
  return match?.[1] ?? null;
}

function extractDesignLinkFromProductAsset(url?: string | null): DesignLinkInfo {
  if (!url) return { designId: null, baseProductId: null };
  const match = url.match(/\/campaigns\/(?:[^/]+)\/([0-9a-f-]{36})\/([0-9a-f-]{36})(?:\/|\.)/i);
  return {
    designId: match?.[1] ?? null,
    baseProductId: match?.[2] ?? null,
  };
}

function resolveDesignForProduct(product: CampProduct, designs: DesignRow[]) {
  const explicitDesignId = (product as any).design_id ?? null;
  const derivedDesignId =
    explicitDesignId ||
    extractDesignIdFromProductAsset(product.image_url) ||
    extractDesignIdFromProductAsset(product.color_variants?.[0]?.images?.[0]);

  return (
    designs.find((d) => d.id === derivedDesignId && d.image_url) ||
    designs.find((d) => d.product_id === product.id && d.image_url) ||
    designs.find((d) => d.is_primary && d.image_url) ||
    null
  );
}

function resolveBaseProductId(product: CampProduct) {
  return (
    product.base_product_id ||
    extractDesignLinkFromProductAsset(product.image_url).baseProductId ||
    extractDesignLinkFromProductAsset(product.color_variants?.[0]?.images?.[0]).baseProductId ||
    null
  );
}

function holidayExpiryISO(holiday: Holiday | null, year: number): string | null {
  if (!holiday) return null;
  const d = new Date(Date.UTC(year, holiday.month - 1, holiday.day));
  return new Date(d.getTime() - 24 * 3600 * 1000).toISOString();
}

function isoToDateInput(iso: string | null) {
  return iso ? iso.slice(0, 10) : "";
}

/* ------------ Component ------------ */
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string | null;
  onChanged?: () => void;
}

export const CampaignWizard = ({ open, onOpenChange, campaignId, onChanged }: Props) => {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [holiday, setHoliday] = useState<Holiday | null>(null);
  const [designs, setDesigns] = useState<DesignRow[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [campProducts, setCampProducts] = useState<CampProduct[]>([]);
  const [blogPost, setBlogPost] = useState<BlogPost | null>(null);
  const [savedBlogSlug, setSavedBlogSlug] = useState<string | null>(null);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [selectedBases, setSelectedBases] = useState<Set<string>>(new Set());
  const [publishProgress, setPublishProgress] = useState<{ done: number; total: number } | null>(null);
  const [addToCollection, setAddToCollection] = useState(true);
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [success, setSuccess] = useState<{ products: number; blogSlug: string | null; expires: string | null } | null>(null);
  const [styleChoice, setStyleChoice] = useState<string>("digital_illustration");
  const [regenSingleId, setRegenSingleId] = useState<string | null>(null);
  const [regenIdeaIdx, setRegenIdeaIdx] = useState<number | null>(null);
  const [transparentBg, setTransparentBg] = useState<boolean>(false);
  const [customStyleId, setCustomStyleId] = useState<string>("");
  const [imageSize, setImageSize] = useState<string>("square_hd");
  const [preferredColors, setPreferredColors] = useState<{ r: number; g: number; b: number }[]>([]);
  const [usePalette, setUsePalette] = useState<boolean>(false);
  const [modelChoice, setModelChoice] = useState<"auto" | "ideogram" | "recraft" | "flux-pro" | "flux-schnell" | "nano-banana" | "seedream">("auto");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [favoritedIds, setFavoritedIds] = useState<Set<string>>(new Set());

  const load = async () => {
    if (!campaignId) return;
    setLoading(true);
    try {
      const { data: campRaw } = await supabase
        .from("campaigns" as any)
        .select("id, holiday_id, year, status, title, description, brief, style, custom_style_id, image_size, preferred_colors, transparent_bg")
        .eq("id", campaignId)
        .maybeSingle();
      const camp = campRaw as unknown as Campaign | null;
      setCampaign(camp);
      if (camp) {
        setTransparentBg(!!camp.transparent_bg);
        setImageSize(camp.image_size || "square_hd");
        setPreferredColors(Array.isArray(camp.preferred_colors) ? camp.preferred_colors : []);
      }

      // Decide step from status
      if (camp) {
        if (camp.status === "ready_for_review" || camp.status === "generating") setStep(1);
        else if (camp.status === "designs_ready" || camp.status === "generating_designs") setStep(2);
        else setStep(3);
      }

      // Holiday
      let hData: Holiday | null = null;
      if (camp?.holiday_id) {
        const { data: hRaw } = await supabase.from("holidays" as any)
          .select("id, name_lv, month, day")
          .eq("id", camp.holiday_id)
          .maybeSingle();
        hData = (hRaw as unknown as Holiday | null);
        setHoliday(hData);
      }

      // Designs
      const { data: dRaw } = await supabase.from("campaign_designs" as any)
        .select("id, campaign_id, image_url, prompt, generation_error, is_primary, product_id, style, slogan")
        .eq("campaign_id", campaignId)
        .order("created_at");
      const drows = (dRaw as unknown as DesignRow[]) ?? [];
      setDesigns(drows);
      // image_url can be either a storage path (campaign-assets) or already a
      // full http(s) URL (e.g. from fal CDN or design library). Only the
      // storage paths need signing; URLs we use as-is.
      const allUrls = drows.filter((d) => d.image_url).map((d) => d.image_url as string);
      const httpUrls = allUrls.filter((u) => /^https?:\/\//i.test(u));
      const paths = allUrls.filter((u) => !/^https?:\/\//i.test(u));
      const m: Record<string, string> = {};
      httpUrls.forEach((u) => { m[u] = u; });
      if (paths.length) {
        // Make sure the session is fresh — an expired JWT silently produces
        // empty signedUrl entries (bucket RLS depends on auth.uid()).
        await supabase.auth.refreshSession().catch(() => {});
        const { data: signed, error: signErr } = await supabase
          .storage.from("campaign-assets")
          .createSignedUrls(paths, 60 * 60);
        if (signErr) {
          console.warn("[CampaignWizard] createSignedUrls error:", signErr);
        }
        (signed ?? []).forEach((s, i) => {
          if (s.signedUrl) {
            m[paths[i]] = s.signedUrl;
          } else {
            console.warn("[CampaignWizard] no signedUrl for", paths[i], s.error);
          }
        });
      }
      setSignedUrls(m);

      // Catalog (customizable bases)
      const { data: catRaw } = await supabase.from("products")
        .select("id,name,name_lv,category,sizes,description,description_lv,color_variants,image_url,print_area")
        .eq("customizable", true).eq("is_draft", false).order("name");
      const EXCLUDED_CATEGORIES = new Set(["mugs", "bags"]);
      const EXCLUDED_NAME_RE = /bodij/i; // kids bodysuit
      const filteredCat = ((catRaw as any[]) ?? []).filter(
        (p) => !EXCLUDED_CATEGORIES.has((p.category ?? "").toLowerCase()) && !EXCLUDED_NAME_RE.test(p.name ?? "")
      );
      setCatalog(filteredCat.map((p) => ({
        ...p,
        color_variants: Array.isArray(p.color_variants) ? p.color_variants : [],
        print_area: p.print_area ?? null,
      })));

      // Campaign products
      const { data: cpRaw } = await supabase.from("products")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at");
      setCampProducts(((cpRaw as any[]) ?? []).map((p) => ({
        ...p,
        color_variants: Array.isArray(p.color_variants) ? p.color_variants : [],
      })));

      // Blog post (latest for campaign)
      const { data: bpRaw } = await supabase.from("blog_posts")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setBlogPost((bpRaw as any) ?? null);
      setSavedBlogSlug((bpRaw as any)?.slug ?? null);

      // Reload favorites for this campaign so heart icons stay lit on reopen.
      try {
        const { data: favs } = await supabase.storage
          .from("design-library")
          .list(`campaign-favorites/${campaignId}`, { limit: 200 });
        if (favs?.length) {
          // file naming is `${design_id}-${ts}.png` — extract leading UUID
          const ids = new Set<string>();
          for (const f of favs) {
            const m = f.name.match(/^([0-9a-f-]{36})/i);
            if (m) ids.add(m[1]);
          }
          setFavoritedIds(ids);
        } else {
          setFavoritedIds(new Set());
        }
      } catch (_) { /* ignore */ }

      // Defaults
      if (camp && !expiresAt) {
        const iso = holidayExpiryISO(hData, camp.year);
        if (iso) setExpiresAt(iso.slice(0, 10));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && campaignId) {
      setSuccess(null);
      setSelectedBases(new Set());
      load();
    }
    if (!open) {
      setCampaign(null);
      setDesigns([]);
      setCampProducts([]);
      setBlogPost(null);
      setSavedBlogSlug(null);
      setExpiresAt("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, campaignId]);

  const closeAndRefresh = () => {
    onChanged?.();
    onOpenChange(false);
  };

  /* -------- Step 1 actions -------- */
  const regenBrief = async () => {
    if (!campaign) return;
    setBusy("brief");
    try {
      const { data, error } = await supabase.functions.invoke("generate-campaign-brief", { body: { campaign_id: campaign.id } });
      if (error || (data as any)?.error) throw new Error((data as any)?.error ?? error?.message);
      toast.success("Idejas pārģenerētas");
      await load();
    } catch (e: any) { toast.error("Neizdevās: " + e.message); }
    finally { setBusy(null); }
  };

  const regenSingleIdea = async (idx: number, hint?: string) => {
    if (!campaign) return;
    setRegenIdeaIdx(idx);
    try {
      const { data, error } = await supabase.functions.invoke("generate-campaign-brief", {
        body: { campaign_id: campaign.id, idea_index: idx, hint: hint || undefined },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error ?? error?.message);
      toast.success(`Ideja #${idx + 1} pārģenerēta`);
      await load();
    } catch (e: any) {
      toast.error("Neizdevās: " + e.message);
    } finally {
      setRegenIdeaIdx(null);
    }
  };

  const saveBrief = async (newBrief: Brief) => {
    if (!campaign) return;
    const { error } = await supabase
      .from("campaigns" as any)
      .update({ brief: newBrief as any })
      .eq("id", campaign.id);
    if (error) { toast.error("Nesaglabājās: " + error.message); return; }
    setCampaign({ ...campaign, brief: newBrief });
    toast.success("Saglabāts");
  };

  /* -------- Step 2 actions -------- */
  const regenDesigns = async () => {
    if (!campaign) return;
    setBusy("designs");
    toast.info("AI ģenerē dizainus (1-2 min)…");
    try {
      const { data, error } = await supabase.functions.invoke("generate-campaign-designs", {
        body: {
          campaign_id: campaign.id,
          style: styleChoice,
          custom_style_id: null,
          image_size: imageSize,
          colors: usePalette ? preferredColors : [],
          transparent_bg: transparentBg,
          model_override: modelChoice,
        },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error ?? error?.message);
      toast.success("Dizaini pārģenerēti");
      await load();
    } catch (e: any) { toast.error("Neizdevās: " + e.message); }
    finally { setBusy(null); }
  };

  const regenSingleDesign = async (
    designId: string,
    model: "auto" | "ideogram" | "recraft" | "flux-pro" | "flux-schnell" | "nano-banana" | "seedream" = modelChoice,
  ) => {
    if (!campaign) return;
    setRegenSingleId(designId);
    try {
      const { data, error } = await supabase.functions.invoke("generate-campaign-designs", {
        body: {
          campaign_id: campaign.id,
          design_id: designId,
          style: styleChoice,
          custom_style_id: null,
          image_size: imageSize,
          colors: usePalette ? preferredColors : [],
          transparent_bg: transparentBg,
          model_override: model,
        },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error ?? error?.message);
      toast.success("Dizains pārģenerēts");
      await load();
    } catch (e: any) {
      toast.error("Neizdevās: " + e.message);
    } finally {
      setRegenSingleId(null);
    }
  };

  const toggleStar = async (d: DesignRow) => {
    const { error } = await supabase.from("campaign_designs" as any)
      .update({ is_primary: !d.is_primary }).eq("id", d.id);
    if (error) { toast.error(error.message); return; }
    setDesigns((prev) => prev.map((x) => x.id === d.id ? { ...x, is_primary: !x.is_primary } : x));
  };

  /** Copy a generated design into the persistent design_library so it can be reused across campaigns. */
  const saveToLibrary = async (d: DesignRow): Promise<{ id: string; path: string } | null> => {
    if (!d.image_url) { toast.error("Nav bildes"); return null; }
    if (favoritedIds.has(d.id)) { toast.info("Jau bibliotēkā"); return null; }
    try {
      // Download bytes from campaign-assets (private), upload to design-library (public)
      const signed = signedUrls[d.image_url];
      if (!signed) { toast.error("Nav URL"); return null; }
      const res = await fetch(signed);
      if (!res.ok) throw new Error("Nevar lejupielādēt");
      const blob = await res.blob();
      const contentType = blob.type || (d.image_url.match(/\.(svg|png|jpe?g|webp)(?:$|\?)/i)?.[1]?.toLowerCase() === "svg"
        ? "image/svg+xml"
        : "image/png");
      const ext = contentType.includes("svg")
        ? "svg"
        : contentType.includes("webp")
        ? "webp"
        : contentType.includes("jpeg") || contentType.includes("jpg")
        ? "jpg"
        : "png";
      const name = (campaign?.brief?.title_lv || campaign?.title || "Dizains").slice(0, 60);
      const path = `campaign-favorites/${campaign?.id}/${d.id}-${Date.now()}.${ext}`;
      const up = await supabase.storage.from("design-library").upload(path, blob, {
        contentType, upsert: false,
      });
      if (up.error) throw up.error;
      const { data: row, error: dbErr } = await supabase.from("design_library").insert({
        name, file_path: path, file_size: blob.size, tags: ["favorite", "campaign"],
      }).select("id, file_path").maybeSingle();
      if (dbErr) throw dbErr;
      setFavoritedIds((prev) => { const n = new Set(prev); n.add(d.id); return n; });
      toast.success("♥ Saglabāts bibliotēkā");
      return row ? { id: (row as any).id, path: (row as any).file_path } : null;
    } catch (e: any) {
      toast.error("Neizdevās: " + (e.message ?? e));
      return null;
    }
  };

  /** Save the campaign design to the library and immediately remove its background. */
  const [bgRemovingDesignId, setBgRemovingDesignId] = useState<string | null>(null);
  const saveAndRemoveBg = async (d: DesignRow) => {
    if (!d.image_url) { toast.error("Nav bildes"); return; }
    setBgRemovingDesignId(d.id);
    try {
      let libRef: { id: string; path: string } | null = null;
      if (favoritedIds.has(d.id)) {
        // Already in library — find existing row by matching campaign-favorites path
        const { data: rows } = await supabase
          .from("design_library")
          .select("id, file_path")
          .like("file_path", `campaign-favorites/${campaign?.id}/${d.id}-%`)
          .limit(1);
        if (rows && rows.length > 0) libRef = { id: (rows[0] as any).id, path: (rows[0] as any).file_path };
      } else {
        libRef = await saveToLibrary(d);
      }
      if (!libRef) { toast.error("Neizdevās saglabāt bibliotēkā"); return; }
      toast.info("Noņem fonu…");
      const data = await removeDesignBackground([libRef.id], true);
      const ok = data?.ok ?? 0;
      if (ok) {
        // Sync the campaign design to use the new transparent version so the
        // campaign view shows the same image as the library.
        const newPath = data?.results?.find((r) => r.ok)?.file_path;
        if (newPath) {
          const publicUrl = supabase.storage.from("design-library").getPublicUrl(newPath).data.publicUrl;
          const { error: updErr } = await supabase
            .from("campaign_designs" as any)
            .update({ image_url: publicUrl })
            .eq("id", d.id);
          if (updErr) console.warn("[CampaignWizard] failed to sync campaign design image_url:", updErr);
          else {
            setDesigns((prev) => prev.map((x) => x.id === d.id ? { ...x, image_url: publicUrl } : x));
            setSignedUrls((prev) => ({ ...prev, [publicUrl]: publicUrl }));
          }
        }
        toast.success("Fons noņemts");
      } else {
        const firstErr = data?.results?.find((r) => !r.ok)?.error;
        toast.error(firstErr || "Neizdevās noņemt fonu");
      }
    } catch (e: any) {
      toast.error(e?.message || "Neizdevās");
    } finally {
      setBgRemovingDesignId(null);
    }
  };

  /** Pull a design from the library into the current campaign as a new design row (and star it). */
  const addLibraryToCampaign = async (item: { id: string; name: string; file_path: string }) => {
    if (!campaign) return;
    try {
      // Copy bytes into campaign-assets so the rest of the wizard (mockups) works unchanged.
      const pub = supabase.storage.from("design-library").getPublicUrl(item.file_path).data.publicUrl;
      const res = await fetch(pub);
      if (!res.ok) throw new Error("Nevar lejupielādēt");
      const blob = await res.blob();
      const contentType = blob.type || (item.file_path.match(/\.(svg|png|jpe?g|webp)(?:$|\?)/i)?.[1]?.toLowerCase() === "svg"
        ? "image/svg+xml"
        : "image/png");
      const ext = contentType.includes("svg")
        ? "svg"
        : contentType.includes("webp")
        ? "webp"
        : contentType.includes("jpeg") || contentType.includes("jpg")
        ? "jpg"
        : "png";
      const newDesignId = crypto.randomUUID();
      const path = `${campaign.id}/${newDesignId}-lib-${Date.now()}.${ext}`;
      const up = await supabase.storage.from("campaign-assets").upload(path, blob, {
        contentType, upsert: true,
      });
      if (up.error) throw up.error;
      const { error } = await supabase.from("campaign_designs" as any).insert({
        id: newDesignId,
        campaign_id: campaign.id,
        prompt: `[Bibliotēka] ${item.name}`,
        image_url: path,
        is_primary: true,
        style: styleChoice,
      });
      if (error) throw error;
      toast.success("Pievienots no bibliotēkas");
      setLibraryOpen(false);
      await load();
    } catch (e: any) {
      toast.error("Neizdevās: " + (e.message ?? e));
    }
  };

  const availableBases = useMemo(
    () => catalog.filter((p) => p.color_variants.length > 0 && p.color_variants.some((cv) => cv.images?.[0])),
    [catalog]
  );

  const toggleBase = (id: string) => {
    setSelectedBases((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const buildMockups = async () => {
    if (!campaign) return;
    const starred = designs.filter((d) => d.campaign_id === campaign.id && d.is_primary && d.image_url);
    if (!starred.length) { toast.error("Atzīmē vismaz vienu ★ dizainu"); return; }
    const bases = availableBases.filter((p) => selectedBases.has(p.id));
    if (!bases.length) { toast.error("Izvēlies vismaz vienu bāzes kreklu"); return; }

    setBusy("mockups");
    const total = starred.length * bases.reduce((s, p) => s + p.color_variants.filter((cv) => cv.images?.[0]).length, 0);
    setPublishProgress({ done: 0, total });
    let done = 0;
    let created = 0;
    const brief = campaign.brief ?? {};
    const baseTitle = brief.title_lv ?? campaign.title ?? "Kampaņas produkts";

    try {
      // Generate one unique poetic name per design (cached for all bases)
      const designNames = new Map<string, string>();
      for (let di = 0; di < starred.length; di++) {
        const design = starred[di];
        try {
          const { data: nameRes } = await supabase.functions.invoke("generate-design-name", {
            body: {
              baseTitle,
              prompt: (design as any).prompt ?? null,
              imageUrl: signedUrls[design.image_url!] ?? null,
            },
          });
          const aiName = (nameRes as any)?.name as string | null;
          designNames.set(design.id, aiName || baseTitle);
        } catch {
          designNames.set(design.id, baseTitle);
        }
      }

      for (let di = 0; di < starred.length; di++) {
        const design = starred[di];
        const signed = signedUrls[design.image_url!];
        if (!signed) { toast.error(`Dizainam ${di + 1} nav URL`); continue; }
        let linkedProductIdForDesign: string | null = null;
        for (const bp of bases) {
          const printArea = bp.print_area ?? DEFAULT_PRINT_AREA;
          const variants: ColorVariant[] = [];
          const eligible = bp.color_variants.filter((cv) => cv.images?.[0]);
          for (let vi = 0; vi < eligible.length; vi++) {
            const cv = eligible[vi];
            try {
              const blob = await composeMockup({
                mockupUrl: cv.images[0], designUrl: signed, printArea, baseColorHex: cv.hex, maxWidth: 1400,
              });
              const path = `campaigns/${campaign.id}/${design.id}/${bp.id}/${vi}-${slugify(cv.name)}.jpg`;
              const up = await supabase.storage.from("product-images").upload(path, blob, { contentType: "image/jpeg", upsert: true });
              if (up.error) throw up.error;
              const publicUrl = supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
              variants.push({ name: cv.name, hex: cv.hex || "#888", images: [publicUrl] });
            } catch (e: any) {
              console.error(e); toast.error(`${bp.name} (${cv.name}): mockup neizdevās`);
            }
            done++; setPublishProgress({ done, total });
          }
          if (!variants.length) continue;
          const baseName = bp.name_lv || bp.name;
          const designName = designNames.get(design.id) || `${baseTitle} ${di + 1}`;
          const productName = buildDraftProductName(designName, baseName);
          const slug = `${slugify(productName)}-${campaign.year}-${Date.now().toString(36)}`;
          const payload: any = {
            name: productName, name_lv: productName, slug,
            description: bp.description ?? brief.description_lv ?? null,
            description_lv: bp.description_lv ?? brief.description_lv ?? null,
            price: 24.99, category: bp.category, sizes: bp.sizes ?? ["S","M","L","XL"],
            colors: variants.map((v) => v.name), customizable: false, color_variants: variants,
            image_url: variants[0].images[0], in_stock: true, is_draft: true, status: "draft",
            holiday_id: campaign.holiday_id, campaign_id: campaign.id,
            base_product_id: bp.id,
            print_area: printArea,
          };
          const { data: prod, error } = await supabase.from("products").insert(payload).select("id").maybeSingle();
          if (error || !prod) toast.error(`${baseName}: ${error?.message ?? "neizveidojās"}`);
          else {
            created++;
            if (!linkedProductIdForDesign) {
              linkedProductIdForDesign = (prod as any).id;
              await supabase.from("campaign_designs" as any).update({ product_id: linkedProductIdForDesign }).eq("id", design.id);
            }
          }
        }
      }
      if (created) await supabase.from("campaigns" as any).update({ status: "products_ready" }).eq("id", campaign.id);
      toast.success(`Izveidoti ${created} produkti`);
      setSelectedBases(new Set());
      await load();
    } catch (e: any) { toast.error("Neizdevās: " + e.message); }
    finally { setBusy(null); setPublishProgress(null); }
  };

  const removeColor = async (productId: string, colorName: string) => {
    const p = campProducts.find((x) => x.id === productId);
    if (!p) return;
    const next = p.color_variants.filter((c) => c.name !== colorName);
    const patch: any = { color_variants: next as any };
    if (next.length > 0) patch.image_url = next[0].images?.[0] ?? p.image_url;
    const { error } = await supabase.from("products").update(patch).eq("id", productId);
    if (error) { toast.error(error.message); return; }
    if (next.length === 0) {
      await excludeProduct(productId, false);
      return;
    }
    setCampProducts((prev) => prev.map((x) => x.id === productId ? { ...x, color_variants: next, image_url: patch.image_url } : x));
  };

  const setCoverColor = async (productId: string, colorName: string) => {
    const p = campProducts.find((x) => x.id === productId);
    if (!p) return;
    const idx = p.color_variants.findIndex((c) => c.name === colorName);
    if (idx <= 0) return;
    const next = [p.color_variants[idx], ...p.color_variants.filter((_, i) => i !== idx)];
    const newCover = next[0]?.images?.[0] ?? p.image_url;
    const { error } = await supabase.from("products").update({
      color_variants: next as any,
      image_url: newCover,
    }).eq("id", productId);
    if (error) { toast.error(error.message); return; }
    setCampProducts((prev) => prev.map((x) => x.id === productId ? { ...x, color_variants: next, image_url: newCover } : x));
    toast.success(`Kartītes krāsa: ${colorName}`);
  };

  const updatePrintAdj = async (productId: string, patch: { print_offset_y?: number; print_scale?: number }) => {
    const { error } = await supabase.from("products").update(patch).eq("id", productId);
    if (error) { toast.error(error.message); return; }
    setCampProducts((prev) => prev.map((x) => x.id === productId ? { ...x, ...patch } : x));
  };

  const excludeProduct = async (productId: string, _askConfirm = true) => {
    const product = campProducts.find((x) => x.id === productId) ?? null;
    const busyId = `delete-${productId}`;
    setBusy(busyId);
    try {
      const { error } = await supabase.from("products").delete().eq("id", productId);
      if (error) { toast.error(error.message); return; }
      const designId = product
        ? extractDesignIdFromProductAsset(product.image_url) || extractDesignIdFromProductAsset(product.color_variants?.[0]?.images?.[0])
        : null;
      if (designId) {
        await supabase.from("campaign_designs" as any).update({ product_id: null }).eq("id", designId).eq("product_id", productId);
      }
      setCampProducts((prev) => prev.filter((x) => x.id !== productId));
      toast.success("Izslēgts");
    } finally {
      setBusy((prev) => prev === busyId ? null : prev);
    }
  };

  const regenerateProductMockups = async (productId: string) => {
    if (!campaign) return;
    const p = campProducts.find((x) => x.id === productId);
    if (!p) return;
    const resolvedBaseProductId = resolveBaseProductId(p);
    if (!resolvedBaseProductId) {
      toast.error("Šim produktam trūkst bāzes atsauces — atjauno 2. soli un ģenerē no jauna.");
      return;
    }
    // Find the design assigned to this product (or first starred)
    const designRow = resolveDesignForProduct(p, designs);
    if (!designRow?.image_url) { toast.error("Nav saistīta dizaina"); return; }
    const designSigned = signedUrls[designRow.image_url];
    if (!designSigned) { toast.error("Dizaina URL trūkst"); return; }

    // Find the base catalog row for print_area
    const { data: baseRow } = await supabase.from("products")
      .select("id, print_area, color_variants")
      .eq("id", resolvedBaseProductId).maybeSingle();
    if (!baseRow) { toast.error("Bāzes produkts nav atrasts"); return; }
    const printArea = (baseRow.print_area as any) ?? DEFAULT_PRINT_AREA;
    const baseVariants = Array.isArray(baseRow.color_variants) ? (baseRow.color_variants as ColorVariant[]) : [];

    setBusy("regen-" + productId);
    try {
      const newVariants: ColorVariant[] = [];
      for (let i = 0; i < p.color_variants.length; i++) {
        const cv = p.color_variants[i];
        const baseCv = baseVariants.find((b) => b.name === cv.name) ?? baseVariants[0];
        if (!baseCv?.images?.[0]) continue;
        try {
          const blob = await composeMockup({
            mockupUrl: baseCv.images[0],
            designUrl: designSigned,
            printArea,
            baseColorHex: cv.hex,
            maxWidth: 1400,
            offsetY: p.print_offset_y ?? 0,
            scale: p.print_scale ?? 1,
          });
          const path = `campaigns/${campaign.id}/${designRow.id}/${resolvedBaseProductId}/regen-${Date.now()}-${i}-${slugify(cv.name)}.jpg`;
          const up = await supabase.storage.from("product-images").upload(path, blob, { contentType: "image/jpeg", upsert: true });
          if (up.error) throw up.error;
          const publicUrl = supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
          newVariants.push({ name: cv.name, hex: cv.hex, images: [publicUrl] });
        } catch (e: any) {
          console.error(e); toast.error(`${cv.name}: ${e.message}`);
        }
      }
      if (!newVariants.length) { toast.error("Neizdevās izveidot nevienu mockup"); return; }
      const { error } = await supabase.from("products").update({
        color_variants: newVariants as any,
        image_url: newVariants[0].images[0],
      }).eq("id", productId);
      if (error) throw error;
      setCampProducts((prev) => prev.map((x) => x.id === productId
        ? { ...x, color_variants: newVariants, image_url: newVariants[0].images[0] }
        : x));
      toast.success(`Pārģenerēti ${newVariants.length} mockup`);
    } catch (e: any) {
      toast.error("Neizdevās: " + e.message);
    } finally {
      setBusy(null);
    }
  };

  const resetStep2 = async () => {
    if (!campaign) return;
    if (!confirm("Pārstartēt 2. soli? Tiks dzēsti visi šīs kampaņas dizaini un produktu melnraksti.")) return;
    setBusy("reset2");
    try {
      await supabase.from("products").delete().eq("campaign_id", campaign.id).eq("is_draft", true);
      await supabase.from("campaign_designs" as any).delete().eq("campaign_id", campaign.id);
      await supabase.from("campaigns" as any).update({ status: "ready_for_review" }).eq("id", campaign.id);
      toast.success("2. solis pārstartēts");
      await load();
    } finally { setBusy(null); }
  };

  /* -------- Step 3 actions -------- */
  const regenBlog = async () => {
    if (!campaign) return;
    setBusy("blog");
    toast.info("AI raksta blogu…");
    try {
      const { data, error } = await supabase.functions.invoke("generate-campaign-blog", { body: { campaign_id: campaign.id } });
      if (error || (data as any)?.error) throw new Error((data as any)?.error ?? error?.message);
      toast.success("Blogs pārģenerēts");
      await load();
    } catch (e: any) { toast.error("Neizdevās: " + e.message); }
    finally { setBusy(null); }
  };

  const saveBlog = async (options?: { throwOnError?: boolean }) => {
    if (!blogPost) return;
    setBusy("save-blog");
    const { error } = await supabase.from("blog_posts").update({
      title: blogPost.title, slug: blogPost.slug, excerpt: blogPost.excerpt,
      content: blogPost.content, cover_image_url: blogPost.cover_image_url,
    }).eq("id", blogPost.id);
    setBusy(null);
    if (error) {
      toast.error(error.message);
      if (options?.throwOnError) throw error;
      return;
    }
    setSavedBlogSlug(blogPost.slug);
    toast.success("Saglabāts");
  };

  const uploadBlogCover = async (file: File) => {
    if (!blogPost) return;
    setBusy("upload-blog-cover");
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `blog/${blogPost.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("product-images")
        .upload(path, file, { contentType: file.type, upsert: true });
      if (upErr) throw upErr;

      const publicUrl = supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
      const { error: updErr } = await supabase
        .from("blog_posts")
        .update({ cover_image_url: publicUrl })
        .eq("id", blogPost.id);
      if (updErr) throw updErr;

      setBlogPost({ ...blogPost, cover_image_url: publicUrl });
      toast.success("Vāka attēls nomainīts");
    } catch (e: any) {
      toast.error(e?.message || "Neizdevās augšupielādēt vāka attēlu");
    } finally {
      setBusy(null);
    }
  };

  const publishAll = async () => {
    if (!campaign || !blogPost) { toast.error("Nav blog raksta"); return; }
    setBusy("publish");
    try {
      await saveBlog({ throwOnError: true });
      const expIso = expiresAt ? new Date(expiresAt + "T23:59:59Z").toISOString() : null;
      const { error: pErr, count } = await supabase.from("products")
        .update({
          is_draft: false, status: "published",
          show_in_collection: addToCollection,
          available_from: new Date().toISOString(),
          expires_at: expIso,
        }, { count: "exact" })
        .eq("campaign_id", campaign.id);
      if (pErr) throw pErr;

      // Use first ★ design as cover if cover is empty
      let cover = blogPost.cover_image_url;
      if (!cover) {
        const firstStar = designs.find((d) => d.is_primary && d.image_url);
        if (firstStar?.image_url) cover = signedUrls[firstStar.image_url] ?? null;
      }
      const { error: bErr } = await supabase.from("blog_posts").update({
        status: "published", published_at: new Date().toISOString(),
        cover_image_url: cover,
      }).eq("id", blogPost.id);
      if (bErr) throw bErr;

      await supabase.from("campaigns" as any).update({ status: "published", published_at: new Date().toISOString() }).eq("id", campaign.id);

      setSuccess({ products: count ?? campProducts.length, blogSlug: blogPost.slug, expires: expIso });
      toast.success("Kampaņa publicēta!");
      onChanged?.();
    } catch (e: any) { toast.error("Neizdevās publicēt: " + e.message); }
    finally { setBusy(null); }
  };

  /* ------------ Render helpers ------------ */
  const headerTitle = campaign?.title ?? "Kampaņa";
  const StepDot = ({ n, label }: { n: number; label: string }) => (
    <button
      type="button"
      onClick={() => campaign && setStep(n as 1 | 2 | 3)}
      className={`flex items-center gap-2 text-xs font-body transition ${step === n ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"}`}
    >
      <span className={`w-7 h-7 rounded-full flex items-center justify-center border-2 text-[11px] font-bold transition ${step === n ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/40 ring-2 ring-primary/20" : step > n ? "border-primary/60 bg-primary/10 text-primary" : "border-border bg-card"}`}>
        {n}
      </span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="block max-w-full sm:max-w-5xl w-full max-h-[100dvh] sm:max-h-[92vh] h-[100dvh] sm:h-auto overflow-y-auto overflow-x-hidden p-3 sm:p-6 rounded-none sm:rounded-lg">
        <DialogHeader className="min-w-0">
          <DialogTitle className="font-display text-base sm:text-xl flex items-center gap-2 pr-8 min-w-0">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
            <span className="truncate">{headerTitle}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center justify-between gap-2 py-2.5 px-2 rounded-lg bg-primary/5 border border-primary/15 mt-3 min-w-0">
          <StepDot n={1} label="Idejas" />
          <div className={`flex-1 h-0.5 mx-1 rounded-full ${step >= 2 ? "bg-primary/60" : "bg-border"}`} />
          <StepDot n={2} label="Dizaini & produkti" />
          <div className={`flex-1 h-0.5 mx-1 rounded-full ${step >= 3 ? "bg-primary/60" : "bg-border"}`} />
          <StepDot n={3} label="Blogs & publicēšana" />
        </div>

        {loading || !campaign ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : success ? (
          <PublishSuccess success={success} onClose={closeAndRefresh} />
        ) : (
          <div className="py-3 space-y-4 min-w-0">
            {step === 1 && (
              <StepIdea
                campaign={campaign}
                busy={busy}
                onRegen={regenBrief}
                onSaveBrief={saveBrief}
                onRegenSingleIdea={regenSingleIdea}
                regenIdeaIdx={regenIdeaIdx}
                styleChoice={styleChoice}
                onChangeStyle={setStyleChoice}
                transparentBg={transparentBg}
                onChangeTransparentBg={setTransparentBg}
                customStyleId={customStyleId}
                onChangeCustomStyleId={setCustomStyleId}
                imageSize={imageSize}
                onChangeImageSize={setImageSize}
                preferredColors={preferredColors}
                onChangePreferredColors={setPreferredColors}
                usePalette={usePalette}
                onChangeUsePalette={setUsePalette}
                modelChoice={modelChoice}
                onChangeModelChoice={setModelChoice}
                onNext={() => setStep(2)}
                onClose={closeAndRefresh}
              />
            )}
            {step === 2 && (
              <StepDesigns
                campaign={campaign}
                designs={designs}
                signedUrls={signedUrls}
                availableBases={availableBases}
                selectedBases={selectedBases}
                campProducts={campProducts}
                catalog={catalog}
                publishProgress={publishProgress}
                busy={busy}
                onToggleStar={toggleStar}
                onSaveToLibrary={saveToLibrary}
                onSaveAndRemoveBg={saveAndRemoveBg}
                bgRemovingDesignId={bgRemovingDesignId}
                onOpenLibrary={() => setLibraryOpen(true)}
                favoritedIds={favoritedIds}
                onRegenDesigns={regenDesigns}
                onRegenSingleDesign={regenSingleDesign}
                regenSingleId={regenSingleId}
                styleChoice={styleChoice}
                onChangeStyle={setStyleChoice}
                transparentBg={transparentBg}
                onChangeTransparentBg={setTransparentBg}
                customStyleId={customStyleId}
                onChangeCustomStyleId={setCustomStyleId}
                imageSize={imageSize}
                onChangeImageSize={setImageSize}
                preferredColors={preferredColors}
                onChangePreferredColors={setPreferredColors}
                usePalette={usePalette}
                onChangeUsePalette={setUsePalette}
                modelChoice={modelChoice}
                onChangeModelChoice={setModelChoice}
                onToggleBase={toggleBase}
                onBuildMockups={buildMockups}
                onRemoveColor={removeColor}
                onUpdatePrintAdj={updatePrintAdj}
                onExcludeProduct={excludeProduct}
                onRegenerateMockups={regenerateProductMockups}
                onSetCoverColor={setCoverColor}
                onReset={resetStep2}
                onBack={() => setStep(1)}
                onNext={() => setStep(3)}
                onClose={closeAndRefresh}
              />
            )}
            {step === 3 && (
              <StepBlog
                campaign={campaign}
                blogPost={blogPost}
                savedBlogSlug={savedBlogSlug}
                setBlogPost={setBlogPost}
                designs={designs}
                signedUrls={signedUrls}
                campProducts={campProducts}
                campProductsCount={campProducts.length}
                expiresAt={expiresAt}
                setExpiresAt={setExpiresAt}
                addToCollection={addToCollection}
                setAddToCollection={setAddToCollection}
                busy={busy}
                onRegen={regenBlog}
                onSave={saveBlog}
                onUploadCover={uploadBlogCover}
                onPublish={publishAll}
                onBack={() => setStep(2)}
                onClose={closeAndRefresh}
              />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
    {/* Library sheet: pick saved favorites and drop them into this campaign */}
    <LibrarySheet
      open={libraryOpen}
      onOpenChange={setLibraryOpen}
      onPick={addLibraryToCampaign}
    />
    </>
  );
};

/* -------------------- Sub-components -------------------- */

function StepIdea({
  campaign, busy, onRegen, onSaveBrief, onNext, onClose,
  onRegenSingleIdea, regenIdeaIdx,
  styleChoice, onChangeStyle,
  transparentBg, onChangeTransparentBg,
  customStyleId, onChangeCustomStyleId,
  imageSize, onChangeImageSize,
  preferredColors, onChangePreferredColors,
  usePalette, onChangeUsePalette,
  modelChoice, onChangeModelChoice,
}: any) {
  const initial: Brief = campaign.brief ?? {};
  const [draft, setDraft] = useState<Brief>(initial);
  const [saving, setSaving] = useState(false);
  const [hintByIdx, setHintByIdx] = useState<Record<number, string>>({});

  useEffect(() => { setDraft(campaign.brief ?? {}); }, [campaign.id, campaign.brief]);

  const ideas = draft.design_ideas ?? [];
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);

  const updateIdea = (idx: number, patch: Partial<{ title: string; prompt: string; slogan: string }>) => {
    const next = [...ideas];
    next[idx] = { ...next[idx], ...patch };
    setDraft({ ...draft, design_ideas: next });
  };
  const removeIdea = (idx: number) => {
    setDraft({ ...draft, design_ideas: ideas.filter((_, i) => i !== idx) });
  };
  const addIdea = () => {
    setDraft({ ...draft, design_ideas: [...ideas, { title: "Jauna ideja", prompt: "", slogan: "" }] });
  };
  const save = async () => {
    setSaving(true);
    try { await onSaveBrief(draft); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      {!draft.title_lv && (
        <div className="rounded border border-dashed p-4 text-center text-sm text-muted-foreground">
          Vēl nav uzģenerētas idejas. Spied "Pārģenerēt" zemāk.
        </div>
      )}

      {draft.title_lv && (
        <>
          <div>
            <Input
              value={draft.title_lv ?? ""}
              onChange={(e) => setDraft({ ...draft, title_lv: e.target.value })}
              className="font-display text-xl h-auto py-2"
            />
            <Input
              value={draft.tagline_lv ?? ""}
              onChange={(e) => setDraft({ ...draft, tagline_lv: e.target.value })}
              placeholder="Sauklis"
              className="italic text-sm mt-2"
            />
          </div>

          <section>
            <h4 className="font-semibold text-xs uppercase tracking-wider mb-1 text-muted-foreground">Apraksts</h4>
            <Textarea
              value={draft.description_lv ?? ""}
              onChange={(e) => setDraft({ ...draft, description_lv: e.target.value })}
              rows={2}
            />
          </section>

          <section>
            <h4 className="font-semibold text-xs uppercase tracking-wider mb-1 text-muted-foreground">Mērķauditorija</h4>
            <Input
              value={draft.target_audience ?? ""}
              onChange={(e) => setDraft({ ...draft, target_audience: e.target.value })}
            />
          </section>

          {!!draft.color_palette?.length && (
            <section>
              <h4 className="font-semibold text-xs uppercase tracking-wider mb-2 text-muted-foreground">Krāsu palete</h4>
              <div className="flex gap-2 flex-wrap">
                {draft.color_palette.map((c) => (
                  <div key={c} className="flex flex-col items-center gap-1">
                    <div className="w-12 h-12 rounded-md border" style={{ backgroundColor: c }} />
                    <span className="text-[10px] font-mono text-muted-foreground">{c}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-md border border-border bg-card/40 p-3">
            <label className="flex items-start gap-2 cursor-pointer">
              <Checkbox
                checked={!!draft.fit_in_frame}
                onCheckedChange={(v) => setDraft({ ...draft, fit_in_frame: !!v })}
                className="mt-0.5"
              />
              <div className="text-sm">
                <div className="font-medium">Bilde pilnībā ietilpst rāmī (DTF druka)</div>
                <div className="text-xs text-muted-foreground">
                  Liek AI ar drošu malu (≥8%) iederēt visu zīmējumu kadrā — nekas netiek nogriezts.
                </div>
              </div>
            </label>
          </section>

          <section>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                Dizainu idejas ({ideas.length})
              </h4>
              <Button type="button" size="sm" variant="outline" onClick={addIdea}>
                + Pievienot ideju
              </Button>
            </div>
            <div className="space-y-3">
              {ideas.map((idea, idx) => (
                <div key={idx} className="rounded-md border border-border p-3 space-y-2 bg-card/40">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-mono text-muted-foreground pt-2">#{idx + 1}</span>
                    <Input
                      value={idea.title}
                      onChange={(e) => updateIdea(idx, { title: e.target.value })}
                      placeholder="Nosaukums"
                      className="font-semibold"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removeIdea(idx)}
                      className="shrink-0 h-9 w-9 text-destructive hover:text-destructive"
                      title="Dzēst ideju"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Prompts (EN)</label>
                    <Textarea
                      value={idea.prompt}
                      onChange={(e) => updateIdea(idx, { prompt: e.target.value })}
                      rows={3}
                      placeholder="Detailed English prompt for the AI image"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Sauklis / teksts zīmējumā (nav obligāts)
                    </label>
                    <Input
                      value={idea.slogan ?? ""}
                      onChange={(e) => updateIdea(idx, { slogan: e.target.value })}
                      placeholder='piem. "Kur Janka, tur pjanka"'
                    />
                    <div className="text-[10px] text-muted-foreground mt-1">
                      Ja ievadi tekstu, sistēma automātiski dod prioritāti precīzai burtu atveidei.
                    </div>
                  </div>
                  <div className="pt-2 border-t border-dashed">
                    <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      AI norāde šai idejai (nav obligāts)
                    </label>
                    <Input
                      value={hintByIdx[idx] ?? ""}
                      onChange={(e) => setHintByIdx({ ...hintByIdx, [idx]: e.target.value })}
                      placeholder='piem. "vairāk humora, neon krāsas, retro 80s"'
                      className="h-8 text-xs"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="mt-2 w-full"
                      disabled={regenIdeaIdx === idx || dirty}
                      onClick={() => onRegenSingleIdea?.(idx, hintByIdx[idx])}
                      title={dirty ? "Vispirms saglabā izmaiņas" : "AI pārģenerēs tikai šo ideju"}
                    >
                      {regenIdeaIdx === idx
                        ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                        : <Sparkles className="w-4 h-4 mr-1.5" />}
                      Pārģenerēt tikai šo ideju ar AI
                    </Button>
                  </div>
                </div>
              ))}
              {ideas.length === 0 && (
                <div className="text-sm text-muted-foreground italic text-center py-4">
                  Nav neviena dizaina idejas. Pievieno vismaz vienu.
                </div>
              )}
            </div>
          </section>

          <section>
            <h4 className="font-semibold text-xs uppercase tracking-wider mb-2 text-muted-foreground">
              AI ģenerēšanas iestatījumi
            </h4>
            <GenerationSettings
              styleChoice={styleChoice}
              onChangeStyle={onChangeStyle}
              transparentBg={transparentBg}
              onChangeTransparentBg={onChangeTransparentBg}
              imageSize={imageSize}
              onChangeImageSize={onChangeImageSize}
              preferredColors={preferredColors}
              onChangePreferredColors={onChangePreferredColors}
              usePalette={usePalette}
              onChangeUsePalette={onChangeUsePalette}
              modelChoice={modelChoice}
              onChangeModelChoice={onChangeModelChoice}
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Stils, izmērs un krāsas tiek pielietoti, kad nākamajā solī ģenerēsi bildes. Idejas ar saukli vai latviešu garumzīmēm automātiski tiek ģenerētas teksta precizitātes režīmā.
            </p>
          </section>
        </>
      )}

      <div className="flex flex-wrap gap-2 sticky bottom-0 z-20 bg-zinc-900 text-white border-t border-zinc-800 shadow-[0_-6px_16px_rgba(0,0,0,0.18)] sm:rounded-t-lg -mx-3 sm:mx-0 -mb-3 sm:mb-0 px-3 sm:px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        <Button variant="outline" size="sm" disabled={busy === "brief"} onClick={onRegen} className="flex-1 sm:flex-initial border-zinc-600 bg-zinc-800 text-white hover:bg-zinc-700 hover:text-white">
          {busy === "brief" ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1.5" />}
          Pārģenerēt
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={!dirty || saving}
          onClick={save}
          className="flex-1 sm:flex-initial bg-zinc-700 text-white hover:bg-zinc-600"
        >
          {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
          Saglabāt izmaiņas
        </Button>
        <Button variant="ghost" size="sm" onClick={onClose} className="hidden sm:inline-flex text-zinc-200 hover:bg-zinc-800 hover:text-white">Aizvērt</Button>
        <div className="hidden sm:block flex-1" />
        <Button size="sm" disabled={!draft.title_lv || dirty} onClick={onNext} className="flex-1 sm:flex-initial" title={dirty ? "Vispirms saglabā izmaiņas" : undefined}>
          Tālāk <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
      </div>
    </div>
  );
}

function StepDesigns({
  campaign, designs, signedUrls, availableBases, selectedBases, campProducts, catalog,
  publishProgress, busy, onToggleStar, onRegenDesigns, onToggleBase, onBuildMockups,
  onRemoveColor, onUpdatePrintAdj, onExcludeProduct, onRegenerateMockups, onReset, onBack, onNext, onClose,
  onSetCoverColor, onRegenSingleDesign, regenSingleId, styleChoice,
  onChangeStyle, transparentBg, onChangeTransparentBg, customStyleId, onChangeCustomStyleId,
  imageSize, onChangeImageSize, preferredColors, onChangePreferredColors,
  usePalette, onChangeUsePalette, modelChoice, onChangeModelChoice,
  onSaveToLibrary, onOpenLibrary,
  favoritedIds,
  onSaveAndRemoveBg, bgRemovingDesignId,
}: any) {
  const starCount = designs.filter((d: DesignRow) => d.is_primary && d.image_url).length;
  const [showOnShirt, setShowOnShirt] = useState(false);
  const [shirtColor, setShowShirtColor] = useState<"white" | "black">("white");

  return (
    <div className="space-y-5">
      {/* Designs grid */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h4 className="font-semibold text-sm">AI dizaini ({designs.length})</h4>
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant={showOnShirt ? "default" : "outline"}
              onClick={() => setShowOnShirt((v) => !v)}
              className="h-8 text-[11px]"
              title="Priekšskats uz krekla"
            >
              👕 {showOnShirt ? "Atpakaļ" : "Uz krekla"}
            </Button>
            {showOnShirt && (
              <button
                type="button"
                onClick={() => setShowShirtColor((c) => (c === "white" ? "black" : "white"))}
                className={`w-7 h-7 rounded-full border-2 ${shirtColor === "white" ? "bg-white border-foreground" : "bg-black border-foreground"}`}
                title="Mainīt krekla krāsu"
              />
            )}
            <Button size="sm" variant="outline" onClick={onOpenLibrary} className="h-8 text-[11px]" title="Atvērt saglabāto dizainu bibliotēku">
              <Heart className="w-4 h-4 mr-1 text-rose-500" /> Bibliotēka
            </Button>
            <Button size="sm" variant="outline" disabled={busy === "designs"} onClick={onRegenDesigns} className="h-8 text-[11px]">
              {busy === "designs" ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Wand2 className="w-4 h-4 mr-1" />}
              Pārģenerēt
            </Button>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground mb-2 mt-2">
          Maini stilu, AI modeli, izmēru un krāsas zemāk, tad spied <b>Pārģenerēt</b> (vai ↻ uz atsevišķa dizaina). ♥ saglabā dizainu bibliotēkā tālākai izmantošanai.
        </p>
        <div className="mb-3">
          <GenerationSettings
            styleChoice={styleChoice}
            onChangeStyle={onChangeStyle}
            transparentBg={transparentBg}
            onChangeTransparentBg={onChangeTransparentBg}
            imageSize={imageSize}
            onChangeImageSize={onChangeImageSize}
            preferredColors={preferredColors}
            onChangePreferredColors={onChangePreferredColors}
            usePalette={usePalette}
            onChangeUsePalette={onChangeUsePalette}
            modelChoice={modelChoice}
            onChangeModelChoice={onChangeModelChoice}
          />
        </div>
        {designs.length === 0 ? (
          <div className="rounded border border-dashed p-6 text-center text-sm text-muted-foreground">
            Vēl nav dizainu. Spied "Pārģenerēt dizainus".
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {designs.map((d: DesignRow) => (
              <DesignCard
                key={d.id}
                d={d}
                signedUrls={signedUrls}
                regenSingleId={regenSingleId}
                styleChoice={styleChoice}
                onToggleStar={onToggleStar}
                onSaveToLibrary={onSaveToLibrary}
                onRegenSingleDesign={onRegenSingleDesign}
                showOnShirt={showOnShirt}
                shirtColor={shirtColor}
                favorited={favoritedIds?.has?.(d.id) ?? false}
                onSaveAndRemoveBg={onSaveAndRemoveBg}
                bgRemoving={bgRemovingDesignId === d.id}
              />
            ))}
          </div>
        )}
        <p className="text-[11px] text-muted-foreground mt-2">
          Atzīmē (★) labākos dizainus. Atzīmētie kļūs par produktu printiem un bloga raksta vāku.
        </p>
      </section>

      {/* Base products visual picker */}
      {starCount > 0 && (
        <section className="border-t pt-4">
          <h4 className="font-semibold text-sm mb-2">Izvēlies bāzes apģērbu ({selectedBases.size} izvēlēti)</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {availableBases.map((p: CatalogProduct) => {
              const sel = selectedBases.has(p.id);
              const thumb = p.color_variants.find((cv) => cv.images?.[0])?.images[0];
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onToggleBase(p.id)}
                  className={`relative border-2 rounded-lg overflow-hidden text-left transition ${sel ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-foreground/40"}`}
                >
                  <div className="aspect-square bg-white overflow-hidden flex items-center justify-center">
                    {thumb ? (
                      <img
                        src={getOptimizedSrc(thumb, 400, 70)}
                        loading="lazy"
                        alt=""
                        className="w-[88%] h-[88%] object-contain"
                      />
                    ) : <Package className="w-8 h-8 m-auto" />}
                  </div>
                  <div className="p-2 bg-card border-t border-border">
                    <p className="text-xs font-body line-clamp-1 leading-tight">{p.name_lv || p.name}</p>
                    <p className="text-[10px] text-muted-foreground">{p.color_variants.filter((cv) => cv.images?.[0]).length} krāsas</p>
                  </div>
                  {sel && <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">✓</div>}
                </button>
              );
            })}
          </div>
          {publishProgress && (
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Ģenerē mockup…</span><span>{publishProgress.done}/{publishProgress.total}</span>
              </div>
              <div className="h-1 bg-muted rounded overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${(publishProgress.done / Math.max(1, publishProgress.total)) * 100}%` }} />
              </div>
            </div>
          )}
          <Button size="sm" className="mt-2" disabled={busy === "mockups" || !selectedBases.size} onClick={onBuildMockups}>
            {busy === "mockups" ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Wand2 className="w-4 h-4 mr-1.5" />}
            Veidot mockup produktus
          </Button>
        </section>
      )}

      {/* Existing campaign products with per-product tuning */}
      {campProducts.length > 0 && (
        <section className="border-t pt-4">
          <h4 className="font-semibold text-sm mb-2">Kampaņas produkti ({campProducts.length})</h4>
          <p className="text-[11px] text-muted-foreground mb-2">
            Velc dizainu ar peli vai pirkstu, lai pārvietotu uz augšu/leju. Lieto ritenīti vai sažņaudz ar 2 pirkstiem, lai mainītu izmēru. Saglabājas automātiski.
          </p>
          <div className="space-y-3">
            {campProducts.map((p: CampProduct) => {
              const resolvedBaseProductId = resolveBaseProductId(p);
              const baseInfo = catalog.find((c: CatalogProduct) => c.id === resolvedBaseProductId) || null;
              const designRow = resolveDesignForProduct(p, designs);
              const designUrl = designRow?.image_url ? signedUrls[designRow.image_url] : null;
              return (
                <ProductTuneRow
                  key={p.id}
                  product={p}
                  baseInfo={baseInfo}
                  designUrl={designUrl}
                  busyKey={busy}
                  onUpdatePrintAdj={onUpdatePrintAdj}
                  onRegenerate={onRegenerateMockups}
                  onRemoveColor={onRemoveColor}
                  onExcludeProduct={onExcludeProduct}
                  onSetCoverColor={onSetCoverColor}
                />
              );
            })}
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-2 sticky bottom-0 z-20 bg-zinc-900 text-white border-t border-zinc-800 shadow-[0_-6px_16px_rgba(0,0,0,0.18)] sm:rounded-t-lg -mx-3 sm:mx-0 -mb-3 sm:mb-0 px-3 sm:px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        <Button variant="outline" size="sm" onClick={onBack} className="flex-1 sm:flex-initial border-zinc-600 bg-zinc-800 text-white hover:bg-zinc-700 hover:text-white"><ArrowLeft className="w-4 h-4 mr-1.5" />Atpakaļ</Button>
        <Button variant="ghost" size="sm" disabled={busy === "reset2"} onClick={onReset} className="hidden sm:inline-flex text-zinc-200 hover:bg-zinc-800 hover:text-white">
          <RotateCcw className="w-4 h-4 mr-1.5" />Atjaunot šo soli
        </Button>
        <div className="hidden sm:block flex-1" />
        <Button variant="ghost" size="sm" onClick={onClose} className="hidden sm:inline-flex text-zinc-200 hover:bg-zinc-800 hover:text-white">Saglabāt un turpināt vēlāk</Button>
        <Button size="sm" disabled={campProducts.length === 0} onClick={onNext} className="flex-1 sm:flex-initial">
          Tālāk <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
      </div>
    </div>
  );
}

function StepBlog({
  campaign, blogPost, savedBlogSlug, setBlogPost, designs, signedUrls, campProducts, campProductsCount,
  expiresAt, setExpiresAt, addToCollection, setAddToCollection,
  busy, onRegen, onSave, onUploadCover, onPublish, onBack, onClose,
}: any) {
  // Auto-suggest cover from first ★ design
  const firstStarUrl = useMemo(() => {
    const f = designs.find((d: DesignRow) => d.is_primary && d.image_url);
    return f?.image_url ? signedUrls[f.image_url] : null;
  }, [designs, signedUrls]);

  useEffect(() => {
    if (blogPost && !blogPost.cover_image_url && firstStarUrl) {
      setBlogPost({ ...blogPost, cover_image_url: firstStarUrl });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstStarUrl, blogPost?.id]);

  const previewSlug = savedBlogSlug ?? blogPost?.slug ?? null;
  const previewHref = previewSlug ? `/blog/${previewSlug}?preview=1` : null;
  const embeddedPreviewHref = previewSlug ? `/blog/${previewSlug}?preview=1&embed=1` : null;

  if (!blogPost) {
    return (
      <div className="space-y-4">
        <div className="rounded border border-dashed p-6 text-center text-sm text-muted-foreground">
          Vēl nav blog raksta. Spied "Ģenerēt blogu".
        </div>
        <Button size="sm" disabled={busy === "blog"} onClick={onRegen}>
          {busy === "blog" ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <FileText className="w-4 h-4 mr-1.5" />}
          Ģenerēt blogu
        </Button>
        <div className="pt-4 border-t flex justify-between">
          <Button variant="outline" size="sm" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-1.5" />Atpakaļ</Button>
          <Button variant="ghost" size="sm" onClick={onClose}>Saglabāt un turpināt vēlāk</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm">Bloga raksts</h4>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={busy === "blog"} onClick={onRegen}>
            {busy === "blog" ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1.5" />}
            Pārģenerēt
          </Button>
          <Button size="sm" variant="outline" asChild>
            <a href={previewHref ?? "#"} target="_blank" rel="noreferrer">
              <Eye className="w-3.5 h-3.5 mr-1.5" /> Priekšskatīt
            </a>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold">Virsraksts</label>
          <Input value={blogPost.title} onChange={(e) => setBlogPost({ ...blogPost, title: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-semibold">Slug</label>
          <Input value={blogPost.slug} onChange={(e) => setBlogPost({ ...blogPost, slug: e.target.value })} />
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold">Vāka attēls</label>
        <div className="mt-1 flex flex-col sm:flex-row gap-2">
          <Input value={blogPost.cover_image_url ?? ""} onChange={(e) => setBlogPost({ ...blogPost, cover_image_url: e.target.value })} />
          <label
            className={`inline-flex items-center gap-1.5 shrink-0 h-10 px-3 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent hover:text-accent-foreground cursor-pointer ${busy === "upload-blog-cover" ? "opacity-60 pointer-events-none" : ""}`}
          >
            {busy === "upload-blog-cover" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {blogPost.cover_image_url ? "Nomainīt" : "Augšupielādēt"}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={busy === "upload-blog-cover"}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUploadCover(file);
                e.target.value = "";
              }}
            />
          </label>
        </div>
        {blogPost.cover_image_url && <img src={blogPost.cover_image_url} alt="" className="mt-2 max-h-32 rounded border" />}
      </div>
      {blogPost && (
        <div className="rounded-md border border-border overflow-hidden bg-background">
          <div className="px-3 py-2 border-b border-border text-[11px] text-muted-foreground font-body">
            Dzīvais bloga priekšskatījums no pašreizējiem laukiem šajā solī.
          </div>
          <div className="h-[540px] overflow-y-auto bg-background">
            <BlogInlinePreview post={blogPost} products={campProducts ?? []} />
          </div>
        </div>
      )}
      <div>
        <label className="text-xs font-semibold">Īss apraksts</label>
        <Textarea rows={2} value={blogPost.excerpt ?? ""} onChange={(e) => setBlogPost({ ...blogPost, excerpt: e.target.value })} />
      </div>
      <div>
        <label className="text-xs font-semibold">Saturs</label>
        <RichTextEditor value={blogPost.content ?? ""} onChange={(html) => setBlogPost({ ...blogPost, content: html })} />
      </div>

      <div className="border-t pt-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold">Pieejams līdz (produktu beigu datums)</label>
            <Input type="date" value={isoToDateInput(expiresAt ? new Date(expiresAt + "T00:00:00Z").toISOString() : null)} onChange={(e) => setExpiresAt(e.target.value)} />
            <p className="text-[10px] text-muted-foreground mt-1">Pēc noklusējuma — 1 diena pirms svētkiem.</p>
          </div>
          <div className="flex items-end gap-2">
            <Checkbox id="collection" checked={addToCollection} onCheckedChange={(v) => setAddToCollection(v === true)} />
            <label htmlFor="collection" className="text-sm font-body cursor-pointer">
              Pievienot pie "Mūsu kolekcija" ar "Jaunums" zīmīti
            </label>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          <strong>{campProductsCount}</strong> produkti un <strong>1</strong> bloga raksts tiks publicēti vienlaikus.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 sticky bottom-0 z-20 bg-zinc-900 text-white border-t border-zinc-800 shadow-[0_-6px_16px_rgba(0,0,0,0.18)] sm:rounded-t-lg -mx-3 sm:mx-0 -mb-3 sm:mb-0 px-3 sm:px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        <Button variant="outline" size="sm" onClick={onBack} className="flex-1 sm:flex-initial border-zinc-600 bg-zinc-800 text-white hover:bg-zinc-700 hover:text-white"><ArrowLeft className="w-4 h-4 mr-1.5" />Atpakaļ</Button>
        <Button variant="ghost" size="sm" disabled={busy === "save-blog"} onClick={onSave} className="flex-1 sm:flex-initial text-zinc-100 hover:bg-zinc-800 hover:text-white">
          {busy === "save-blog" ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
          Saglabāt
        </Button>
        <Button variant="ghost" size="sm" onClick={onClose} className="hidden sm:inline-flex text-zinc-200 hover:bg-zinc-800 hover:text-white">Saglabāt un turpināt vēlāk</Button>
        <div className="hidden sm:block flex-1" />
        <Button size="sm" className="bg-primary w-full sm:w-auto" disabled={busy === "publish" || campProductsCount === 0} onClick={onPublish}>
          {busy === "publish" ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
          PUBLICĒT VISU
        </Button>
      </div>
    </div>
  );
}

function PublishSuccess({ success, onClose }: { success: { products: number; blogSlug: string | null; expires: string | null }; onClose: () => void }) {
  const dateLabel = success.expires ? new Date(success.expires).toLocaleDateString("lv-LV") : "—";
  return (
    <div className="py-8 space-y-4 text-center">
      <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
      <h3 className="font-display text-2xl">Kampaņa palaista!</h3>
      <p className="text-sm text-muted-foreground">
        Aktīvi: <strong>{success.products} produkti</strong>, 1 bloga raksts. Pieejami līdz <strong>{dateLabel}</strong>.
      </p>
      <div className="flex justify-center gap-2 pt-2 flex-wrap">
        {success.blogSlug && (
          <Button asChild variant="outline">
            <a href={`/blog/${success.blogSlug}`} target="_blank" rel="noreferrer">
              <ExternalLink className="w-4 h-4 mr-1.5" /> Atvērt blogu
            </a>
          </Button>
        )}
        <Button asChild variant="outline">
          <a href="/musu-kolekcija" target="_blank" rel="noreferrer">
            <ExternalLink className="w-4 h-4 mr-1.5" /> Mūsu kolekcija
          </a>
        </Button>
        <Button onClick={onClose}>Aizvērt</Button>
      </div>
    </div>
  );
}

/* -------- Live print preview + tuning row -------- */
function ProductTuneRow({
  product, baseInfo, designUrl, busyKey,
  onUpdatePrintAdj, onRegenerate, onRemoveColor, onExcludeProduct, onSetCoverColor,
}: {
  product: CampProduct;
  baseInfo: CatalogProduct | null;
  designUrl: string | null;
  busyKey: string | null;
  onUpdatePrintAdj: (id: string, patch: { print_offset_y?: number; print_scale?: number }) => void;
  onRegenerate: (id: string) => void;
  onRemoveColor: (id: string, name: string) => void;
  onExcludeProduct: (id: string) => Promise<void>;
  onSetCoverColor: (id: string, name: string) => void;
}) {
  const [offsetY, setOffsetY] = useState<number>(product.print_offset_y ?? 0);
  const [scale, setScale] = useState<number>(product.print_scale ?? 1);
  const [autoSaving, setAutoSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const saveTimer = useRef<number | null>(null);
  const lastSaved = useRef<{ y: number; s: number }>({ y: offsetY, s: scale });
  const deleting = busyKey === `delete-${product.id}`;

  // Reset local state when product changes (e.g. after regen reload)
  useEffect(() => {
    setOffsetY(product.print_offset_y ?? 0);
    setScale(product.print_scale ?? 1);
    lastSaved.current = { y: product.print_offset_y ?? 0, s: product.print_scale ?? 1 };
  }, [product.id, product.print_offset_y, product.print_scale]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
    };
  }, []);

  const scheduleSave = (y: number, s: number) => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      if (lastSaved.current.y === y && lastSaved.current.s === s) return;
      setAutoSaving(true);
      try {
        await onUpdatePrintAdj(product.id, { print_offset_y: y, print_scale: s });
        lastSaved.current = { y, s };
        await onRegenerate(product.id);
      } finally {
        setAutoSaving(false);
      }
    }, 600);
  };

  // Flush save+regen immediately on pointer release so user adjustments aren't lost
  // if they move on before the debounce timer fires.
  const flushSave = async () => {
    if (deleting) return;
    if (saveTimer.current) { window.clearTimeout(saveTimer.current); saveTimer.current = null; }
    if (lastSaved.current.y === offsetY && lastSaved.current.s === scale) return;
    setAutoSaving(true);
    try {
      await onUpdatePrintAdj(product.id, { print_offset_y: offsetY, print_scale: scale });
      lastSaved.current = { y: offsetY, s: scale };
      await onRegenerate(product.id);
    } finally {
      setAutoSaving(false);
    }
  };

  const updateOffset = (v: number) => {
    if (deleting) return;
    const clamped = Math.max(-0.3, Math.min(0.3, v));
    setOffsetY(clamped);
    scheduleSave(clamped, scale);
  };
  const updateScale = (v: number) => {
    if (deleting) return;
    const clamped = Math.max(0.4, Math.min(1.4, v));
    setScale(clamped);
    scheduleSave(offsetY, clamped);
  };

  const confirmDelete = async () => {
    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    setDeleteOpen(false);
    await onExcludeProduct(product.id);
  };

  // Sliders only — touch/pinch/wheel intentionally disabled to avoid accidental drag while scrolling.
  // Show the currently selected cover color's base mockup as a last-resort fallback only.
  const coverColorName = product.color_variants[0]?.name;
  const baseImg =
    baseInfo?.color_variants?.find((cv) => cv.name === coverColorName && cv.images?.[0])?.images?.[0]
    ?? baseInfo?.color_variants?.find((cv) => cv.images?.[0])?.images?.[0]
    ?? product.image_url;
  const exactMockupUrl = product.image_url ?? product.color_variants[0]?.images?.[0] ?? baseImg ?? null;

  // Live overlay: render base shirt + design positioned by current slider values, mirroring composeMockup().
  const printArea = baseInfo?.print_area ?? { x: 0.3, y: 0.25, w: 0.4, h: 0.45 };
  const [baseDims, setBaseDims] = useState<{ w: number; h: number } | null>(null);
  const [designDims, setDesignDims] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    setBaseDims(null);
    if (!baseImg) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setBaseDims({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = baseImg;
  }, [baseImg]);
  useEffect(() => {
    setDesignDims(null);
    if (!designUrl) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setDesignDims({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = designUrl;
  }, [designUrl]);

  const canLivePreview = !!designUrl && !!baseImg && !!baseDims && !!designDims;
  let overlayStyle: React.CSSProperties | null = null;
  if (canLivePreview && baseDims && designDims) {
    const rw = printArea.w;
    const rh = printArea.h;
    const aspect = designDims.w / designDims.h;
    // contain design inside print-area rect (in image-pixel space)
    const rectPxW = rw * baseDims.w;
    const rectPxH = rh * baseDims.h;
    let dwPx = rectPxW;
    let dhPx = rectPxW / aspect;
    if (dhPx > rectPxH) { dhPx = rectPxH; dwPx = rectPxH * aspect; }
    dwPx *= scale; dhPx *= scale;
    const dxPx = printArea.x * baseDims.w + (rectPxW - dwPx) / 2;
    const dyPx = printArea.y * baseDims.h + (rectPxH - dhPx) / 2 + offsetY * rectPxH;
    overlayStyle = {
      position: "absolute",
      left: `${(dxPx / baseDims.w) * 100}%`,
      top: `${(dyPx / baseDims.h) * 100}%`,
      width: `${(dwPx / baseDims.w) * 100}%`,
      height: `${(dhPx / baseDims.h) * 100}%`,
      pointerEvents: "none",
    };
  }
  const baseAspect = baseDims ? `${baseDims.w} / ${baseDims.h}` : undefined;

  return (
    <div className="border rounded p-2 sm:p-3 space-y-3">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-3">
        {/* Live preview */}
        <div className="relative w-full sm:w-56 aspect-square sm:aspect-auto sm:h-56 rounded border bg-white overflow-hidden shrink-0 select-none">
          {canLivePreview ? (
            <div
              className="absolute inset-0 m-auto"
              style={{ aspectRatio: baseAspect, maxWidth: "100%", maxHeight: "100%", position: "relative" }}
            >
              <img
                src={baseImg!}
                alt=""
                className="absolute inset-0 w-full h-full object-fill pointer-events-none"
                draggable={false}
              />
              {overlayStyle && designUrl && (
                <img
                  src={designUrl}
                  alt=""
                  style={overlayStyle}
                  className="object-contain pointer-events-none"
                  draggable={false}
                />
              )}
            </div>
          ) : exactMockupUrl ? (
            <img
              src={exactMockupUrl}
              alt=""
              className={`absolute inset-0 w-full h-full object-contain pointer-events-none transition-opacity ${autoSaving ? "opacity-60" : "opacity-100"}`}
              draggable={false}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground">
              Nav mockup attēla
            </div>
          )}
          {autoSaving && (
            <div className="absolute bottom-1 left-1 right-1 text-[10px] bg-background/80 rounded px-1.5 py-0.5 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Saglabājas…
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-sm font-body truncate">{product.name_lv || product.name}</div>
          <div className="text-[10px] text-muted-foreground">{product.color_variants.length} krāsas</div>
          <div className="mt-2 grid grid-cols-1 gap-2 text-[11px]">
            <label className="space-y-1">
              <div className="flex justify-between"><span>Vertikāli</span><span className="text-muted-foreground">{(offsetY * 100).toFixed(0)}%</span></div>
              <input
                type="range" min={-0.3} max={0.3} step={0.005}
                value={offsetY}
                onChange={(e) => updateOffset(parseFloat(e.target.value))}
                onPointerUp={flushSave}
                onTouchEnd={flushSave}
                className="w-full accent-primary"
              />
            </label>
            <label className="space-y-1">
              <div className="flex justify-between"><span>Mērogs</span><span className="text-muted-foreground">{(scale * 100).toFixed(0)}%</span></div>
              <input
                type="range" min={0.4} max={1.4} step={0.01}
                value={scale}
                onChange={(e) => updateScale(parseFloat(e.target.value))}
                onPointerUp={flushSave}
                onTouchEnd={flushSave}
                className="w-full accent-primary"
              />
            </label>
          </div>
        </div>
        <div className="flex sm:flex-col gap-1 justify-end">
          <Button
            size="sm"
            variant="outline"
            disabled={!designUrl || downloading}
            onClick={async () => {
              if (!designUrl) return;
              setDownloading(true);
              try {
                const safe = (product.name_lv || product.name || "drukas-fails")
                  .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
                await downloadPrintReadyPng({
                  imageUrl: designUrl,
                  fileName: `${safe}-print.png`,
                });
                toast.success("Drukas fails lejupielādēts");
              } catch (e: any) {
                toast.error(e?.message || "Neizdevās sagatavot drukas failu");
              } finally {
                setDownloading(false);
              }
            }}
            title="Lejuplādēt oriģinālo print failu ar caurspīdīgu fonu"
          >
            {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          </Button>
          <Button size="sm" variant="ghost" className="text-destructive" disabled={deleting} onClick={() => setDeleteOpen(true)} title="Izslēgt no kampaņas">
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>
      {product.color_variants.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground">
            Klikšķini uz krāsas, lai uzliktu to kā kartītes bildi blogā. ✕ noņem krāsu.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {product.color_variants.map((c, idx) => {
              const isCover = idx === 0;
              return (
                <div
                  key={c.name}
                  className={`flex items-center gap-1 border rounded-full pl-1 pr-1 py-0.5 ${
                    isCover ? "border-primary bg-primary/10 ring-1 ring-primary" : "hover:border-foreground/40"
                  }`}
                  title={isCover ? `${c.name} (kartītes krāsa)` : `Uzlikt ${c.name} kā kartītes krāsu`}
                >
                  <button
                    type="button"
                    onClick={() => onSetCoverColor(product.id, c.name)}
                    className="flex items-center gap-1"
                  >
                    <span className="w-4 h-4 rounded-full border" style={{ backgroundColor: c.hex }} />
                    <span className="text-[10px]">{c.name}</span>
                    {isCover && <span className="text-[9px] text-primary font-semibold">★</span>}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Noņemt krāsu "${c.name}"?`)) onRemoveColor(product.id, c.name);
                    }}
                    className="text-muted-foreground hover:text-destructive ml-0.5"
                    title={`Noņemt ${c.name}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {busyKey === ("regen-" + product.id) && !autoSaving && (
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" /> Atjauno visu krāsu mockups…
        </p>
      )}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Izslēgt šo produktu?</AlertDialogTitle>
            <AlertDialogDescription>
              Produkta melnraksts tiks dzēsts no šīs kampaņas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Atcelt</AlertDialogCancel>
            <AlertDialogAction disabled={deleting} onClick={(e) => {
              e.preventDefault();
              void confirmDelete();
            }}>
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Dzēst"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ------------ Single design card with prompt-edit + regenerate ------------ */
function DesignCard({
  d,
  signedUrls,
  regenSingleId,
  styleChoice,
  onToggleStar,
  onSaveToLibrary,
  onRegenSingleDesign,
  showOnShirt,
  shirtColor,
  favorited,
  onSaveAndRemoveBg,
  bgRemoving,
}: {
  d: DesignRow;
  signedUrls: Record<string, string>;
  regenSingleId: string | null;
  styleChoice: string;
  onToggleStar: (d: DesignRow) => void;
  onSaveToLibrary?: (d: DesignRow) => void;
  onRegenSingleDesign: (id: string, model?: "auto" | "ideogram" | "recraft" | "flux-pro" | "flux-schnell" | "nano-banana" | "seedream") => void;
  showOnShirt?: boolean;
  shirtColor?: "white" | "black";
  favorited?: boolean;
  onSaveAndRemoveBg?: (d: DesignRow) => void;
  bgRemoving?: boolean;
}) {
  // local helper rendered inline below; defined here to keep it scoped
  const ShirtPreview = ({ src, color, busy: b, children }: { src: string; color: "white" | "black"; busy: boolean; children?: React.ReactNode }) => (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Simple t-shirt silhouette */}
      <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet">
        <path
          d="M40 50 L70 25 Q100 45 130 25 L160 50 L185 75 L165 95 L150 80 L150 180 L50 180 L50 80 L35 95 L15 75 Z"
          fill={color === "white" ? "#f5f5f5" : "#1a1a1a"}
          stroke={color === "white" ? "#d0d0d0" : "#000"}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
      <img
        src={src}
        loading="lazy"
        alt=""
        className={`relative w-[42%] h-[42%] object-contain ${b ? "opacity-30" : ""}`}
        style={{ transform: "translateY(8%)", mixBlendMode: color === "black" ? "screen" : "multiply" }}
      />
      {children}
    </div>
  );

  const [editing, setEditing] = useState(false);
  const [draftModel, setDraftModel] = useState<"auto" | "ideogram" | "recraft" | "flux-pro" | "flux-schnell" | "nano-banana" | "seedream">("auto");

  const busy = regenSingleId === d.id;
  const [fallbackSrc, setFallbackSrc] = useState<string | null>(null);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const baseSigned = d.image_url ? signedUrls[d.image_url] : undefined;
  const isSvgAsset = !!baseSigned && /(?:\.svg(?:\?|$)|[?&]format=svg\b)/i.test(baseSigned);
  const imgSrc = fallbackSrc ?? (baseSigned ? (isSvgAsset ? baseSigned : getOptimizedSrc(baseSigned, 400, 70)) : null);

  // If the signed URL fails (expired / 404), try to re-sign once or fall back
  // to the raw http URL when image_url is already an absolute URL.
  const handleImgError = async () => {
    if (!d.image_url || fallbackSrc) return;
    if (/^https?:\/\//i.test(d.image_url)) { setFallbackSrc(d.image_url); return; }
    try {
      await supabase.auth.refreshSession().catch(() => {});
      const { data } = await supabase.storage
        .from("campaign-assets")
        .createSignedUrl(d.image_url, 60 * 60);
      if (data?.signedUrl) {
        setFallbackSrc(data.signedUrl);
        return;
      }
    } catch (_) { /* give up — show error UI */ }
    setImageLoadFailed(true);
  };

  return (
    <div className="relative group aspect-square rounded border bg-muted/30 overflow-hidden">
      {imgSrc && !imageLoadFailed && showOnShirt ? (
        <ShirtPreview src={imgSrc} color={shirtColor || "white"} busy={busy}>
          <button
            onClick={() => onToggleStar(d)}
            className={`absolute top-1 right-1 p-1 rounded-full transition z-10 ${d.is_primary ? "bg-primary text-primary-foreground" : "bg-background/80"}`}
            title={d.is_primary ? "Noņemt ★" : "Atzīmēt ★"}
          >
            <Star className={`w-4 h-4 ${d.is_primary ? "fill-current" : ""}`} />
          </button>
          <button
            onClick={() => { setDraftModel("auto"); setEditing(true); }}
            className="absolute top-1 left-1 p-1 rounded-full bg-background/80 transition z-10"
            title="Pārģenerēt"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </ShirtPreview>
      ) : imgSrc && !imageLoadFailed ? (
        <>
          <img
            src={imgSrc}
            loading="lazy"
            alt=""
            className={`w-full h-full object-cover ${busy ? "opacity-30" : ""}`}
            onError={handleImgError}
          />
          <button
            onClick={() => onToggleStar(d)}
            className={`absolute top-1 right-1 p-1 rounded-full transition ${d.is_primary ? "bg-primary text-primary-foreground" : "bg-background/80 opacity-0 group-hover:opacity-100"}`}
            title={d.is_primary ? "Noņemt ★" : "Atzīmēt ★"}
          >
            <Star className={`w-4 h-4 ${d.is_primary ? "fill-current" : ""}`} />
          </button>
          <button
            onClick={() => { setDraftModel("auto"); setEditing(true); }}
            className="absolute top-1 left-1 p-1 rounded-full bg-background/80 opacity-0 group-hover:opacity-100 transition"
            title="Pārģenerēt"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {onSaveToLibrary && (
            <button
              onClick={() => onSaveToLibrary(d)}
              className={`absolute bottom-1 right-1 p-1 rounded-full transition ${favorited ? "bg-rose-500 text-white opacity-100" : "bg-background/80 opacity-0 group-hover:opacity-100"}`}
              title={favorited ? "Bibliotēkā" : "Saglabāt bibliotēkā"}
            >
              <Heart className={`w-4 h-4 ${favorited ? "fill-current text-white" : "text-rose-500"}`} />
            </button>
          )}
          {onSaveAndRemoveBg && (
            <button
              onClick={() => onSaveAndRemoveBg(d)}
              disabled={!!bgRemoving}
              className="absolute bottom-1 left-1 p-1 rounded-full bg-background/80 opacity-0 group-hover:opacity-100 transition disabled:opacity-100"
              title="Saglabāt bibliotēkā un noņemt fonu"
            >
              {bgRemoving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eraser className="w-4 h-4" />}
            </button>
          )}
        </>
      ) : d.generation_error || imageLoadFailed ? (
        <div className="p-3 text-[10px] text-destructive flex flex-col items-center justify-center h-full text-center gap-2 bg-destructive/5">
          <span className="text-xl leading-none">⚠</span>
          <span className="line-clamp-4 max-w-full break-words">
            {imageLoadFailed ? "Neizdevās ielādēt ģenerēto attēlu. Pārģenerē šo dizainu." : summarizeGenerationError(d.generation_error)}
          </span>
          <button
            onClick={() => { setDraftModel("auto"); setEditing(true); }}
            className="underline text-foreground"
          >
            Mēģināt vēlreiz
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {busy && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/60">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      )}

      {editing && (
        <div className="absolute inset-0 z-10 bg-background/95 p-3 flex flex-col gap-2 justify-center">
          <div className="flex items-center gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              AI modelis
            </label>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-muted-foreground hover:text-foreground transition">
                  <Info className="w-3 h-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs text-xs space-y-1.5">
                <p><b>Auto</b> — ieteicams 99% gadījumu.</p>
                <p><b>Ideogram</b> — precīzs teksts.</p>
                <p><b>Recraft</b> — tīras ilustrācijas.</p>
                <p><b>Flux Pro</b> — kinematogrāfisks.</p>
                <p><b>Flux Schnell</b> — ātrs melnraksts.</p>
                <p><b>Nano Banana</b> — dabas kompozīcijas.</p>
                <p><b>Seedream</b> — gleznains, māksliniecisks.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <select
            value={draftModel}
            onChange={(e) => setDraftModel(e.target.value as "auto" | "ideogram" | "recraft" | "flux-pro" | "flux-schnell" | "nano-banana" | "seedream")}
            className="text-xs rounded border border-border bg-card px-2 py-1.5 font-body"
          >
            <option value="auto">Auto (ieteicams)</option>
            <option value="ideogram">Ideogram — precīzs teksts</option>
            <option value="recraft">Recraft — tīras ilustrācijas</option>
            <option value="flux-pro">Flux Pro — kinematogrāfisks</option>
            <option value="flux-schnell">Flux Schnell — ātrs melnraksts</option>
            <option value="nano-banana">Nano Banana — dabas kompozīcijas</option>
            <option value="seedream">Seedream — gleznains, māksliniecisks</option>
          </select>
          <div className="flex gap-1.5 mt-1">
            <Button
              size="sm"
              className="flex-1 h-8 text-xs"
              disabled={busy}
              onClick={() => { setEditing(false); onRegenSingleDesign(d.id, draftModel); }}
            >
              <Wand2 className="w-3.5 h-3.5 mr-1" /> Ģenerēt
            </Button>
            <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditing(false)}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------ Library picker sheet (favorited / saved designs) ------------ */
function LibrarySheet({
  open, onOpenChange, onPick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPick: (item: { id: string; name: string; file_path: string }) => void;
}) {
  const [items, setItems] = useState<{ id: string; name: string; file_path: string; tags: string[]; created_at: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [bgRemovingId, setBgRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("design_library")
        .select("id, name, file_path, tags, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      setItems((data as any) ?? []);
      setLoading(false);
    })();
  }, [open]);

  const publicUrl = (p: string) =>
    supabase.storage.from("design-library").getPublicUrl(p).data.publicUrl;

  const handleRemoveBg = async (item: { id: string; name: string }) => {
    if (!confirm(`Noņemt fonu "${item.name}"? Oriģināls tiks aizstāts ar caurspīdīgu PNG.`)) return;
    setBgRemovingId(item.id);
    try {
      const data = await removeDesignBackground([item.id], true);
      const ok = data?.ok ?? 0;
      const failed = data?.failed ?? 0;
      if (ok) toast.success("Fons noņemts");
      if (failed) {
        const firstError = data?.results?.find((row) => !row.ok)?.error;
        toast.error(firstError || "Neizdevās noņemt fonu");
      }
      const { data: refreshed } = await supabase
        .from("design_library")
        .select("id, name, file_path, tags, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      setItems((refreshed as any) ?? []);
    } catch (e: any) {
      toast.error(e?.message || "Fona noņemšana neizdevās");
    } finally {
      setBgRemovingId(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-500" /> Saglabāto dizainu bibliotēka
          </SheetTitle>
        </SheetHeader>
        <p className="text-xs text-muted-foreground mt-2">
          Klikšķini uz dizaina, lai pievienotu to šai kampaņai. Pievienotais tiks automātiski atzīmēts ★ un izmantots krekliem.
        </p>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-10">
            Nav saglabātu dizainu. Atver dizainu un nospied ♥, lai pievienotu bibliotēkai.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 mt-3">
            {items.map((it) => (
              <div
                key={it.id}
                className="relative aspect-square rounded border bg-white overflow-hidden hover:ring-2 hover:ring-primary transition"
                title={it.name}
              >
                <button
                  type="button"
                  disabled={adding === it.id}
                  onClick={async () => { setAdding(it.id); try { await onPick(it); } finally { setAdding(null); } }}
                  className="absolute inset-0"
                  aria-label={`Pievienot dizainu ${it.name}`}
                >
                <img src={publicUrl(it.file_path)} alt={it.name} loading="lazy" className="w-full h-full object-contain" />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); void handleRemoveBg(it); }}
                  disabled={bgRemovingId === it.id}
                  className="absolute right-1 top-1 z-10 rounded bg-black/70 p-1 text-white hover:bg-primary transition-all"
                  title="Noņemt fonu"
                  aria-label="Noņemt fonu"
                >
                  {bgRemovingId === it.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eraser className="w-3 h-3" />}
                </button>
                {adding === it.id && (
                  <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                )}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 text-[10px] text-white truncate text-left">
                  {it.name}
                </div>
              </div>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

/* ------------ Generation settings panel ------------ */
function GenerationSettings({
  styleChoice, onChangeStyle,
  transparentBg, onChangeTransparentBg,
  imageSize, onChangeImageSize,
  preferredColors, onChangePreferredColors,
  usePalette, onChangeUsePalette,
  modelChoice, onChangeModelChoice,
}: {
  styleChoice: string;
  onChangeStyle: (v: string) => void;
  transparentBg: boolean;
  onChangeTransparentBg: (v: boolean) => void;
  imageSize: string;
  onChangeImageSize: (v: string) => void;
  preferredColors: { r: number; g: number; b: number }[];
  onChangePreferredColors: (v: { r: number; g: number; b: number }[]) => void;
  usePalette: boolean;
  onChangeUsePalette: (v: boolean) => void;
  modelChoice: "auto" | "ideogram" | "recraft" | "flux-pro" | "flux-schnell" | "nano-banana" | "seedream";
  onChangeModelChoice: (v: "auto" | "ideogram" | "recraft" | "flux-pro" | "flux-schnell" | "nano-banana" | "seedream") => void;
}) {
  const [open, setOpen] = useState(true);
  const [newColor, setNewColor] = useState("#dc2626");
  

  const addColor = () => {
    const rgb = hexToRgb(newColor);
    if (!rgb || preferredColors.length >= 5) return;
    onChangePreferredColors([...preferredColors, rgb]);
  };
  const removeColor = (idx: number) =>
    onChangePreferredColors(preferredColors.filter((_, i) => i !== idx));

  return (
    <div className="rounded border bg-muted/20">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold"
      >
        <span>AI ģenerēšanas iestatījumi {open ? "▾" : "▸"}</span>
        <span className="text-[10px] font-normal text-muted-foreground truncate ml-2">
          {({
            auto: "Auto",
            ideogram: "Teksta prioritāte",
            recraft: "Ilustrācijas prioritāte",
            "flux-pro": "Detalizēts",
            "flux-schnell": "Ātrs",
            "nano-banana": "Eksperimentāls",
            seedream: "Māksliniecisks",
          } as Record<string, string>)[modelChoice]} ·{" "}
          {STYLE_PRESETS.find((s) => s.value === styleChoice)?.label || styleChoice}
          {transparentBg ? " · caurspīdīgs" : ""}
          {usePalette ? " · palete" : ""}
        </span>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-3 border-t pt-3">
          <div>
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                AI modelis
              </label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-muted-foreground hover:text-foreground transition">
                    <Info className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs text-xs space-y-1.5">
                  <p><b>Auto</b> — ieteicams 99% gadījumu. Sistēma pati izvēlas: tekstiem Ideogram, ilustrācijām Recraft.</p>
                  <p><b>Teksta prioritāte (Ideogram)</b> — visprecīzākais latviešu teksts. Izvēlies, ja dizainā ir sauklis.</p>
                  <p><b>Ilustrācijas prioritāte (Recraft)</b> — tīras ilustrācijas, minimāli teksta artefakti. Labs uzlīmēm un logo.</p>
                  <p><b>Detalizēts plakāta stils (Flux Pro)</b> — kinematogrāfisks, bagāts ar detaļām. Teksts var būt neprecīzs.</p>
                  <p><b>Ātrāks melnraksts (Flux Schnell)</b> — ātrs un lēts kompozīcijas priekšskatījums.</p>
                  <p><b>Eksperimentāls (Nano Banana = Gemini)</b> — labs dabas ainavām un kompozīcijām, teksts bieži garāmots.</p>
                  <p><b>Māksliniecisks (Seedream)</b> — ļoti stilīgs, gleznains rezultāts. Laba mākslas printa sajūta, teksts vājš.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <select
              value={modelChoice}
              onChange={(e) => onChangeModelChoice(e.target.value as "auto" | "ideogram" | "recraft" | "flux-pro" | "flux-schnell" | "nano-banana" | "seedream")}
              className="mt-1 w-full text-xs rounded border border-border bg-card px-2 py-1.5 font-body"
            >
              <option value="auto">Auto (ieteicams)</option>
              <option value="ideogram">Ideogram — precīzs teksts</option>
              <option value="recraft">Recraft — tīras ilustrācijas</option>
              <option value="flux-pro">Flux Pro — kinematogrāfisks</option>
              <option value="flux-schnell">Flux Schnell — ātrs melnraksts</option>
              <option value="nano-banana">Nano Banana — dabas kompozīcijas</option>
              <option value="seedream">Seedream — gleznains, māksliniecisks</option>
            </select>
            <p className="text-[10px] text-muted-foreground mt-1">
              <b>Auto:</b> ja dizainā ir teksts, sistēma dod prioritāti teksta precizitātei; citādi ilustrācijas kvalitātei.
            </p>
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Stils</label>
            <select
              value={styleChoice}
              onChange={(e) => onChangeStyle(e.target.value)}
              
              className="mt-1 w-full text-xs rounded border border-border bg-card px-2 py-1.5 font-body disabled:opacity-50"
            >
              {STYLE_GROUPS.map((g) => (
                <optgroup key={g.group} label={g.group}>
                  {g.options.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>


          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Izmērs</label>
            <select
              value={imageSize}
              onChange={(e) => onChangeImageSize(e.target.value)}
              className="mt-1 w-full text-xs rounded border border-border bg-card px-2 py-1.5 font-body"
            >
              {IMAGE_SIZES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={transparentBg}
              onChange={(e) => onChangeTransparentBg(e.target.checked)}
              className="rounded"
            />
            <span className="text-xs">Caurspīdīgs fons</span>
          </label>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Vēlamās krāsas (līdz 5)
            </label>
            <label className="flex items-center gap-2 cursor-pointer mt-1 mb-1.5">
              <input
                type="checkbox"
                checked={usePalette}
                onChange={(e) => onChangeUsePalette(e.target.checked)}
                className="rounded"
              />
              <span className="text-xs">Izmantot krāsu paleti</span>
            </label>
            {!usePalette && (
              <p className="text-[10px] text-muted-foreground">
                Izslēgts — AI brīvi izvēlas krāsas atbilstoši saturam.
              </p>
            )}
            <div className={`flex flex-wrap gap-1.5 items-center mt-1 ${usePalette ? "" : "opacity-40 pointer-events-none"}`}>
              {preferredColors.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => removeColor(i)}
                  title="Noņemt"
                  className="w-7 h-7 rounded border relative group"
                  style={{ backgroundColor: rgbToHex(c) }}
                >
                  <X className="w-3 h-3 absolute inset-0 m-auto text-white drop-shadow opacity-0 group-hover:opacity-100" />
                </button>
              ))}
              {preferredColors.length < 5 && (
                <div className="flex items-center gap-1">
                  <input
                    type="color"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    className="w-7 h-7 rounded border cursor-pointer"
                  />
                  <Button type="button" size="sm" variant="outline" className="h-7 text-[11px]" onClick={addColor}>
                    + Pievienot
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}