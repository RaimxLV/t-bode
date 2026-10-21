# Maisiņu v2 pārbaude

Piegādātais tbode-bags-authored-v2.zip integrēts /auduma-maisinu-apdruka, saglabājot tekstus, attēlus, koncepciju izvēli un esošo page-owned produkta krāsu. Sākotnējā versija: 3f6222946b468f48f47af9cbb2a3c4db002d1693.

## Izmaiņas
- src/pages/landing/AudumaMaisinuApdruka.tsx — piegādātā lapa; bags.css pirms bagStudio.css.
- src/components/bags/BagStudio.tsx — piegādātā kompozīcija un manuālā studija, bez lokālā CSS importa.
- src/components/bags/bagStudio.css — piegādātais izkārtojums ar saderības precizējumiem.
- src/assets/bag-art-graphic.webp.asset.json
- src/assets/bag-art-illustration.webp.asset.json
- src/assets/bag-art-photo.webp.asset.json
- src/index.css — izolētās studijas krāsu vērtības definētas kā globāli tokeni.
- AGENTS.md, roadmap.md un nepubliskie pārskata faili.

## Mehāniskās atšķirības no ZIP
- Trīs nemainītie WebP glabājas Lovable Assets; importi izmanto .asset.json norādes, nevis repo bināros failus.
- Neapstrādātās pogas/CTA izmanto esošo Button ar CSS, kas saglabā piegādātos izmērus un izkārtojumu.
- Krāsas un ēnas pārceltas uz semantiskiem tokeniem, nemainot vērtības; atbilstoši projekta noteikumiem burtu atstarpes ir 0, desktop H1 izmanto fiksētus 108 px un piegādātos mazāko izmēru noteikumus, nevis viewport-scaled clamp.
- Vizualizācijas paraksts pārvietots zem foto kompozīcijas, jo piegādātais novietojums pārklājās ar foto parakstu; citu dizainu vai tekstus neizdomājām.

## Pārbaudes
- Automātiskā projekta kompilācija: build OK; nav manuāli palaista atsevišķa build komanda.
- 9 esošie testi: product-initial-color (3) un product-detail-navigation (6), visi veiksmīgi. Esošajā ProductDetail testa vidē ir fetchPriority React brīdinājums, nevis kļūme.
- Chromium: 360, 390, 768 un 1440 px; visi lapas attēli ielādēti, pārbaudītajos virsrakstos, tekstos un vadīklās nav pārplūdes.
- Katrā platumā manuāli aktivizētas Ilustrācija, Fotogrāfija, Grafika; pareizā koncepcija/attēls, tuvināšanas ieslēgšana/izslēgšana un atiestate, mainot koncepciju.
- Tastatūras Enter aktivizācija un redzams fokusa apzīmējums; reduced-motion gadījumā attēla transitionDuration ir 0s, koncepciju izvēle turpina strādāt.
- Ir 16 īstas krāsu izvēles; izvēloties Tumši zila, visas 4 sākšanas saites, arī studijas saite pēc koncepcijas pārslēgšanas, satur color=Dark%20blue.
- Atvērta īstā Kokvilnas soma no preces CTA un pārbaudīta atgriešanās melnrakstā; editoru, grozu un maksājumus neaktivizējām.
- noindex, follow saglabāts; nav pārlūka pageerror kļūdu.

## Faktiskie JPEG base64 teksta faili
- .lovable/review/bags-v2-desktop.jpg.b64 — 1440×1000
- .lovable/review/bags-v2-studio.jpg.b64 — pilnas desktop studijas elementa ekrānattēls
- .lovable/review/bags-v2-mobile.jpg.b64 — 390×1000
- .lovable/review/bags-v2-fullpage.jpg.b64 — 1440×5047
- .lovable/review/bags-v2-mobile-studio.jpg.b64 — pilnas mobile studijas elementa ekrānattēls

Visi pieci ir faktiskā jaunās lapas Chromium renderējuma JPEG (kvalitāte 82), pēc fontu/attēlu ielādes un parastās pogas “Tikai nepieciešamās” nospiešanas; ne ģenerēti pārskata attēli. Vizuāli pārbaudīti. Tie nav public/ un netiek importēti lietotnē.

## Ierobežojumi un drošība
Lokālais Vite neatpazīst Lovable CDN /__l5e/assets-v1 ceļu un atdod HTML; tikai pārbaudes pārlūkā šie trīs pieprasījumi saņēma tieši faktiskos CDN WebP baitus no priekšskatījuma domēna. Visas trīs CDN adreses atsevišķi pārbaudītas — 200 image/webp; projekta attēli nav aizvietoti ar ģenerētiem vai veciem ekrānattēliem. Hostētās lapas piekļuves kontrole nav apieta vai mainīta; pilns hostētās lapas pārbaudījums šajā turnā nav veikts.

Nav publicēts, izvietots vai mainīta redzamība. Nav publisku navigācijas/vietnes kartes saišu, datu rakstīšanas, pasūtījumu, maksājumu vai e-pastu. BagProduct, katalogs, cenas, editors, Navbar/Footer un sākumlapas animācija nav rediģēti.