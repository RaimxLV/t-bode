# Atlikušie tehniskie labojumi — 20.10.2026

## Pabeigts

- Saglabāts iepriekšējais izskats, teksti, preces, varianti, cenas, pasūtīšana un piekrišanas izvēles. Nekādi pasūtījumi, maksājumi, e-pasti vai datu dzēšana nav veikti. Apakšaģenti nav izmantoti.
- Identiskais Bebas Neue fonts glabāts lokāli un priekšielādēts. Tas novērš galvenes virsraksta sākotnējo pārkārtošanos, nemainot kompozīciju. Inter palicis esošais.
- Kartes bibliotēka un karte ielādējas tikai pie kartes zonas; rāmis un kontaktinformācija paliek. Ārpus ekrāna galerijas animācija apstājas. Preču kartīšu karuseļi inicializējas pie redzamās zonas, ne viss katalogs uzreiz; sākotnēji/kaimiņu slaidi ielādējas pēc vajadzības, saites un izmēri saglabāti.
- Četri precīzi vecie FANU, LATVIJA bordo/desert dust un OZOLLAPAS priekšpuses foto apstiprināti krātuves objektos un anonīmos HTTP 200 pieprasījumos. Kopīgs resolver atjauno tikai šos failus gan mml, gan www.mml adresēm. Nekādi produktu dati nav pārrakstīti. Nezināmi faili netiek minēti.
- Abi dialoga oriģinālie 1024×1024 foto atgūti no publicētajiem assetiem un ievietoti jaunās projekta asset norādēs. Priekšskatījumā relatīvā asset adrese deva SPA HTML, ne attēlu; izmantota absolūta pieejamā projekta domēna adrese. Abas jaunās fotogrāfijas pārlūkā ielādējas telefonā un datorā.
- GA paliek **G-09YMNHC0BF**. Seo paziņo tikai gatavo lapas virsrakstu; produkta ielādes nosaukums netiek nosūtīts. Viens page_view katrai publiskajai lapai, ne jauns notikums uz filtra query maiņu. Manuālie notikumi izslēgti privātajiem/draft/nezināmajiem ceļiem. Query/hash nav nosūtīti, referrer saglabā tikai izcelsmi; automātisko notikumu noklusējuma adrese privātā lapā ir neitrāla sākuma izcelsme. Piekrišanas grant/deny uzvedība nav mainīta. Konta Enhanced Measurement vēstures uzskaite jau izslēgta pēc Raimonda pārbaudes.
- Abas sitemap funkcijas **izvietotas** un pēc tam pārbaudītas bez lietotāja sesijas: HTTP 200, vienādas 46 publiskas adreses, neviena cart/checkout/admin/profile/preview, nav nepamatota lastmod. Izvietošanas source SHA: sitemap `02e465b927d86e05eb82fab01ad368cf4cc038c1c48bbf920e62699a1287a432`, generate-sitemap `afcf99b38cdfbe501bc7f276c908df59085d41ec84e7831b0ef8651536630bfd`.
- Esošajam statiskajam `/404.html` pievienots noindex un izņemta GitHub Pages pāradresācija, kura Lovable hostingam nav vajadzīga. Tas nemaina hostinga catch-all uzvedību.

## Pirms / pēc: laboratorija, ne lauka INP

Chromium headless, 390×760, 4× CPU; viena sākotnējā un vairākas pēclabojumu izpildes ar to pašu lokālo Vite lapu. Dev moduļu un pārlūka kešatmiņas atšķirības neļauj šos rezultātus pasniegt kā kontrolētu produkcijas ātruma procentu.

| Signāls | Pirms | Pēc |
|---|---:|---:|
| Sākumlapas CLS | 0,094075 | 0,000575 |
| Sākumlapas long task skaits >50 ms | 10 | 5 |
| Sākumlapas lielākais long task | 606 ms | 477–508 ms |
| Pēc klikšķa uz design lielākais long task | 649 ms | 251–262 ms pēdējās divās pārbaudēs |
| Karte sākumlapas augšā jau inicializēta | jā | nē; parādās, aizritinot līdz stores |

Konkrēta galvenes nobīdes cēloņa novēršana ir atkārtojama. Lielie JS uzdevumi nav pilnībā izņemti; **GSC 19 URL INP 290 ms vēsturiskais lauka brīdinājums nav atzīmēts kā atrisināts**. Publicētās lapas lauka INP jānovēro pēc izmaiņu nonākšanas pie lietotājiem; tie nav šī testa dati.

