## Mērķis

1. **Salabot mockup**: izmantot reālos T-Bode katalog produktus (customizable=true, 12 dizainpiemēroti produkti) kā mockup bāzi, nevis manuāli augšupielādētus PNG failus `base_products` tabulā.
2. **Autopilot automatizācija**: pg_cron darbs, kas reizi dienā automātiski palaiž nākamo soli katrai kampaņai (brief → dizaini → blogs → mockup-produkti), apstājoties pirms publiskošanas, lai admin var apstiprināt.

---

## Daļa 1 — Mockup uz reāliem katalog krekliem

### Datu modelis
- Pievienot kolonnu `products.print_area JSONB` (default `{"x":0.3,"y":0.25,"w":0.4,"h":0.45}`).
- Šī kolonna tiek lietota tikai customizable=true produktiem (krekli, hūdiji u.c. ar dizaina iespēju).
- Esošo `base_products` tabulu paturam (Bulk Studio joprojām strādā), bet autopilot to vairs neizmanto.

### Admin UI — Print zonas redaktors
- Jauns tab `Admin.tsx` → "Print zonas" (vai pievienojam esošajam Bulk Studio "Bāzes" sadaļā saiti).
- Saraksts ar visiem `customizable=true` produktiem. Katram rāda primāro bildi un pogu "Rediģēt print zonu" — atver esošo `PrintAreaEditor` modāli, saglabā `products.print_area`.
- Bez print_area produkts joprojām strādā (lieto default centrēto zonu).

### Autopilot plūsma — pārstrādāta `runPublishProducts`
- "Bāzes produktu" izvēles saraksts vairs nerāda `base_products`, bet gan `products WHERE customizable=true AND is_draft=false` ar krāsu pogām.
- Katram izvēletam bāzes produktam:
  - Iterējam `color_variants[]`, ņemam pirmo bildi katrai krāsai (`images[0]`).
  - `composeMockup({ mockupUrl: variantImage, designUrl, printArea: product.print_area })` → JPG.
  - Augšupielādējam `generated-mockups` bucket.
  - Saglabājam jauno krāsas variantu ar to pašu krāsas vārdu un hex no oriģinālā produkta.
- Izveido jaunu melnraksta produktu ar sastādītajiem `color_variants`, kopējot `category`, `sizes`, `description` no bāzes produkta.

### Compositing uzlabojumi (`composeMockup` `imageCrop.ts`)
- Pievienot `globalCompositeOperation = "multiply"` dizaina zīmēšanai uz gaišiem krekliem (auto-detekcija pēc krāsas hex spilgtuma) — uz tumšiem krekliem paliek normal blend ar `screen` opciju.
- Tā dizains seko auduma krāsai un izskatās dabīgāks (līdzīgi kā Printful/Printify).
- Pievienot mazu lighten/darken filtru atkarībā no krekla krāsas, lai melni dizaini neapšaubāmi nepazūd uz melna krekla — ja krekla spilgtums un dizaina spilgtums abi <0.3 vai abi >0.7, lietojam tikai opacity bez blend.

### Skartie faili
- migration: `ALTER TABLE products ADD COLUMN print_area JSONB`
- `src/lib/imageCrop.ts` — uzlabot `composeMockup` ar blend modes
- `src/components/admin/AutopilotDashboard.tsx` — bāzes picker no `products`, runPublishProducts pārrakstīt
- `src/components/admin/PrintZonesManager.tsx` (jauns) — admin UI print zonu rediģēšanai
- `src/pages/Admin.tsx` — pievienot "Print zonas" tab

---

## Daļa 2 — Autopilot cron automatizācija

### Jauna edge funkcija `autopilot-tick`
- Bez auth (`verify_jwt = false`, čeko `cron-secret` headeri).
- Loģika:
  1. Iet cauri visiem aktīviem `holidays`. Atrod `next_occurrence`; ja `days_until <= lead_days` un nav esošas kampaņas šim gadam → izveido kampaņu ar status `generating`, izsauc `generate-campaign-brief`.
  2. Iet cauri kampaņām status `ready_for_review` (brief gatavs) ar `auto_advance=true` → izsauc `generate-campaign-designs`.
  3. Iet cauri kampaņām status `designs_ready` un `auto_advance=true` → automātiski atzīmē pirmos 2 dizainus ar ★, izsauc `generate-campaign-blog`.
  4. Apstājas pirms `runPublishProducts` — produktu publicēšana vienmēr prasa admin apstiprinājumu (jo vajag izvēlēties bāzes kreklus).
- Atgriež JSON ar visu darbību sarakstu.

### Datu modelis
- Pievienot `campaigns.auto_advance BOOLEAN DEFAULT true` — admin var izslēgt konkrētai kampaņai.
- Pievienot `campaigns.auto_started_at TIMESTAMPTZ` — uzskaita, kad sistēma sākusi.

### pg_cron schedule
- Iespējot `pg_cron`, `pg_net`.
- Cron darbs ik dienas 06:00 UTC (08:00 LV): izsauc `autopilot-tick` ar cron-secret.
- Pievienot `CRON_SECRET` secret.

### Admin UI
- AutopilotDashboard katrai kampaņai pievienot Switch "Auto" (kontrolē `auto_advance`).
- Pievienot info bloku augšā: "Cron strādā katru dienu plkst. 08:00 — pārbauda gaidāmos svētkus un virza kampaņas līdz produktu izveides solim."

### Skartie faili
- migration: pievienot `auto_advance`, `auto_started_at` kolonnas; iespējot pg_cron/pg_net; insert cron darbu (caur insert tool, lai nesabojātu remix).
- `supabase/functions/autopilot-tick/index.ts` (jauns)
- `supabase/config.toml` — `verify_jwt = false` autopilot-tick funkcijai
- `src/components/admin/AutopilotDashboard.tsx` — auto switch + cron info

---

## Secība
1. Vispirms Daļa 1 (mockup fix) — testēt vienu publicēšanu, redzēt īstu kreklu ar dizainu produkta kartiņā.
2. Tad Daļa 2 (cron) — kad mockup strādā un katrai kampaņai redzam ka rezultāts ir labs.
