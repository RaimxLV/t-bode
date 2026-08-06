---
name: Content hub (Idejas un Padomi) rules
description: Editorial guides-and-ideas rules for /idejas — no tech comparisons, magazine design, DTF only as background detail
type: feature
---
## Satura virziens (2026-08-06, apstiprināts)
- Fokuss: **ceļveži un idejas** (kā saplānot merch komandai/klasei/pasākumam, dāvanu idejas, apdrukas kopšana). NAV raksti par tehnoloģiju.
- AIZLIEGTS: drukas metožu salīdzinājumi (DTF vs DTG vs sietspiede), salīdzinājumu tabulas, "Kas ir DTF" tipa skaidrojumi, <table> rakstos.
- DTF drīkst pieminēt max 1-2x rakstā, dabiski, lasītāja labuma kontekstā. DTG nepiemin vispār. T-Bode DTG nav.
- Nesāk ar definīciju, "Vai zināji, ka...", "Mūsdienās...". Sāc ar konkrētu situāciju/lēmumu.
- Bez pārdošanas CTA teksta vidū; bez izdomātām cenām, statistikas, atsauksmēm.
- Rubrikas: Ceļveži · Idejas · Dāvanas · Kopšana (content_categories).

## Dizains
- /idejas, /idejas/kategorija/:slug, /idejas/:slug = žurnāla redakcijas stils: krēmbalts fons (`bg-paper` tokens), Bebas Neue lieli uppercase virsraksti, sarkans akcents (`cta-red`), asimetrisks grids (lead 8 kol. + portrait/square kartītes), viens šaurs teksta stabiņš rakstā, bez rāmjiem/rounded kartītēm.

## UI noteikumi
- Rakstos NERĀDA lasīšanas ilgumu ("min lasīšana") un NERĀDA satura rādītāju (TOC).
- Raksta CTA poga = HeroCtaButton (tāda pati kā hero sadaļā), "Sākt personalizēt" → /design.
- Sezonalitāte: content_topics.season_months (1-12; tukšs = visu gadu). Svētku tēmas ģenerējas TIKAI savos mēnešos (Ziemassvētki 11-12, Valentīndiena 1-2, Lieldienas 3-4, Mātes diena 4-5, Jāņi 5-6, skolas sākums 7-8).
- Katram rakstam kalendārā ir "Pārģenerēt" (teksts) un "AI bilde" (fotoreālistisks vāka attēls) pogas.
- Automātiskā publicēšana APTURĒTA (cron `publish-approved-content` atslēgts). Neieslēgt bez lietotāja atļaujas.
