# SEO noslēgums — 20.10.2026

Izskats, teksti, cenas un pasūtīšana nav mainīti. Nekas nav publicēts. Nav veikti pasūtījumi, maksājumi vai e-pasti.

## Pārbaudīts (jau bija kārtībā)
- Veikalu informācija ir tikai vienā lapā — `/veikali` (canonical uz sevi). `/stores`, `/store`, `/kontakti`, `/contact`, `/locations` pāradresē uz `/veikali` (pārlūkā pārbaudīts: `/stores` → `/veikali`). Atsevišķas dublētas veikalu lapas nav.
- Izvēlnē un kājenē `/design` ir pirms `/veikali`. Tās ir īstas `<a href>` saites.
- Vecās konfiguratora adreses (`/configurator/*`, `/designs`, `/dizains`, `/design-catalog`) ved uz `/design`. Preču adreses (`/product/:slug`, `/products/:slug`) ved uz to pašu preces slug. Ziņu un bloga adreses ved uz `/idejas`. Nesaistīts saturs nav sasaistīts.
- robots.txt atļauj meklētājus. Sitemap satur tikai publiskās kanoniskās adreses — nav groza, kases, profila vai priekšskatījuma lapu.
- Neeksistējošām precēm un kategorijām, kā arī 404 lapai jau bija noindex.

## Izlabots
| Fails | Izmaiņa |
|---|---|
| `src/components/HeroSection.tsx` | Galvenes pogas "Sākt personalizēt" un "Skatīt kolekciju" bija JS pogas, tagad tās ir saites `<a href="/design">` un `/collection` ar tām pašām klasēm. Izskats pārbaudīts pie 1280 un 390 px platuma. |
| `src/pages/BlogPost.tsx` | Neeksistējošs raksts mantoja index no statiskās lapas. Tagad tam ir `noindex, follow` (pārbaudīts pārlūkā). |
| `src/components/Seo.tsx` | BreadcrumbList strukturētajos datos relatīvās adreses (`/`, `/idejas`) aizstātas ar absolūtām kanoniskajām adresēm. |
| `index.html` | Uzņēmuma `sameAs` profilu saites (`facebook.com/tbode.lv`, `instagram.com/tbode.lv`) neatbilda kājenes saitēm. Aizstātas ar kājenē esošajām: `instagram.com/t_bode.lv` un `tiktok.com/@tbode.lv`. |
| `src/test/seo-closeout.test.ts` | Jauns tests: veikalu aizstājvārdi ved uz vienu lapu, un galvenes poga ir saite uz `/design`. |

Strukturētajos datos jau ir OnlineStore un Service ar `serviceUrl` `/design`, kā arī SiteNavigationElement, kur pirmā ir sadaļa "Sākt personalizēt". Netika pievienoti izdomāti vērtējumi, cenas vai solījumi.

## Testi
- `bunx vitest run src/test`: 9 faili, 41 tests — visi iziet.
- TypeScript pārbaude: bez kļūdām.

## Atlikušie reālie ierobežojumi
- **Sitelinks secība:** Google to nosaka pats. Sitemap prioritātes un shēma nevar garantēt, kuras saites rādīsies.
- **www → apex:** hostings atbild ar 302, nevis 301. To pārvalda hostings, avota kodā to mainīt nevar.
- **Nezināmas adreses:** saņem HTTP 200 SPA lapu, nevis 404. Statiska priekšrenderēšana nav ieviesta. Meklētājs noindex redz tikai pēc JS izpildes.
- **new.t-bode.lv:** DNS norāda uz Lovable hostinga IP, un adrese atbild ar HTTP 200. Šī projekta domēnu sarakstā tās nav — tikai t-bode.lv un www.t-bode.lv. Tātad tā pieder citam projektam vai ir nepiesaistīta. Pārbaude bija tikai lasīšanai, nekas netika mainīts. Ja tur ir sākumlapas dublikāts, tas jāaizver vai jāpāradresē tajā projektā.
