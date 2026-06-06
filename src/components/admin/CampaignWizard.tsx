import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, RefreshCw, Star, Wand2, Package, FileText, Eye, X, ArrowLeft, ArrowRight, RotateCcw, Sparkles, CheckCircle2, ExternalLink, Trash2, Download, Heart, Library } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { downloadPrintReadyPng } from "@/lib/printFile";
import { toast } from "sonner";
import { composeMockup } from "@/lib/imageCrop";
import { RichTextEditor } from "./RichTextEditor";
import { getOptimizedSrc } from "@/lib/imageOptimization";

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

type ColorVariant = { name: string; hex: string; images: string[] };

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

/** Recraft V3 style presets (fal.ai) — full catalog, grouped. */
type StyleOpt = { value: string; label: string };
const STYLE_GROUPS: { group: string; options: StyleOpt[] }[] = [
  { group: "Vektors", options: [
    { value: "vector_illustration", label: "Vektors (klasisks)" },
    { value: "vector_illustration/line_art", label: "Line Art" },
    { value: "vector_illustration/linocut", label: "Linogrievums" },
    { value: "vector_illustration/line_circuit", label: "Tehno līnijas" },
    { value: "vector_illustration/bold_stroke", label: "Treknas līnijas" },
    { value: "vector_illustration/cutout", label: "Izgriezums" },
    { value: "vector_illustration/engraving", label: "Gravīra" },
    { value: "vector_illustration/editorial", label: "Editorial" },
    { value: "vector_illustration/emotional_flat", label: "Emocionāls flat" },
    { value: "vector_illustration/infographical", label: "Infografika" },
    { value: "vector_illustration/marker_outline", label: "Markeris" },
    { value: "vector_illustration/mosaic", label: "Mozaīka" },
    { value: "vector_illustration/naivector", label: "Naivs vektors" },
    { value: "vector_illustration/roundish_flat", label: "Apaļš flat" },
    { value: "vector_illustration/segmented_colors", label: "Segmentētas krāsas" },
    { value: "vector_illustration/sharp_contrast", label: "Asa kontrasta" },
    { value: "vector_illustration/thin", label: "Tievas līnijas" },
    { value: "vector_illustration/vivid_shapes", label: "Spilgtas formas" },
    { value: "vector_illustration/contour_pop_art", label: "Contour Pop Art" },
    { value: "vector_illustration/cosmics", label: "Cosmics" },
    { value: "vector_illustration/chemistry", label: "Ķīmija" },
    { value: "vector_illustration/colored_stencil", label: "Krāsains šablons" },
    { value: "vector_illustration/depressive", label: "Drūms" },
  ] },
  { group: "Ilustrācija", options: [
    { value: "digital_illustration", label: "Ilustrācija (jaukta)" },
    { value: "digital_illustration/2d_art_poster", label: "Plakāts (2D)" },
    { value: "digital_illustration/2d_art_poster_2", label: "Plakāts (2D) v2" },
    { value: "digital_illustration/hand_drawn", label: "Roku zīmēts" },
    { value: "digital_illustration/hand_drawn_outline", label: "Kontūru zīmējums" },
    { value: "digital_illustration/pixel_art", label: "Pixel Art" },
    { value: "digital_illustration/grain", label: "Tekstūrēts (grain)" },
    { value: "digital_illustration/infantile_sketch", label: "Bērnišķīga skice" },
    { value: "digital_illustration/handmade_3d", label: "Roku 3D" },
    { value: "digital_illustration/engraving_color", label: "Gravīra (krāsā)" },
    { value: "digital_illustration/antiquarian", label: "Antikvariāts" },
    { value: "digital_illustration/bold_fantasy", label: "Fantāzija" },
    { value: "digital_illustration/child_book", label: "Bērnu grāmata" },
    { value: "digital_illustration/cover", label: "Vāks" },
    { value: "digital_illustration/crosshatch", label: "Crosshatch" },
    { value: "digital_illustration/digital_engraving", label: "Digitāla gravīra" },
    { value: "digital_illustration/expressionism", label: "Ekspresionisms" },
    { value: "digital_illustration/freehand_details", label: "Freehand detaļas" },
    { value: "digital_illustration/graphic_intensity", label: "Grafiska intensitāte" },
    { value: "digital_illustration/hard_comics", label: "Komiksi" },
    { value: "digital_illustration/long_shadow", label: "Long Shadow" },
    { value: "digital_illustration/modern_folk", label: "Mūsdienu folkloras" },
    { value: "digital_illustration/multicolor", label: "Daudzkrāsains" },
    { value: "digital_illustration/neon_calm", label: "Neona miers" },
    { value: "digital_illustration/noir", label: "Noir" },
    { value: "digital_illustration/nostalgic_pastel", label: "Nostalģisks pastelis" },
    { value: "digital_illustration/outline_details", label: "Kontūras + detaļas" },
    { value: "digital_illustration/pastel_gradient", label: "Pastelis gradients" },
    { value: "digital_illustration/pastel_sketch", label: "Pastelis skice" },
    { value: "digital_illustration/pop_art", label: "Pop Art" },
    { value: "digital_illustration/pop_renaissance", label: "Pop Renesanse" },
    { value: "digital_illustration/street_art", label: "Street Art" },
    { value: "digital_illustration/tablet_sketch", label: "Planšetes skice" },
    { value: "digital_illustration/urban_glow", label: "Urban Glow" },
    { value: "digital_illustration/urban_sketching", label: "Urban skice" },
    { value: "digital_illustration/vanilla_dreams", label: "Vanilla sapņi" },
    { value: "digital_illustration/young_adult_book", label: "Jaunatnes grāmata" },
  ] },
  { group: "Reālistisks", options: [
    { value: "realistic_image", label: "Reālistisks (klasisks)" },
    { value: "realistic_image/b_and_w", label: "Melnbalts" },
    { value: "realistic_image/hard_flash", label: "Cietā zibspuldze" },
    { value: "realistic_image/hdr", label: "HDR" },
    { value: "realistic_image/natural_light", label: "Dabiska gaisma" },
    { value: "realistic_image/studio_portrait", label: "Studijas portrets" },
    { value: "realistic_image/enterprise", label: "Enterprise" },
    { value: "realistic_image/motion_blur", label: "Kustības blur" },
    { value: "realistic_image/evening_light", label: "Vakara gaisma" },
    { value: "realistic_image/faded_nostalgia", label: "Izbalējusi nostalģija" },
    { value: "realistic_image/forest_life", label: "Meža dzīve" },
    { value: "realistic_image/mystic_naturalism", label: "Mistisks naturalisms" },
    { value: "realistic_image/natural_tones", label: "Dabiskie toņi" },
    { value: "realistic_image/organic_calm", label: "Organisks miers" },
    { value: "realistic_image/real_life_glow", label: "Real life glow" },
    { value: "realistic_image/retro_realism", label: "Retro reālisms" },
    { value: "realistic_image/retro_snapshot", label: "Retro foto" },
    { value: "realistic_image/urban_drama", label: "Urbānā drāma" },
    { value: "realistic_image/village_realism", label: "Lauku reālisms" },
    { value: "realistic_image/warm_folk", label: "Silts folks" },
  ] },
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
  const [modelChoice, setModelChoice] = useState<"auto" | "ideogram" | "recraft">("auto");
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
      if (camp?.style) setStyleChoice(camp.style);
      if (camp) {
        setTransparentBg(!!camp.transparent_bg);
        setCustomStyleId(camp.custom_style_id || "");
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
      const paths = drows.filter((d) => d.image_url).map((d) => d.image_url as string);
      if (paths.length) {
        const { data: signed } = await supabase.storage.from("campaign-assets").createSignedUrls(paths, 60 * 60);
        const m: Record<string, string> = {};
        (signed ?? []).forEach((s, i) => { if (s.signedUrl) m[paths[i]] = s.signedUrl; });
        setSignedUrls(m);
      } else {
        setSignedUrls({});
      }

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
        .select("id, name, name_lv, image_url, color_variants, print_offset_y, print_scale, base_product_id")
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
          custom_style_id: customStyleId.trim() || null,
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
    model: "auto" | "ideogram" | "recraft" = modelChoice,
  ) => {
    if (!campaign) return;
    setRegenSingleId(designId);
    try {
      const { data, error } = await supabase.functions.invoke("generate-campaign-designs", {
        body: {
          campaign_id: campaign.id,
          design_id: designId,
          style: styleChoice,
          custom_style_id: customStyleId.trim() || null,
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
  const saveToLibrary = async (d: DesignRow) => {
    if (!d.image_url) { toast.error("Nav bildes"); return; }
    if (favoritedIds.has(d.id)) { toast.info("Jau bibliotēkā"); return; }
    try {
      // Download bytes from campaign-assets (private), upload to design-library (public)
      const signed = signedUrls[d.image_url];
      if (!signed) { toast.error("Nav URL"); return; }
      const res = await fetch(signed);
      if (!res.ok) throw new Error("Nevar lejupielādēt");
      const blob = await res.blob();
      const name = (campaign?.brief?.title_lv || campaign?.title || "Dizains").slice(0, 60);
      const path = `campaign-favorites/${campaign?.id}/${d.id}-${Date.now()}.png`;
      const up = await supabase.storage.from("design-library").upload(path, blob, {
        contentType: "image/png", upsert: false,
      });
      if (up.error) throw up.error;
      const { error: dbErr } = await supabase.from("design_library").insert({
        name, file_path: path, file_size: blob.size, tags: ["favorite", "campaign"],
      });
      if (dbErr) throw dbErr;
      setFavoritedIds((prev) => { const n = new Set(prev); n.add(d.id); return n; });
      toast.success("♥ Saglabāts bibliotēkā");
    } catch (e: any) {
      toast.error("Neizdevās: " + (e.message ?? e));
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
      const newDesignId = crypto.randomUUID();
      const path = `${campaign.id}/${newDesignId}-lib-${Date.now()}.png`;
      const up = await supabase.storage.from("campaign-assets").upload(path, blob, {
        contentType: "image/png", upsert: true,
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
      for (let di = 0; di < starred.length; di++) {
        const design = starred[di];
        const signed = signedUrls[design.image_url!];
        if (!signed) { toast.error(`Dizainam ${di + 1} nav URL`); continue; }
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
          const productName = starred.length > 1 ? `${baseTitle} — ${baseName} #${di + 1}` : `${baseTitle} — ${baseName}`;
          const slug = `${slugify(baseTitle)}-${slugify(baseName)}-${campaign.year}-${di + 1}-${Date.now().toString(36)}`;
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
            if (!design.product_id) await supabase.from("campaign_designs" as any).update({ product_id: (prod as any).id }).eq("id", design.id);
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
    const { error } = await supabase.from("products").update({ color_variants: next as any }).eq("id", productId);
    if (error) { toast.error(error.message); return; }
    setCampProducts((prev) => prev.map((x) => x.id === productId ? { ...x, color_variants: next } : x));
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

  const excludeProduct = async (productId: string) => {
    if (!confirm("Izslēgt šo produktu no kampaņas (dzēsts)?")) return;
    const { error } = await supabase.from("products").delete().eq("id", productId);
    if (error) { toast.error(error.message); return; }
    setCampProducts((prev) => prev.filter((x) => x.id !== productId));
    toast.success("Izslēgts");
  };

  const regenerateProductMockups = async (productId: string) => {
    if (!campaign) return;
    const p = campProducts.find((x) => x.id === productId);
    if (!p) return;
    if (!p.base_product_id) {
      toast.error("Šim produktam trūkst bāzes atsauces — atjauno 2. soli un ģenerē no jauna.");
      return;
    }
    // Find the design assigned to this product (or first starred)
    let designRow = designs.find((d) => d.product_id === productId && d.image_url);
    if (!designRow) designRow = designs.find((d) => d.is_primary && d.image_url);
    if (!designRow?.image_url) { toast.error("Nav saistīta dizaina"); return; }
    const designSigned = signedUrls[designRow.image_url];
    if (!designSigned) { toast.error("Dizaina URL trūkst"); return; }

    // Find the base catalog row for print_area
    const { data: baseRow } = await supabase.from("products")
      .select("id, print_area, color_variants")
      .eq("id", p.base_product_id).maybeSingle();
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
          const path = `campaigns/${campaign.id}/${designRow.id}/${p.base_product_id}/regen-${Date.now()}-${i}-${slugify(cv.name)}.jpg`;
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

  const saveBlog = async () => {
    if (!blogPost) return;
    setBusy("save-blog");
    const { error } = await supabase.from("blog_posts").update({
      title: blogPost.title, slug: blogPost.slug, excerpt: blogPost.excerpt,
      content: blogPost.content, cover_image_url: blogPost.cover_image_url,
    }).eq("id", blogPost.id);
    setBusy(null);
    if (error) toast.error(error.message);
    else toast.success("Saglabāts");
  };

  const publishAll = async () => {
    if (!campaign || !blogPost) { toast.error("Nav blog raksta"); return; }
    setBusy("publish");
    try {
      await saveBlog();
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
      <DialogContent className="block max-w-[100vw] sm:max-w-5xl w-screen sm:w-full max-h-[100dvh] sm:max-h-[92vh] h-[100dvh] sm:h-auto overflow-y-auto overflow-x-hidden p-3 sm:p-6 rounded-none sm:rounded-lg">
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
                setBlogPost={setBlogPost}
                designs={designs}
                signedUrls={signedUrls}
                campProductsCount={campProducts.length}
                expiresAt={expiresAt}
                setExpiresAt={setExpiresAt}
                addToCollection={addToCollection}
                setAddToCollection={setAddToCollection}
                busy={busy}
                onRegen={regenBlog}
                onSave={saveBlog}
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
                      Ja ievadi tekstu, automātiski izmanto AI modeli, kas labi zīmē burtus (Ideogram).
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
              fal.ai ģenerēšanas iestatījumi
            </h4>
            <GenerationSettings
              styleChoice={styleChoice}
              onChangeStyle={onChangeStyle}
              transparentBg={transparentBg}
              onChangeTransparentBg={onChangeTransparentBg}
              customStyleId={customStyleId}
              onChangeCustomStyleId={onChangeCustomStyleId}
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
              Stils, izmērs un krāsas tiek pielietoti, kad nākamajā solī ģenerēsi bildes. Idejas ar saukli vai latviešu garumzīmēm automātiski izmanto Ideogram v3.
            </p>
          </section>
        </>
      )}

      <div className="flex flex-wrap gap-2 sticky bottom-0 bg-zinc-900 text-white border-t border-zinc-800 shadow-[0_-6px_16px_rgba(0,0,0,0.18),0_200px_0_200px_rgb(24_24_27)] rounded-t-lg -mx-3 sm:mx-0 px-3 sm:px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
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
            customStyleId={customStyleId}
            onChangeCustomStyleId={onChangeCustomStyleId}
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
              const baseInfo = catalog.find((c: CatalogProduct) => c.id === p.base_product_id) || null;
              const designRow =
                designs.find((d: DesignRow) => d.product_id === p.id && d.image_url) ||
                designs.find((d: DesignRow) => d.is_primary && d.image_url);
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

      <div className="flex flex-wrap items-center gap-2 sticky bottom-0 bg-zinc-900 text-white border-t border-zinc-800 shadow-[0_-6px_16px_rgba(0,0,0,0.18),0_200px_0_200px_rgb(24_24_27)] rounded-t-lg -mx-3 sm:mx-0 px-3 sm:px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
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
  campaign, blogPost, setBlogPost, designs, signedUrls, campProductsCount,
  expiresAt, setExpiresAt, addToCollection, setAddToCollection,
  busy, onRegen, onSave, onPublish, onBack, onClose,
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
            <a href={`/blog/${blogPost.slug}?preview=1`} target="_blank" rel="noreferrer">
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
        <label className="text-xs font-semibold">Vāka attēla URL</label>
        <Input value={blogPost.cover_image_url ?? ""} onChange={(e) => setBlogPost({ ...blogPost, cover_image_url: e.target.value })} />
        {blogPost.cover_image_url && <img src={blogPost.cover_image_url} alt="" className="mt-2 max-h-32 rounded border" />}
      </div>
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

      <div className="flex flex-wrap items-center gap-2 sticky bottom-0 bg-zinc-900 text-white border-t border-zinc-800 shadow-[0_-6px_16px_rgba(0,0,0,0.18),0_200px_0_200px_rgb(24_24_27)] rounded-t-lg -mx-3 sm:mx-0 px-3 sm:px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
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
  onExcludeProduct: (id: string) => void;
  onSetCoverColor: (id: string, name: string) => void;
}) {
  const [offsetY, setOffsetY] = useState<number>(product.print_offset_y ?? 0);
  const [scale, setScale] = useState<number>(product.print_scale ?? 1);
  const [autoSaving, setAutoSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const saveTimer = useRef<number | null>(null);
  const lastSaved = useRef<{ y: number; s: number }>({ y: offsetY, s: scale });

  // Reset local state when product changes (e.g. after regen reload)
  useEffect(() => {
    setOffsetY(product.print_offset_y ?? 0);
    setScale(product.print_scale ?? 1);
    lastSaved.current = { y: product.print_offset_y ?? 0, s: product.print_scale ?? 1 };
  }, [product.id, product.print_offset_y, product.print_scale]);

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
    }, 1500);
  };

  const updateOffset = (v: number) => {
    const clamped = Math.max(-0.3, Math.min(0.3, v));
    setOffsetY(clamped);
    scheduleSave(clamped, scale);
  };
  const updateScale = (v: number) => {
    const clamped = Math.max(0.4, Math.min(1.4, v));
    setScale(clamped);
    scheduleSave(offsetY, clamped);
  };

  // Sliders only — touch/pinch/wheel intentionally disabled to avoid accidental drag while scrolling.
  const previewRef = useRef<HTMLDivElement | null>(null);
  const printArea = baseInfo?.print_area ?? DEFAULT_PRINT_AREA;
  // Show the currently selected cover color's base mockup in the live preview
  const coverColorName = product.color_variants[0]?.name;
  const baseImg =
    baseInfo?.color_variants?.find((cv) => cv.name === coverColorName && cv.images?.[0])?.images?.[0]
    ?? baseInfo?.color_variants?.find((cv) => cv.images?.[0])?.images?.[0]
    ?? product.image_url;

  // Compute design aspect for overlay sizing
  const [designAspect, setDesignAspect] = useState<number>(1);
  useEffect(() => {
    if (!designUrl) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setDesignAspect(img.naturalWidth / img.naturalHeight || 1);
    img.src = designUrl;
  }, [designUrl]);

  // Contain-fit inside print area, then user scale
  const areaAspect = printArea.w / printArea.h;
  let dwRel = printArea.w, dhRel = printArea.w / designAspect;
  if (designAspect < areaAspect) { dhRel = printArea.h; dwRel = printArea.h * designAspect; }
  dwRel *= scale; dhRel *= scale;
  const dxRel = printArea.x + (printArea.w - dwRel) / 2;
  const dyRel = printArea.y + (printArea.h - dhRel) / 2 + offsetY * printArea.h;

  return (
    <div className="border rounded p-2 sm:p-3 space-y-3">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-3">
        {/* Live preview */}
        <div
          ref={previewRef}
          className="relative w-full sm:w-56 aspect-square sm:aspect-auto sm:h-56 rounded border bg-white overflow-hidden shrink-0 select-none"
        >
          {/* Shirt + print area + design overlay (kept 1:1 so shirts never crop) */}
          <div className="absolute inset-0">
            {baseImg && (
              <img src={baseImg} alt="" className="absolute inset-0 w-full h-full object-contain pointer-events-none" draggable={false} />
            )}
            {/* Print area outline */}
            <div
              className="absolute border border-dashed border-primary/60 pointer-events-none"
              style={{
                left: `${printArea.x * 100}%`,
                top: `${printArea.y * 100}%`,
                width: `${printArea.w * 100}%`,
                height: `${printArea.h * 100}%`,
              }}
            />
            {/* Design overlay */}
            {designUrl && (
              <img
                src={designUrl}
                alt=""
                draggable={false}
                className="absolute pointer-events-none"
                style={{
                  left: `${dxRel * 100}%`,
                  top: `${dyRel * 100}%`,
                  width: `${dwRel * 100}%`,
                  height: `${dhRel * 100}%`,
                  objectFit: "contain",
                }}
              />
            )}
          </div>
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
                className="w-full accent-primary"
              />
            </label>
            <label className="space-y-1">
              <div className="flex justify-between"><span>Mērogs</span><span className="text-muted-foreground">{(scale * 100).toFixed(0)}%</span></div>
              <input
                type="range" min={0.4} max={1.4} step={0.01}
                value={scale}
                onChange={(e) => updateScale(parseFloat(e.target.value))}
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
                  fileName: `${safe}-460dpi.png`,
                });
                toast.success("Drukas fails lejupielādēts");
              } catch (e: any) {
                toast.error(e?.message || "Neizdevās sagatavot drukas failu");
              } finally {
                setDownloading(false);
              }
            }}
            title="Lejuplādēt 460 DPI PNG ar caurspīdīgu fonu"
          >
            {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          </Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => onExcludeProduct(product.id)} title="Izslēgt no kampaņas">
            <Trash2 className="w-3.5 h-3.5" />
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
}: {
  d: DesignRow;
  signedUrls: Record<string, string>;
  regenSingleId: string | null;
  styleChoice: string;
  onToggleStar: (d: DesignRow) => void;
  onSaveToLibrary?: (d: DesignRow) => void;
  onRegenSingleDesign: (id: string, model?: "auto" | "ideogram" | "recraft") => void;
  showOnShirt?: boolean;
  shirtColor?: "white" | "black";
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
  const [draftModel, setDraftModel] = useState<"auto" | "ideogram" | "recraft">("auto");

  const busy = regenSingleId === d.id;
  const imgSrc = d.image_url && signedUrls[d.image_url] ? getOptimizedSrc(signedUrls[d.image_url], 400, 70) : null;

  return (
    <div className="relative group aspect-square rounded border bg-muted/30 overflow-hidden">
      {imgSrc && showOnShirt ? (
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
      ) : imgSrc ? (
        <>
          <img
            src={imgSrc}
            loading="lazy"
            alt=""
            className={`w-full h-full object-cover ${busy ? "opacity-30" : ""}`}
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
              className="absolute bottom-1 right-1 p-1 rounded-full bg-background/80 opacity-0 group-hover:opacity-100 transition"
              title="Saglabāt bibliotēkā"
            >
              <Heart className="w-4 h-4 text-rose-500" />
            </button>
          )}
        </>
      ) : d.generation_error ? (
        <div className="p-2 text-[10px] text-destructive flex flex-col items-center justify-center h-full text-center gap-1">
          <span>⚠ {d.generation_error}</span>
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
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            AI modelis
          </label>
          <select
            value={draftModel}
            onChange={(e) => setDraftModel(e.target.value as "auto" | "ideogram" | "recraft")}
            className="text-xs rounded border border-border bg-card px-2 py-1.5 font-body"
          >
            <option value="auto">Auto (ieteicams)</option>
            <option value="recraft">Recraft (ilustrācija)</option>
            <option value="ideogram">Ideogram (ar tekstu)</option>
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
              <button
                key={it.id}
                type="button"
                disabled={adding === it.id}
                onClick={async () => { setAdding(it.id); try { await onPick(it); } finally { setAdding(null); } }}
                className="relative aspect-square rounded border bg-white overflow-hidden hover:ring-2 hover:ring-primary transition"
                title={it.name}
              >
                <img src={publicUrl(it.file_path)} alt={it.name} loading="lazy" className="w-full h-full object-contain" />
                {adding === it.id && (
                  <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                )}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 text-[10px] text-white truncate text-left">
                  {it.name}
                </div>
              </button>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

/* ------------ Generation settings panel (fal.ai Recraft V3) ------------ */
function GenerationSettings({
  styleChoice, onChangeStyle,
  transparentBg, onChangeTransparentBg,
  customStyleId, onChangeCustomStyleId,
  imageSize, onChangeImageSize,
  preferredColors, onChangePreferredColors,
  usePalette, onChangeUsePalette,
  modelChoice, onChangeModelChoice,
}: {
  styleChoice: string;
  onChangeStyle: (v: string) => void;
  transparentBg: boolean;
  onChangeTransparentBg: (v: boolean) => void;
  customStyleId: string;
  onChangeCustomStyleId: (v: string) => void;
  imageSize: string;
  onChangeImageSize: (v: string) => void;
  preferredColors: { r: number; g: number; b: number }[];
  onChangePreferredColors: (v: { r: number; g: number; b: number }[]) => void;
  usePalette: boolean;
  onChangeUsePalette: (v: boolean) => void;
  modelChoice: "auto" | "ideogram" | "recraft";
  onChangeModelChoice: (v: "auto" | "ideogram" | "recraft") => void;
}) {
  const [open, setOpen] = useState(true);
  const [newColor, setNewColor] = useState("#dc2626");
  const usingCustom = customStyleId.trim().length > 0;

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
        <span>fal.ai iestatījumi {open ? "▾" : "▸"}</span>
        <span className="text-[10px] font-normal text-muted-foreground truncate ml-2">
          {modelChoice === "auto" ? "Auto" : modelChoice === "ideogram" ? "Ideogram" : "Recraft"} ·{" "}
          {usingCustom ? "Pielāgots stila ID" : STYLE_PRESETS.find((s) => s.value === styleChoice)?.label || styleChoice}
          {transparentBg ? " · caurspīdīgs" : ""}
          {usePalette ? " · palete" : ""}
        </span>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-3 border-t pt-3">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              AI modelis
            </label>
            <select
              value={modelChoice}
              onChange={(e) => onChangeModelChoice(e.target.value as "auto" | "ideogram" | "recraft")}
              className="mt-1 w-full text-xs rounded border border-border bg-card px-2 py-1.5 font-body"
            >
              <option value="auto">Auto — labākais variants pēc satura</option>
              <option value="ideogram">Ideogram v3 — vislabāk burtiem un latviešu garumzīmēm</option>
              <option value="recraft">Recraft V3 — bagātīga ilustrācija (bez teksta)</option>
            </select>
            <p className="text-[10px] text-muted-foreground mt-1">
              <b>Auto:</b> ja saulis vai latviešu burti — Ideogram, citādi Recraft ar izvēlēto stilu.
            </p>
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Stils</label>
            <select
              value={styleChoice}
              onChange={(e) => onChangeStyle(e.target.value)}
              disabled={usingCustom}
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
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Pielāgots Recraft stila ID
            </label>
            <Input
              value={customStyleId}
              onChange={(e) => onChangeCustomStyleId(e.target.value)}
              placeholder="piem. 5e8c7f48-…"
              className="mt-1 h-8 text-xs"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Iztrenē savu stilu vietnē recraft.ai un ielīmē UUID. Pārraksta izvēlēto stilu.
            </p>
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
            <span className="text-xs">Caurspīdīgs fons (auto-noņemšana)</span>
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