# T-Bode tehniskais audits — 2026-10-20

## Statuss un robežas

Izmaiņas ir sagatavē pārskatīšanai. Nekas nav publicēts vai izvietots. Publicēšanu pēc pārskatīšanas veic Raimonds. Netika izmantoti apakšaģenti, veikti pasūtījumi, maksājumi, e-pastu sūtīšana, datu dzēšana vai Google kontu iestatījumu maiņa. Redzamie mārketinga teksti, cenas, pasūtīšanas loģika un galvenes kompozīcija nav mainīti.

## Konstatētais un labotais

| Atradums | Drošais labojums |
|---|---|
| Strukturētajos datos logotips `/assets/logo.svg` publicētajā lapā atbild ar 404. | Norādīts esošais T-Bode `/logo-email.png`; pārbaudīts HTTP 200. |
| WebSite SearchAction norādīja `/collection?q=...`, bet filtru kods `q` nelasa. | Izņemta neesošās meklēšanas deklarācija; WebSite sasaistīts ar OnlineStore. |
| Kopējā Service shēmā bija statiskas cenas 9,90–59,90 un 20 piedāvājumi bez saites ar faktiskajiem datiem. | Izņemts nepamatotais AggregateOffer; faktiskā Product cena/pieejamība palikusi neskarta. Service teritorija saskaņota ar Latviju. |
| `/design` ir preču izvēles lapa, nevis tieši atvērts konstruktors; HowTo norādīja neesošus `#step-*`, 3 minūtes un 0 EUR. | Nomainīts tikai JSON-LD uz CollectionPage ar esošo nosaukumu/aprakstu un BreadcrumbList. |
| Kanoniskās adreses pārraides parametrus izmeta tikai automātiskajā, nevis skaidri norādītas adreses zarā. | Vienots `seoPolicy.ts`: apex izcelsme, bez query/hash, konsekventa sākumlapas `/`. Arī pāradresācijas norādes vairs neizmanto preview/www izcelsmi. |
| Preču ielādes laikā uz īsu brīdi tika norādīts noindex; publiskam produktam tas nav vajadzīgs. Draft `?preview=1` nebija konsekventi izslēgts. | Ielādes laikā publiska prece nav noindex; tehniskajām lapām un draft priekšskatījumiem centrāls noindex. `noindex, follow` ļauj sekot publiskām saitēm. |
| Bildes kļūmes atstāja bezgalīgu ielādes indikatoru; ārējais onLoad varēja pārrakstīt iekšējo gatavības stāvokli. | OptimizedImage un ProductCard atkārto sākotnējo attēlu, pēc tam rāda neitrālu vietējo attēla simbolu; saglabāti esošie rāmji. |
| Fonti tika atklāti ar attālu CSS importu. | Tas pats fonts un svari pārcelti uz head stylesheet/preconnect. Izskats nav mainīts; mērīta nobīde nav būtiski uzlabojusies. |
| Vietnes kartes pieprasījumi nebija dalīti lapās; dažādās funkcijās atšķīrās kategorijas un publicētas preces redzamība. | Saglabāti visi trīs mehānismi; 1000 rindu lapošana, aktīvās satura kategorijas visos ceļos. Funkciju kopīgs anonīms lasītājs izmanto to pašu publisko redzamību kā veikals, ieskaitot `always_available`. |
| Ģenerators pēc datu pieprasījuma kļūmes varēja pārrakstīt karti ar nepilnīgu statisku rezultātu. | Kļūmes gadījumā esošais fails paliek un komanda beidzas ar kļūdu. XML adreses tiek ekranētas. |
| `updated_at` produktiem/rakstiem avotā atjaunina vispārēji UPDATE trigeri, arī nesaturiskām izmaiņām. | `lastmod` izņemts visos mehānismos un ģenerētajā kartē; nav autoritatīva būtiskas satura izmaiņas lauka. |

OnlineStore ir Organization apakštips, tāpēc otrs dublējošs Organization objekts nav nepieciešams. Vietnes kopējā shēmā nav LocalBusiness vai četru veikalu objektu. Veikalu redzamā kontaktinformācija saglabāta.

## Analytics: faktiskie identifikatori un ceļi

