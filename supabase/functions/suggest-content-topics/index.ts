import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireAdmin } from "../_shared/admin-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type SuggestedTopic = {
  title_lv: string;
  primary_keyword?: string;
  secondary_keywords?: string[];
  angle_hint?: string;
  category_slug: string;
  season_months?: number[];
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = await requireAdmin(req, corsHeaders);
    if (!auth.ok) return auth.response;

    const key = Deno.env.get("LOVABLE_API_KEY");
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!key || !url || !serviceKey) throw new Error("AI vai datubāzes konfigurācija nav pieejama");

    const body = await req.json().catch(() => ({}));
    const requestedCount = Number(body?.count ?? 12);
    const count = Number.isFinite(requestedCount) ? Math.min(Math.max(Math.round(requestedCount), 3), 20) : 12;
    const currentMonth = new Date().getUTCMonth() + 1;
    const admin = createClient(url, serviceKey);

    const [{ data: categories, error: categoryError }, { data: existing, error: existingError }] = await Promise.all([
      admin.from("content_categories").select("id,name_lv,slug").eq("is_active", true).order("sort_order"),
      admin.from("content_topics").select("title_lv,primary_keyword").order("created_at", { ascending: false }).limit(200),
    ]);
    if (categoryError) throw categoryError;
    if (existingError) throw existingError;
    if (!categories?.length) throw new Error("Nav pieejamu satura kategoriju");

    const categoryList = categories.map((category) => `${category.slug}: ${category.name_lv}`).join("\n");
    const existingList = (existing ?? []).map((topic) => topic.title_lv).join("\n");
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "Tu esi T-Bode redakcijas redaktors Latvijā. Sadaļas fokuss ir PRAKTISKI CEĻVEŽI UN IDEJAS cilvēkiem, kas plāno personalizētu apģērbu: komandām, klasēm, pasākumiem, ģimenei, maziem zīmoliem, dāvanām, kā arī apdrukas kopšanai. T-Bode ir mazumtirdzniecības zīmols: online konstruktors, T-krekli, hūdiji, krūzes, auduma somas un bērnu apģērbs, personalizēti ar DTF apdruku, arī pa vienam gabalam; saņemšana Omniva pakomātā, ar kurjeru vai Rīgas veikalos. Citas metodes (sietspiede, sublimācija, izšūšana, vinils, DTG) drīkst parādīties tikai kā salīdzinājums vai piemērs raksta iekšienē — tāpēc NEDOD tēmas, kuru galvenā tēma ir cita metode, tehnoloģiju apskats, 'Kas ir DTF' skaidrojums vai apdrukas veida izvēle. AIZLIEGTAS tēmas par to, kā mājaslapā nav: izmēru vai apkārtmēru tabulas, izmēru mērīšanas ceļveži, ekspresdruka, paraugi, dizaina pakalpojumi, tūkstošu gabalu ražošana. AIZLIEGTS arī pamācošs tonis par 'pareizu dāvanu izvēli' vai gaumi — dāvanu tēmas lai ir konkrētu ideju saraksti un situācijas, ne mācīšana. Tēmas lai ir konkrētas, dzīvas un balstītas reālās situācijās. Neizdomā cenas, statistiku, garantijas vai atsauksmes. Atbildi tikai ar derīgu JSON objektu.",
          },
          {
            role: "user",
            content: `Izveido tieši ${count} jaunas, savstarpēji atšķirīgas tēmas T-Bode satura centram.\n\nŠobrīd ir ${currentMonth}. mēnesis. Vismaz divas trešdaļas tēmu jābūt neitrālām (visu gadu aktuālām) vai piemērotām tuvākajiem 1-2 mēnešiem.\n\nSVARĪGI par sezonalitāti: laukā "season_months" norādi mēnešu numurus (1-12), kuros tēma ir aktuāla. Neitrālām tēmām atstāj tukšu masīvu []. Svētku tēmas obligāti sasaisti ar mēnešiem, kad par tām meklē: Ziemassvētki [11,12], Jaunais gads [12,1], Valentīndiena [1,2], sieviešu diena [2,3], Lieldienas [3,4], Mātes diena [4,5], Līgo/Jāņi [5,6], skolas sākums [7,8], Ziemassvētku korporatīvie pasūtījumi [10,11,12]. Nedod Ziemassvētku vai citu tālu svētku tēmas kā galvenās, ja tie nav tuvu.\n\nAtļautās kategorijas (category_slug):\n${categoryList}\n\nŠīs tēmas jau ir bankā, tās neatkārto:\n${existingList}\n\nAtbildes forma: {"topics":[{"title_lv":"...","primary_keyword":"...","secondary_keywords":["..."],"angle_hint":"...","category_slug":"...","season_months":[11,12]}]}`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (response.status === 429) throw new Error("AI pieprasījumu limits. Mēģini vēlreiz pēc brīža.");
    if (response.status === 402) throw new Error("AI kredīti ir beigušies.");
    if (!response.ok) throw new Error(`AI kļūda (${response.status})`);

    const aiData = await response.json();
    const raw = aiData?.choices?.[0]?.message?.content;
    const parsed = typeof raw === "string" ? JSON.parse(raw.trim().replace(/^```json\s*/i, "").replace(/\s*```$/, "")) : raw;
    const suggestions: SuggestedTopic[] = Array.isArray(parsed?.topics) ? parsed.topics : [];
    const categoryBySlug = new Map(categories.map((category) => [category.slug, category.id]));
    const existingTitles = new Set((existing ?? []).map((topic) => topic.title_lv.trim().toLocaleLowerCase("lv")));
    const rows = suggestions
      .filter((topic) => typeof topic?.title_lv === "string" && categoryBySlug.has(topic.category_slug))
      .filter((topic) => !existingTitles.has(topic.title_lv.trim().toLocaleLowerCase("lv")))
      .slice(0, count)
      .map((topic, index) => ({
        title_lv: topic.title_lv.trim().slice(0, 180),
        category_id: categoryBySlug.get(topic.category_slug),
        primary_keyword: topic.primary_keyword?.trim().slice(0, 120) || null,
        secondary_keywords: Array.isArray(topic.secondary_keywords) ? topic.secondary_keywords.slice(0, 8) : [],
        angle_hint: topic.angle_hint?.trim().slice(0, 500) || null,
        season_months: Array.isArray(topic.season_months)
          ? topic.season_months
              .map((m: unknown) => Math.round(Number(m)))
              .filter((m: number) => Number.isFinite(m) && m >= 1 && m <= 12)
              .slice(0, 12)
          : [],
        priority: 100 + index,
        status: "idea",
      }));
    if (!rows.length) throw new Error("AI neatgrieza nevienu jaunu derīgu tēmu");

    const { data: inserted, error: insertError } = await admin
      .from("content_topics")
      .insert(rows)
      .select("id");
    if (insertError) throw insertError;

    return new Response(JSON.stringify({ created: inserted?.length ?? 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("suggest-content-topics error", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Nezināma kļūda" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});