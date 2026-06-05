# Plāns: Campaign Wizard refaktorings

## Mērķis
Apvienot `AutopilotDashboard` + ar kampaņām saistīto `BlogManager` loģiku vienā lineārā 3-soļu vednī. Atstāt `BlogManager` tikai manuāliem rakstiem un arhīvam.

## Jaunā struktūra

### Faili
- **Jauns** `src/components/admin/CampaignWizard.tsx` — galvenais 3-soļu vednis (atver no kampaņas kartītes).
- **Jauns** `src/components/admin/campaign-wizard/StepIdea.tsx` — Solis 1.
- **Jauns** `src/components/admin/campaign-wizard/StepDesigns.tsx` — Solis 2 (dizaini + bāzes produktu vizuālās kartītes + inline tuning).
- **Jauns** `src/components/admin/campaign-wizard/StepBlog.tsx` — Solis 3 (blog editors + expiration + "Mūsu kolekcija" checkbox + PUBLICĒT VISU).
- **Jauns** `src/components/admin/campaign-wizard/PublishSuccess.tsx` — pēc-publicēšanas ekrāns.
- **Atjaunots** `AutopilotDashboard.tsx` — saraksts ar kampaņām + cilvēkam draudzīgi statusi, "Atvērt vedni" poga, sarkanais aplītis pie kampaņām, kas gaida pārskatīšanu.
- **Atjaunots** `BlogManager.tsx` — noņem kampaņu saistīto produkta picker / color-chip / sliders UI; atstāj tikai manuāla raksta CRUD + publicēto rakstu arhīva tabulu. Manuāliem rakstiem `campaign_id IS NULL`.
- **Jauns** `src/hooks/useCampaignReviewBadge.ts` — atgriež skaitu kampaņām statusā `ready_for_review`/`designs_ready`/`blog_ready`, lai parādītu sarkano punktu Admin tab navigācijā un toast pēc login.

### Statusu kartējums (UI tekstā)
```
generating              -> "Ģenerē idejas…"
ready_for_review        -> "Gaida tavu apstiprinājumu" (1. solis)
generating_designs      -> "Ģenerē dizainus…"
designs_ready           -> "Gaida tavu apstiprinājumu" (2. solis)
products_ready          -> "Gatavs publicēšanai" (3. solis)
blog_ready              -> "Gatavs publicēšanai" (3. solis)
published / active      -> "Publicēta"
failed                  -> "Kļūda — pārstartē soli"
```

### Soļu plūsma
```
[Autopilot dashboard] - kampaņas kartītes ar statusa nosaukumu + "Atvērt"
        |
        v
[CampaignWizard dialog/page] -- progress bar 1/2/3
   |
   +-- Step 1: Idejas
   |     - brief.title_lv, tagline, description
   |     - color palette swatches (no brief.color_palette)
   |     - [Pārģenerēt ideju] -> generate-campaign-brief
   |     - [Saglabāt un turpināt vēlāk] [Tālāk ->]
   |
   +-- Step 2: Dizaini un Produkti
   |     - 4-8 AI dizaini grid ar ★ toggle
   |     - [Pārģenerēt dizainus] -> generate-campaign-designs
   |     - Bāzes produkti = vizuālas kartītes (color_variants[0].images[0] thumbnail)
   |     - [Veidot mockup] -> esošā composeMockup loģika; pēc tam zem kartiņas:
   |         * krāsu chip ar X (color_variants noņemšana)
   |         * Y offset slider + scale slider (print_offset_y, print_scale)
   |         * "Izslēgt no kampaņas" toggle (is_draft remain + show_in_collection=false vai delete)
   |     - [Atjaunot šo soli no jauna] -> dzēš campaign_designs un campaign produktus
   |     - [Atpakaļ] [Tālāk ->]
   |
   +-- Step 3: Blogs un Publicēšana
         - Tiptap RichTextEditor (esošais) priekš blog_posts.content
         - Title / excerpt / slug inputs
         - cover_image_url auto = pirmais ★ dizains (signed URL)
         - [Pārģenerēt blogu] -> generate-campaign-blog
         - Expiration date picker (default: holiday_date - 1 day)
         - [x] Pievienot pie "Mūsu kolekcija" ar "Jaunums" zīmīti
         - [Priekšskatīt klienta skatā] -> /blog/{slug}?preview=1
         - [PUBLICĒT VISU] - viens transaction:
             * blog_posts: status='published', published_at=now()
             * products (campaign_id=X): is_draft=false, status='published',
               show_in_collection=<checkbox>, expires_at=<picker>,
               available_from=now()
             * campaigns.status='published', published_at=now()
         - Pēc publicēšanas -> PublishSuccess ekrāns
```

