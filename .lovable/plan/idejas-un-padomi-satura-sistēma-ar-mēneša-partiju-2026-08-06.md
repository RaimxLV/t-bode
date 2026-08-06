# Idejas un Padomi — satura sistēma ar mēneša partiju

Pārbūvē esošo "Svētku iedvesmai" blogu par pilnvērtīgu SEO satura centru: idejas, dāvanas, drukas tehnoloģijas un svētki vienā vietā. Sadaļa navigācijā jau ir paslēpta, kamēr strādājam.

## Darba princips (kā tu to lietosi)

```text
1x mēnesī:  "Sagatavot nākamo mēnesi"  ->  AI uzģenerē visus mēneša rakstus (melnraksti)
            Tu vienā sesijā: pārlasi, saliec bildes, spied OK
2 raksti/nedēļā automātiski publicējas pēc grafika
Ja nedēļā ir svētki -> tā nedēļa saņem 3. rakstu (svētku raksts)
```

## Nosaukums un adreses

- Sadaļa: **Idejas un Padomi**
- Jauns ceļš `/idejas`, raksti `/idejas/<slug>`
- Vecais `/blog` un `/blog/<slug>` paliek dzīvs un pāradresē uz jaunajiem (301-stila), lai Google pozīcijas nepazūd
- Esošie svētku raksti pāriet uz jauno sistēmu ar kategoriju "Svētki" un iekļaujas kopējā plūsmā

## Kategorijas (3 pīlāri)

| Kategorija | Saturs |
|---|---|
| Drukas tehnoloģijas | DTF, DTG, sietspiede, sublimācija, vinils, kopšana, materiāli |
| Idejas un dāvanas | Ko dāvināt, komandām, kāzām, dzimšanas dienām, bērniem |
| Svētki | Sezonālie raksti — automātiski no svētku kalendāra |

## Kā top saturs

1. **Tēmu banka** — jauna tabula ar tēmu, kategoriju, atslēgvārdu, prioritāti. Aizpildu to ar ~60 sākuma tēmām (reālas, LV tirgum atbilstošas). AI var piedāvāt vēl.
2. **"Sagatavot mēnesi"** poga — paņem nākamā mēneša neizmantotās tēmas, sadala pa nedēļām (2/ned. + svētku bonuss), katrai uzģenerē pilnu LV rakstu ar virsrakstiem, sarakstiem, tabulām un FAQ. Viss kā melnraksts ar plānoto datumu.
3. **Tava sesija** — mēneša kalendārā redzi visus rakstus, katram statuss (nav bildes / gatavs / OK / publicēts). Klikšķis atver rediģēšanu: teksts, bildes, datums. Poga "Apstiprināt visu mēnesi".
4. **Auto-publicēšana** — plānots uzdevums reizi dienā publicē tos, kuriem pienācis datums UN ir tavs OK. Bez OK nekas nepublicējas — pilnīga kontrole.

## Kvalitātes vārti (pret Google sodu)

- Max 2 raksti nedēļā (+1 svētku nedēļā), nekad vairāk
- Nepublicējas bez vāka bildes un bez min. garuma
- Aizliegts izgudrot cenas, atsauksmes, statistiku vai garantijas — tikai T-Bode reālie fakti
- Slug un virsraksta dublikātu pārbaude pret jau esošajiem rakstiem
- Katrs raksts obligāti saista 2–3 citus rakstus + 1 produktu (iekšējās saites = klasteris, tas ir tas, kas reāli ceļ pozīcijas)

## Lasīšanas UI

- Sadaļas sākumlapa ar 3 kategoriju kartēm + jaunākie raksti
- Raksta lapa: vāka bilde, lasīšanas laiks, satura rādītājs, glīta tipogrāfija, tabulas, FAQ akordeons, "Saistītie raksti", CTA uz personalizāciju
- Kategoriju lapas `/idejas/kategorija/<slug>`
- Viss T-Bode stilā (tumšs, sarkanoranžs akcents, Bebas Neue virsraksti)

## SEO

- `Article` + `BreadcrumbList` + `FAQPage` JSON-LD katram rakstam
- Kategoriju lapas ar savu title/description
- Sitemap: viens avots, iekļauj rakstus un kategorijas
- Iekšējās saites no galvenās lapas un produktu lapām uz relevantiem rakstiem

## Tehniskā daļa

- Jaunas tabulas: `content_topics` (tēmu banka), `content_categories`; `blog_posts` papildinājumi: `category_id`, `approved_at`, `reading_minutes`, `faq` (jsonb), `internal_links` (jsonb)
- Jaunas funkcijas: `generate-month-content` (mēneša partija), `publish-scheduled-posts` (dienas cron), `suggest-content-topics`
- Esošais `autopilot-tick` paliek svētku dizainiem/produktiem; blogu daļa pāriet uz jauno grafiku
- Admin: `ContentCalendar` (mēneša režģis), `TopicBank`, esošais `BlogManager` kļūst par raksta redaktoru

## Kārtība

1. DB + kategorijas + veco rakstu migrācija, `/blog` -> `/idejas` pāradresācijas
2. Publiskā sadaļa un raksta lapa ar jauno UI + schema
3. Tēmu banka ar 60 sākuma tēmām
4. Mēneša ģenerators + kalendārs + apstiprināšana
5. Auto-publicēšanas cron + sitemap
6. Atveram navigācijā, kad pirmais mēnesis ir gatavs
