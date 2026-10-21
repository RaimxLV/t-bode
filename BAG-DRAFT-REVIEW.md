# Auduma maisiņu melnraksts — 2026-10-21

Priekšskatījums: https://id-preview--184450d1-f62d-4492-b6b7-90ff9f57b430.lovable.app/auduma-maisinu-apdruka

## Pabeigts
- Izolēta silta papīra / melna / sarkana redakcionāla lapa; lietotāja attēls nemainīts, 4:5 un “Dizaina vizualizācija”. Esošā navigācija un kājene saglabātas.
- Publiskais personalizējamo preču lasītājs, kokvilnas-soma, dabīgās krāsas noklusējums, 16 īstās krāsas un atbilstošās fotogrāfijas, dinamiskā cena bez apdrukas, apraksts no preces datiem.
- Trīs procesa soļi, redakcionāla ideju sadaļa ar vienu īstu foto (nevis mākslīgi apdrukāti foto), pieci atverami jautājumi, noslēguma josla.
- Validēts `color` kā sākotnējās preces krāsas ieteikums; klienta turpmākā izvēle saglabājas datu atsvaidzināšanā. Nederīga krāsa ignorēta. Produktu identitātes atslēga nav mainīta.
- `noindex, follow` neatkarīgi no vaicājuma; kanoniskā adrese https://t-bode.lv/auduma-maisinu-apdruka, latviešu valoda, Service/FAQ/breadcrumb dati bez piedāvājumiem un atsauksmēm.

## Mainītie faili
- src/pages/landing/AudumaMaisinuApdruka.tsx
- src/components/bags/BagProduct.tsx
- src/components/bags/bagContent.ts
- src/components/bags/bags.css
- src/assets/bags-editorial-hero.webp
- src/index.css (tikai jauni bag-* krāsu tokeni)
- src/lib/productInitialColor.ts
- src/pages/ProductDetail.tsx (tikai validētā sākotnējā krāsa)
- src/test/product-initial-color.test.ts
- src/test/product-detail-navigation.test.tsx
- AGENTS.md, roadmap.md, BAG-DRAFT-REVIEW.md

## Pierādījumi
- 9 testi iziet abos fokusētajos testu failos; pārbauda derīgu/nederīgu krāsu, atsvaidzināšanu, navigāciju abos virzienos, izmērus, daudzumu, attēlus un dialogu atiestatīšanu.
- Chromium 1440/1280/768/390/360 px: nav horizontālas pārplūdes. Visas 16 attēlu adreses salīdzinātas ar īsto publisko preces atbildi, attēli ielādējas.
- Tumši zilās krāsas CTA → /produkti/kokvilnas-soma?color=Dark%20blue → preces krāsa Dark blue; atpakaļ uz melnrakstu darbojas. Nederīgs color=INVALID rāda īsto pirmo variantu White.
- Tastatūras Space izvēlas krāsu; Enter atver native details jautājumu. Samazinātas kustības režīmā saturs redzams.
- Pārlūkā nav runtime kļūdu. Automātiskās lapas veidošanas žurnālā `build OK`.
- Ekrānattēli: /tmp/browser/bag-draft/draft-desktop.png, draft-mobile.png, draft-ideas.png; pārskatīti vizuāli.

## Apzināti nav darīts
- Nav publicēts, nav mainīta produkcijas datubāze, vietnes karte, publiskās saites, sākumlapas animācija vai citas lapas.
- Nav veikti pasūtījumi, maksājumi, e-pastu sūtīšana vai redaktora automātiska atvēršana.
- Nav mobilās peldošās pogas: saglabāta droša līdzāspastāvēšana ar esošo sīkdatņu logu un kājeni.
- Nav jauna koplietošanas attēla metadatos: saglabāts esošais vietnes attēls, kamēr melnraksts nav publicēts.
- “Melnraksts” un noindex nav piekļuves parole; lapu joprojām var atvērt ar tiešo adresi.
- Pārbaudīti Chromium ekrāna izmēri, nevis fiziskas iOS/Android ierīces.