### PublishSuccess
"Kampaņa palaista! Aktīvi: N produkti, 1 bloga raksts. Pieejami līdz [Datums]." + linki uz `/blog/{slug}` un "Mūsu kolekcija".

### Notifikāciju UX
- `useCampaignReviewBadge` query (5 min refetch) atgriež `pending_count`.
- `Admin.tsx`: pie "Autopilot" tab pievienot sarkanu punktu, ja `pending_count > 0`.
- Pēc login `AuthContext` initial load -> ja admin un pending_count>0 -> `toast.info("{title} kampaņa ir gatava pārskatīšanai 2. solī!")`. Lai netraucē, glabāt `sessionStorage` flag.

### State retention
- Soļi automātiski saglabājas DB (kā šobrīd) — nav atsevišķa wizard state tabula.
- "Saglabāt un turpināt vēlāk" = vienkārši aizver dialogu.
- "Atjaunot šo soli no jauna":
   * Step 1 -> dzēš brief, set status='generating', re-run generate-campaign-brief
   * Step 2 -> dzēš campaign_designs un products kur campaign_id=X un is_draft=true
   * Step 3 -> dzēš blog_posts kur campaign_id=X un status!='published'

### Blog Manager izmaiņas
- Noņemt: product picker dialog, color variant chip removal, print_offset_y/print_scale slideri, publish workflow ar campaign products.
- Paturēt: title, slug, excerpt, content (Tiptap), cover_image_url upload, status, scheduled_for, manuāla blog_post_products saite (vienkāršs select).
- Filtrs: rādīt tikai `campaign_id IS NULL` rakstus + tab "Arhīvs" = visi published.

## Tehniskās detaļas

### DB izmaiņas
Nav jaunas tabulas vai kolonnas. Visas vajadzīgās jau ir (`campaign_id`, `show_in_collection`, `print_offset_y`, `print_scale`, `expires_at`, `available_from`, `holiday_id`).

### Edge functions
Bez izmaiņām — turpinām saukt esošos `generate-campaign-brief`, `generate-campaign-designs`, `generate-campaign-blog`, `publish-campaign-products` (vai inline logic, kā šobrīd `runPublishProducts`). Pievienosim vienu DB UPDATE batch priekš atomic publish.

### Izpildes plāns
1. Izveidot `CampaignWizard.tsx` + 3 step komponentes + `PublishSuccess.tsx`.
2. Pārveidot `AutopilotDashboard.tsx` — saraksts + status badge mapping + "Atvērt vedni" poga.
3. Sagatavot `useCampaignReviewBadge` hook + integrēt `Admin.tsx` tab dot + login toast.
4. Sašaurināt `BlogManager.tsx` — noņemt kampaņu-specific UI, filtrēt `campaign_id IS NULL`.
5. Manuāli iziet cauri katram solim preview, pārbaudīt build.

## Apjoms
~6 jauni faili, 3 esošo failu atjauninājumi. Tā nav triviāla izmaiņa — apmēram 800-1000 jaunu rindu, ~400 rindu noņemtas no BlogManager.

Vai apstiprini, ka eju šajā virzienā? Pēc apstiprinājuma sākšu būvēt.