- Atrasts viens Measurement ID: **G-09YMNHC0BF**.
- `index.html`: viens gtag.js ielādētājs, consent default denied, viena config komanda ar `send_page_view: false`; pieņemta izvēle tiek nolasīta no `tbode_cookie_consent`.
- `src/App.tsx`: viens `GaPageviews` instances punkts.
- `src/components/GaPageviews.tsx`: manuāls page_view uz katru pathname/search maiņu; grant/deny consent funkcijas.
- `src/components/CookieConsent.tsx`: pieņemšana/noraidīšana un izvēles glabāšana. Šī darbība nav mainīta.
- Pārbaudītajā sākumlapa → design → produkts plūsmā kods nosūtīja vienu manuālu notikumu katrai adresei; otra GA birka vai StrictMode dubultojums avotā nav atrasts.
- **Reāla neatbilstība:** SPA notikuma `page_title` var saturēt iepriekšējās lapas nosaukumu, jo tas tiek nosūtīts pirms slinki ielādētas lapas Helmet atjauninājuma. `page_path` un `page_location` pārbaudē bija pareizi. Šajā auditā mērīšanas darbība netika pārrakstīta; risks paliek.
- **Kontā nepārbaudīts:** Enhanced Measurement history-change pageviews var dublēt manuālos notikumus. `send_page_view: false` pats par sevi nepierāda, ka šis konta iestatījums ir izslēgts. Raimonds to pārbauda GA saskarnē.
- Consent mode denied nenozīmē, ka nav neviena pieprasījuma: gtag tiek ielādēts uzreiz un var sūtīt bezsīkdatņu pingus. Pieņemšana kodā piešķir arī reklāmu atļaujas. Juridiska atbilstība un atļauju granularitāte nav apstiprināta; politiku nemainīju.
- Nav pievienots jauns GA kods, un nav pārbaudīta datu saņemšana GA kontā vai faktiskā apmeklējuma krituma cēlonis.

## Pārbaudes

- HTTP GET: apex sākumlapa, robots.txt, sitemap.xml atbild 200. `https://www.t-bode.lv/design` atbild **302** uz `https://t-bode.lv/design`, nevis 301. Client-side replace nav HTTP 301 ekvivalents; komentāri koriģēti, hostinga/auth darbība nav mainīta.
- Robots Google/Bing/AI un wildcard grupas atļauj lapas. Esošie citu skrāpju aizliegumi saglabāti. Netika pievienots valstu vai meklētāju bloķējums.
- Chromium headless: datora 1280×1800 un telefona izmēra 390×760 skati. Publiskās sākumlapas un design kontrole arī uz live mobilā izmēra; izmaiņu kontrole lokālajā sagatavē.
- Reāls ceļš ar klikšķiem: sākumlapa → `/design` → Stanley Stella organiskās kokvilnas krekls → galvenā personalizēšanas poga → izvēles dialogs. Dialogs atvērās abos izmēros. Konstruktora darbība tālāk, grozs un maksājums netika izmēģināti.
- Sākumlapai, design un pārbaudītajam produktam viens canonical, atbilstošs virsraksts un publiska indeksēšana. `?preview=1` canonical bez query un noindex; `/checkout`, `/auth`, `/payment-success` noindex. Nav visu privāto skatu pārlūka matricas.
- Simulēta transformācijas kļūme: original foto ielādēts. Simulēta arī original kļūme: vietējais simbols redzams, rāmis saglabāts 312,66 px, nav bezgalīgas atkārtošanas.
- Galvenes un preču attēliem pārbaudītajās vietās esošie aspect-square/fiksētie rāmji jau rezervē izmēru. Patvaļīgs nezināms width/height netika izdomāts.
- **17 testi iziet:** `seo-policy.test.ts` (11), `sitemap-priority.test.ts` (4), `sitemap-generation.test.ts` (2). Fixtures pārbauda arī 1001. produktu, XML ekranēšanu un esošas kartes saglabāšanu kļūmes laikā. Pirmā palaišana ar node vidi izgāzās kopīgā window setup dēļ; atkārtota projekta noklusētajā vidē iziet.
- Ģenerētais sitemap: **46 adreses — 8 statiskas, 25 preces, 9 raksti, 4 kategorijas**, bez lastmod, checkout/cart/admin/profile/preview adresēm. Nav pilna preču satura audita. Saglabāta iepriekš neiekļautā maisiņu pilotlapa; jaunas landing lapas netika publicētas.
- JSON-LD statiskajā head sintaktiski derīgs. Sagataves automātiskās kompilācijas jaunākais pārbaudītais rezultāts: build OK.
- Avotā esoši Veco URL pāradresācijas ceļi saglabāti; nekas masveidā nav izņemts.

## Atlikušās robežas un riski

