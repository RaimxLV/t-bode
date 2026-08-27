---
name: Content hub (Idejas un Padomi) rules
description: Editorial guides-and-ideas rules for /idejas — no tech comparisons, magazine design, DTF only as background detail
type: feature
---
## Satura virziens (2026-08-06, apstiprināts)
- Fokuss: **ceļveži un idejas** (kā saplānot merch komandai/klasei/pasākumam, dāvanu idejas, apdrukas kopšana). NAV raksti par tehnoloģiju.
- AIZLIEGTS: salīdzinājumu tabulas, <table> rakstos, "Kas ir DTF" tipa skaidrojumi kā raksta galvenā tēma.
- Sietspiedi, sublimāciju, izšūšanu, vinilu, DTG drīkst pieminēt TIKAI kā salīdzinājumu/piemēru (max 1x rakstā, viens teikums), vienmēr blakus norādei, ka T-Bode drukā ar DTF. Nekad tā, ka rodas iespaids, ka tos var pasūtīt šeit (tos piedāvā SIA Ervitex B2B, ne T-Bode).
- Bez tēmām, kuru galvenā tēma ir cita metode, apdrukas veida izvēle vai tūkstošu gabalu ražošana.
- AIZLIEGTS rakstīt par to, kā mājaslapā nav: izmēru/apkārtmēru tabulas, izmēru mērīšanas ceļveži, ekspresdruka, paraugi, dizaina pakalpojumi.
- Dāvanu tēmas = konkrētu ideju saraksti un situācijas, NEVIS pamācības "kā pareizi izvēlēties dāvanu" vai par gaumi.
- Reāli pieejamais: online konstruktors (arī garumzīmes), T-krekli, hūdiji/džemperi, krūzes, auduma somas, bērnu apģērbs; no 1 gabala; Omniva pakomāts, kurjers vai Rīgas veikali.
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
- Kalendārā rakstus var pārkārtot (drag-and-drop vai bultiņas); mēneša datumi paliek fiksēti, mainās tikai rakstu kārtība tajos.
- Automātiskā publicēšana APTURĒTA (cron `publish-approved-content` atslēgts). Neieslēgt bez lietotāja atļaujas.

## Publiskums un bildes (2026-08-27)
- /idejas ir publiski redzams: saite ir Navbar un Footer izvēlnē.
- AI vāka bildes: nedrīkst visas būt darbnīcas/druknas iekārtu vidē. Prompts nejauši izvēlas dzīves situāciju (pāris ar dāvanu, kāzas, ballīte, klase/komanda, ģimene, iela, flat lay). Aizliegts: druku darbnīcas, termopreses, industriāli interjeri, studijas foni.