## Pārbaudes

- **34 testi iziet**, 6 faili: analytics policy (10), GA gatavais virsraksts/checkout (2), precīzie vecie foto (5), SEO policy (11), sitemap priority (4), sitemap generation (2).
- Chromium datora 1280×1800: sākumlapa → design → Stanley Stella produkts → dialoga atvēršana. Pareizi trīs page_view nosaukumi, bez query/hash. Dialoga abi foto ielādēti; pārbaudītie FANU/LATVIJA/OZOLLAPAS saistīto preču foto ielādēti. Neielādēti ārpusaktīvie slaidi ir apzināti atlikti, ne kļūmes.
- Chromium telefona 390×760: sākumlapa, atliktā karte, Stanley Stella M izvēle un dialoga atvēršana; abi foto ielādēti, nav horizontālas pārplūdes vai runtime kļūdu. Sīkdatņu logs joprojām var aizsegt dialoga apakšu — šī esošā piekrišanas uzvedība nav pārveidota.
- Tiešs checkout ar privātu testa query/hash: **0 manuālu page_view**. Nekādi ievadīti pirkuma dati vai pasūtījumi.
- Sagataves automātiskās kompilācijas pēdējais pārbaudītais rezultāts: **build OK**.
- Nav īstas iOS/Android ierīces, Safari/Firefox, pilna kataloga vai maksājumu pārbaudes.

## Bloķēts ārpus pieejamās konfigurācijas

1. **Droša publisko lapu priekšrenderēšana nav ieslēgta.** Esošajā hostingā jebkura nezināma pārlūka adrese tiek apkalpota ar root index.html; pārbaudītais nezināmais live ceļš atbild HTTP 200 ar esošo SPA dokumentu. Zināmais Lovable hostinga mehānisms neatbalsta `_redirects`/`_headers` un pieejamie rīki neļauj iestatīt atsevišķu fallback shell. Publiskas sākumlapas HTML ievietošana root tādēļ atdotu sākumlapas saturu arī checkout/admin/nezināmajām adresēm bez JS. Atsevišķu `/path/index.html` failu ģenerēšana pati nepierāda tīro `/path` adreses apkalpošanu, query privātumu vai React hydration atbilstību. Nav pievienots nepārbaudīts postbuild pārlūka renderētājs vai apgalvots SSR. Nepieciešama hostinga maršrutēšanas iespēja/garantija vai atsevišķa atbalstīta servera šablona migrācija; šajā uzdevumā migrācija nav veikta.
2. **www 301/308 nav mainīts.** Domēns ir pieslēgts un konfigurēts uz t-bode.lv; svaigs HTTP pieprasījums `/design` dod **302**. Domēna rīks ir tikai lasāms, nav HTTP statusa maiņas konfigurācijas. Netika pievienots nestrādājošs `_redirects` vai aiztikti OAuth izņēmumi. Vajadzīga Lovable hostinga atbalsta/konfigurācijas piekļuve šim statusam.
3. **Frontend publicēšana:** sagatavots Raimonda pārskatīšanai, kā pēdējā uzdevumā norādīts; aģents nav palaidis frontend publicēšanu. Abas servera sitemap funkcijas jau izvietotas.

## Izmainītie faili

`index.html`, `src/index.css`, `public/bebas-neue.ttf`, `public/404.html`; `src/components/GaPageviews.tsx`, `src/components/Seo.tsx`, `src/lib/analyticsPolicy.ts`; `src/lib/legacyProductImages.ts`, `src/lib/imageOptimization.ts`, `src/hooks/useProducts.ts`, `src/components/RelatedProducts.tsx`; `src/components/DeferredWork.tsx`, `src/components/OfficeMap.tsx`, `src/components/StoresSection.tsx`, `src/components/GallerySection.tsx`, `src/components/ProductCard.tsx`; `src/pages/ProductDetail.tsx`, abi `src/assets/*design-model.png.asset.json`; 3 jaunie testi; `AGENTS.md`, `roadmap.md`, šis pārskats. Abas sitemap funkcijas izvietotas no iepriekš sagatavotā koda, nevis pārrakstītas.

**Pārbaudītā labojumu versija:** `6a629a2` (Lovable pārvaldīts commit, nolasīts pēc koda labojumiem; šis dokumentācijas noslēgums var radīt nākamo versiju). Manuāls commit nav veikts.