1. **SSR/prerender šobrīd nav:** Vite React SPA, tukšs root sākotnējā HTML, nav esoša SSR/prerender mehānisma. Google var izpildīt JS; ne visiem sociālajiem/AI robotiem ir per-route saturs vai privāto lapu noindex sākotnējā atbildē. Neliela tehniska korekcija to pilnībā neatrisina; migrācija netika veikta. Nepievienoju homepage canonical statiskajam head, lai tas nekļūtu par visu apakšlapu canonical.
2. **Nobīde paliek:** sākumlapas laboratorijas CLS ap 0,068 datorā un 0,094 telefona izmērā; līdzīgs sākotnēji izmērītajam. Avoti rāda galvenes teksta/pogu un nākamās sadaļas pārvietošanos, nevis nepietiekamu preču attēlu rāmi. Fontu atklāšanas uzlabojumu nedrīkst saukt par CLS kļūdas atrisinājumu; galvenes renderēšana/izskats nav mainīts. Tie nav lauka Core Web Vitals un nav statistiska mērījumu sērija.
3. **www 302:** hostinga iestatījuma pārskatīšana uz pastāvīgu 301/308 ir atsevišķs darbs; OAuth un sesiju izņēmumi netika aiztikti.
4. **Analytics:** agrs page_title un iespējamie Enhanced Measurement dubultnotikumi jārisina atsevišķi; konta piekrišanas iestatījumi nav pārbaudīti.
5. **Attēli:** atsevišķi oriģinālie produktu attēli joprojām ir lieli un var vēlāk parādīties rezervētajā rāmī. Personalizēšanas izvēles dialoga ekrānattēlos abi dekoratīvie foto rāda neielādētu attēlu simbolu; šis esošo asset pointer adreses/ielādes risks paliek, dialoga pogas un teksts ir pieejami. Mobilajā skatā sīkdatņu logs aizsedz daļu dialoga. Visi 25 produkti/galerijas nav auditēti. ProductDetail galvenā original attēla animāciju, dialoga kompozīciju un sīkdatņu darbību nepārrakstīju.
6. **Publicēšana:** visas izmaiņas tikai sagatavē. Abām publiskajām sitemap funkcijām kopīgais lasītājs ir sagatavots, bet šajā uzdevumā nav izvietots vai pārbaudīts hostētajā izpildē. Statiska karte atjaunojas publicēšanas laikā, ne uzreiz pēc katras turpmākas preces izmaiņas.
7. **Pārklājums:** nav īstas iOS/Android ierīces, Safari/Firefox, pilna kataloga, maksājumu, e-pastu vai autentificēta pasūtījuma pārbaudes. Google indeksēšanas spriedumi, sitelinku secība un ieņēmumu krituma cēlonis šajā auditā nav pierādīti.

## Izmainītie faili

- `index.html` — esošie fonti head, shēmas labojumi, precīzs redirect komentārs.
- `src/index.css` — izņemts tikai fontu remote import.
- `src/lib/seoPolicy.ts` — jauns canonical/noindex noteikumu palīgs.
- `src/components/Seo.tsx` — centralizētie, atrašanās vietai sekojošie noteikumi.
- `src/App.tsx` — tikai LegacyRedirect canonical un komentāri, ne auth/groza loģika.
- `src/pages/ProductDetail.tsx` — tikai izņemts noindex ielādes zarā.
- `src/pages/DesignYourOwn.tsx` — tikai strukturētie dati.
- `src/components/OptimizedImage.tsx`, `src/components/ProductCard.tsx` — attēlu kļūmju apstrāde esošā rāmī.
- `public/image-unavailable.svg` — neitrāls attēla kļūmes simbols.
- `src/components/GaPageviews.tsx` — tikai precizēts consent komentārs; notikumu loģika nav mainīta.
- `scripts/generate-sitemap.ts`, `public/sitemap.xml` — lapošana, kategorijas, kļūmju drošība, lastmod politika.
- `supabase/functions/_shared/public-sitemap.ts` — jauns kopīgs publisko rindu lasītājs.
- `supabase/functions/sitemap/index.ts`, `supabase/functions/generate-sitemap/index.ts` — tas pats lasītājs/kategorijas/lastmod politika; nav izvietotas.
- `src/test/seo-policy.test.ts`, `src/test/sitemap-generation.test.ts` — jauni noteikumu testi; esošais prioritāšu tests nav mainīts.
- `AGENTS.md`, `roadmap.md`, šis audita fails — uzturēšanas noteikumi un pārskatīšanas rezultāti.

**Commit:** manuāls Git commit nav izveidots; projekta versijas pārvalda Lovable. Nav izdomāta commit identifikatora.