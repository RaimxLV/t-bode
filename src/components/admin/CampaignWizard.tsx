import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, RefreshCw, Star, Wand2, Package, FileText, Eye, X, ArrowLeft, ArrowRight, RotateCcw, Sparkles, CheckCircle2, ExternalLink, Trash2 } from "lucide-react";
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
  design_ideas?: { title: string; prompt: string }[];
  product_types?: string[];
};

type Campaign = {
  id: string;
  holiday_id: string | null;
  year: number;
  status: string;
  title: string | null;
  description: string | null;
  brief: Brief | null;
};

type DesignRow = {
  id: string;
  campaign_id: string;
  image_url: string | null;
  prompt: string;
  generation_error: string | null;
  is_primary: boolean;
  product_id: string | null;
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

  const load = async () => {
    if (!campaignId) return;
    setLoading(true);
    try {
      const { data: campRaw } = await supabase
        .from("campaigns" as any)
        .select("id, holiday_id, year, status, title, description, brief")
        .eq("id", campaignId)
        .maybeSingle();
      const camp = campRaw as unknown as Campaign | null;
      setCampaign(camp);

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
        .select("id, campaign_id, image_url, prompt, generation_error, is_primary, product_id")
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

  /* -------- Step 2 actions -------- */
  const regenDesigns = async () => {
    if (!campaign) return;
    setBusy("designs");
    toast.info("AI ģenerē dizainus (1-2 min)…");
    try {
      const { data, error } = await supabase.functions.invoke("generate-campaign-designs", { body: { campaign_id: campaign.id } });
      if (error || (data as any)?.error) throw new Error((data as any)?.error ?? error?.message);
      toast.success("Dizaini pārģenerēti");
      await load();
    } catch (e: any) { toast.error("Neizdevās: " + e.message); }
    finally { setBusy(null); }
  };

  const toggleStar = async (d: DesignRow) => {
    const { error } = await supabase.from("campaign_designs" as any)
      .update({ is_primary: !d.is_primary }).eq("id", d.id);
    if (error) { toast.error(error.message); return; }
    setDesigns((prev) => prev.map((x) => x.id === d.id ? { ...x, is_primary: !x.is_primary } : x));
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
      className={`flex items-center gap-2 text-xs font-body ${step === n ? "text-primary" : "text-muted-foreground"}`}
    >
      <span className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${step === n ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>
        {n}
      </span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {headerTitle}
          </DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center justify-between gap-2 py-2 border-b border-border">
          <StepDot n={1} label="Idejas" />
          <div className="flex-1 h-px bg-border mx-1" />
          <StepDot n={2} label="Dizaini & produkti" />
          <div className="flex-1 h-px bg-border mx-1" />
          <StepDot n={3} label="Blogs & publicēšana" />
        </div>

        {loading || !campaign ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : success ? (
          <PublishSuccess success={success} onClose={closeAndRefresh} />
        ) : (
          <div className="py-3 space-y-4">
            {step === 1 && (
              <StepIdea
                campaign={campaign}
                busy={busy}
                onRegen={regenBrief}
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
                onRegenDesigns={regenDesigns}
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
  );
};

/* -------------------- Sub-components -------------------- */

function StepIdea({ campaign, busy, onRegen, onNext, onClose }: any) {
  const brief: Brief = campaign.brief ?? {};
  return (
    <div className="space-y-4">
      {!brief.title_lv && (
        <div className="rounded border border-dashed p-4 text-center text-sm text-muted-foreground">
          Vēl nav uzģenerētas idejas. Spied pogu zemāk.
        </div>
      )}
      {brief.title_lv && (
        <>
          <div>
            <h3 className="font-display text-2xl">{brief.title_lv}</h3>
            {brief.tagline_lv && <p className="italic text-muted-foreground mt-1">"{brief.tagline_lv}"</p>}
          </div>
          {brief.description_lv && (
            <section>
              <h4 className="font-semibold text-xs uppercase tracking-wider mb-1 text-muted-foreground">Apraksts</h4>
              <p className="text-sm">{brief.description_lv}</p>
            </section>
          )}
          {brief.target_audience && (
            <section>
              <h4 className="font-semibold text-xs uppercase tracking-wider mb-1 text-muted-foreground">Mērķauditorija</h4>
              <p className="text-sm">{brief.target_audience}</p>
            </section>
          )}
          {!!brief.color_palette?.length && (
            <section>
              <h4 className="font-semibold text-xs uppercase tracking-wider mb-2 text-muted-foreground">Krāsu palete</h4>
              <div className="flex gap-2 flex-wrap">
                {brief.color_palette.map((c) => (
                  <div key={c} className="flex flex-col items-center gap-1">
                    <div className="w-14 h-14 rounded-md border" style={{ backgroundColor: c }} />
                    <span className="text-[10px] font-mono text-muted-foreground">{c}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
          {!!brief.design_ideas?.length && (
            <section>
              <h4 className="font-semibold text-xs uppercase tracking-wider mb-1 text-muted-foreground">Dizainu idejas</h4>
              <ul className="text-sm space-y-1 list-disc list-inside">
                {brief.design_ideas.map((i, idx) => <li key={idx}><strong>{i.title}</strong> — <span className="text-muted-foreground">{i.prompt}</span></li>)}
              </ul>
            </section>
          )}
        </>
      )}

      <div className="flex flex-wrap gap-2 pt-4 border-t">
        <Button variant="outline" size="sm" disabled={busy === "brief"} onClick={onRegen}>
          {busy === "brief" ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1.5" />}
          Pārģenerēt ideju
        </Button>
        <div className="flex-1" />
        <Button variant="ghost" size="sm" onClick={onClose}>Saglabāt un turpināt vēlāk</Button>
        <Button size="sm" disabled={!brief.title_lv} onClick={onNext}>
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
  onSetCoverColor,
}: any) {
  const starCount = designs.filter((d: DesignRow) => d.is_primary && d.image_url).length;

  return (
    <div className="space-y-5">
      {/* Designs grid */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-sm">AI dizaini ({designs.length})</h4>
          <Button size="sm" variant="outline" disabled={busy === "designs"} onClick={onRegenDesigns}>
            {busy === "designs" ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Wand2 className="w-4 h-4 mr-1.5" />}
            Pārģenerēt dizainus
          </Button>
        </div>
        {designs.length === 0 ? (
          <div className="rounded border border-dashed p-6 text-center text-sm text-muted-foreground">
            Vēl nav dizainu. Spied "Pārģenerēt dizainus".
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {designs.map((d: DesignRow) => (
              <div key={d.id} className="relative group aspect-square rounded border bg-muted/30 overflow-hidden">
                {d.image_url && signedUrls[d.image_url] ? (
                  <>
                    <img
                      src={getOptimizedSrc(signedUrls[d.image_url], 400, 70)}
                      loading="lazy"
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => onToggleStar(d)}
                      className={`absolute top-1 right-1 p-1 rounded-full transition ${d.is_primary ? "bg-primary text-primary-foreground" : "bg-background/80 opacity-0 group-hover:opacity-100"}`}
                    >
                      <Star className={`w-4 h-4 ${d.is_primary ? "fill-current" : ""}`} />
                    </button>
                  </>
                ) : d.generation_error ? (
                  <div className="p-2 text-[10px] text-destructive flex items-center justify-center h-full text-center">⚠ {d.generation_error}</div>
                ) : (
                  <div className="flex items-center justify-center h-full"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                )}
              </div>
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
                  <div className="aspect-square bg-muted">
                    {thumb ? (
                      <img
                        src={getOptimizedSrc(thumb, 400, 70)}
                        loading="lazy"
                        alt=""
                        className="w-full h-full object-contain"
                      />
                    ) : <Package className="w-8 h-8 m-auto" />}
                  </div>
                  <div className="p-1.5">
                    <p className="text-xs font-body line-clamp-1">{p.name_lv || p.name}</p>
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
                />
              );
            })}
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-4 border-t">
        <Button variant="outline" size="sm" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-1.5" />Atpakaļ</Button>
        <Button variant="ghost" size="sm" disabled={busy === "reset2"} onClick={onReset}>
          <RotateCcw className="w-4 h-4 mr-1.5" />Atjaunot šo soli
        </Button>
        <div className="flex-1" />
        <Button variant="ghost" size="sm" onClick={onClose}>Saglabāt un turpināt vēlāk</Button>
        <Button size="sm" disabled={campProducts.length === 0} onClick={onNext}>
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

      <div className="flex flex-wrap items-center gap-2 pt-4 border-t">
        <Button variant="outline" size="sm" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-1.5" />Atpakaļ</Button>
        <Button variant="ghost" size="sm" disabled={busy === "save-blog"} onClick={onSave}>
          {busy === "save-blog" ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
          Saglabāt
        </Button>
        <div className="flex-1" />
        <Button variant="ghost" size="sm" onClick={onClose}>Saglabāt un turpināt vēlāk</Button>
        <Button size="sm" className="bg-primary" disabled={busy === "publish" || campProductsCount === 0} onClick={onPublish}>
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
  onUpdatePrintAdj, onRegenerate, onRemoveColor, onExcludeProduct,
}: {
  product: CampProduct;
  baseInfo: CatalogProduct | null;
  designUrl: string | null;
  busyKey: string | null;
  onUpdatePrintAdj: (id: string, patch: { print_offset_y?: number; print_scale?: number }) => void;
  onRegenerate: (id: string) => void;
  onRemoveColor: (id: string, name: string) => void;
  onExcludeProduct: (id: string) => void;
}) {
  const [offsetY, setOffsetY] = useState<number>(product.print_offset_y ?? 0);
  const [scale, setScale] = useState<number>(product.print_scale ?? 1);
  const [autoSaving, setAutoSaving] = useState(false);
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

  // Pointer/touch drag (vertical → offsetY) + pinch (2-finger → scale)
  const previewRef = useRef<HTMLDivElement | null>(null);
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const dragStart = useRef<{ y: number; startOffset: number; pinchDist: number; startScale: number } | null>(null);
  const printArea = baseInfo?.print_area ?? DEFAULT_PRINT_AREA;
  const baseImg = baseInfo?.color_variants?.find((cv) => cv.images?.[0])?.images?.[0] ?? product.image_url;

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      dragStart.current = { y: e.clientY, startOffset: offsetY, pinchDist: 0, startScale: scale };
    } else if (pointers.current.size === 2) {
      const pts = Array.from(pointers.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      dragStart.current = { y: 0, startOffset: offsetY, pinchDist: dist, startScale: scale };
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const rect = previewRef.current?.getBoundingClientRect();
    if (!rect || !dragStart.current) return;
    if (pointers.current.size === 1) {
      const dy = (e.clientY - dragStart.current.y) / (rect.height * printArea.h);
      updateOffset(dragStart.current.startOffset + dy);
    } else if (pointers.current.size >= 2) {
      const pts = Array.from(pointers.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (dragStart.current.pinchDist > 0) {
        updateScale(dragStart.current.startScale * (dist / dragStart.current.pinchDist));
      }
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) dragStart.current = null;
  };
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.0015;
    updateScale(scale + delta);
  };

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
    <div className="border rounded p-3 space-y-3">
      <div className="flex items-start gap-3">
        {/* Live preview */}
        <div
          ref={previewRef}
          className="relative w-40 h-40 sm:w-56 sm:h-56 rounded border bg-muted overflow-hidden shrink-0 touch-none select-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
          style={{ cursor: "grab" }}
        >
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
        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => onExcludeProduct(product.id)} title="Izslēgt no kampaņas">
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
      {product.color_variants.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {product.color_variants.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => confirm(`Noņemt krāsu "${c.name}"?`) && onRemoveColor(product.id, c.name)}
              className="group flex items-center gap-1 border rounded-full pl-1 pr-2 py-0.5 hover:border-destructive"
              title={`Noņemt ${c.name}`}
            >
              <span className="w-4 h-4 rounded-full border" style={{ backgroundColor: c.hex }} />
              <span className="text-[10px]">{c.name}</span>
              <X className="w-3 h-3 text-muted-foreground group-hover:text-destructive" />
            </button>
          ))}
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