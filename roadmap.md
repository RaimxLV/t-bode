# Interneta veikala prioritāte meklēšanā

# 100 statisku maisiņu kompozīciju pamats
- [ ] Saglabāt sākotnējos 20 saukļus, pievienot 80 autora rindas un pakāpenisku visu kategoriju ielādi.
- [ ] Sagatavot ilustrāciju reģistru, slāņu manifestu un tikai pārbaudītām sagatavēm paredzētu sākotnējās izvēles savienojumu.
- [ ] Izņemt sensitīvos tokena žurnālus tikai avotā; pārbaudīt testus un priekšskatījumu bez izvietošanas vai datu rakstīšanas.

# Maisiņu lapas gala vizuālā apdare
- [x] Pievienot precīzas piegādes ikonas, 20 tipogrāfiskas idejas ar filtriem/priekšskatījumu/kopēšanu un savienotu procesa ilustrāciju.
- [x] Pārbaudīt 375/1440 px bez pārplūdes, 20 idejas, filtrus, Escape/aizvēršanu/fokusu, kopēšanas panākumus/kļūdu, Dark%20blue saiti, samazinātas kustības un apturēšanu ārpus ekrāna; Lenis pārlāde ~64 px, 16 testi un build OK; nepublicēts.

# Maisiņu melnraksta pārveide — 2026-10-21
- [x] Diagnosticēt hostētā priekšskatījuma veco izkārtojumu: avots pareizs, service worker nav; hostēto lapu nevar pārbaudīt aiz Lovable pieteikšanās robežas. Labota tiešā #ideju-studija ritināšana slinkajā maršrutā (scrollY 0→867, kompilācija OK).
- [x] Integrēt piegādāto v2 dizainu; pārbaudīti 360/390/768/1440 px, trīs koncepcijas, tuvināšana/atiestate, tastatūra, samazinātas kustības, 4 sākšanas saites ar Dark%20blue un 9 esošie testi; saglabāti pieci faktiskie base64 ekrānattēli, nepublicēts.
- [x] Saskaņot visu sākšanas pogu izvēlēto krāsu, trīs precizējumus un saglabāt faktiskos base64 ekrānattēlus pārskatīšanai (6 pogas ar Dark%20blue; 1440×1000, 390×1000, 1440×4741).
- [x] Izveidot izolētu redakcionālu maisiņu lapu ar apstiprināto attēlu un īstās preces krāsām.
- [x] Pievienot validētu sākotnējās krāsas saiti, saglabājot preču izvēļu izolāciju un atsvaidzināšanu (9 testi).
- [x] Pārbaudīt melnraksta metadatus, visas 16 krāsas, pārejas un 1440/1280/768/390/360 px izkārtojumu; nepublicēts.

- [x] Izvērtēt augšupielādētos ieteikumus un saskaņot visu esošo vietnes karšu prioritātes (abas publiskās funkcijas izvietotas un pārbaudītas).
- [x] Saskaņot sākumlapas meklēšanas tekstu un primāro navigācijas norādi ar “Sākt personalizēt”.
- [x] Pārbaudīt meklēšanas datus un personalizēšanas sākšanu, nemainot pasūtīšanu (4 testi; sākumlapa → /design → krekla lapa, bez pārlūka kļūdām).
- [x] Saglabāt interneta veikalu kā galveno biznesa prioritāti.
- [x] Saskaņot sākumlapas un personalizēšanas lapas meklēšanas aprakstus.
- [x] Izņemt dublētās veikalu navigācijas norādes un vietējā veikala marķējumu no vietnes kopējās informācijas.
- [x] Pārbaudīt metadatus un ceļu no sākumlapas uz personalizējamu preci (pārlūkā bez kļūdām).
- [x] Iepriekšējās drošās izmaiņas Raimonds publicējis un pārbaudījis t-bode.lv.

# Fokusēts tehniskais audits — 2026-10-20

- [x] Pievienot Raimonda pārbaudītos GA/GSC, INP un Zakeke rezultātus; apstiprināt jau ieviesto attēlu kļūmju aizvietošanu bez jauna plaša audita.
- [x] Pārbaudīt kanoniskās adreses, strukturētos datus, indeksēšanu un esošās vietnes kartes.
- [x] Pārbaudīt GA identifikatorus, piekrišanu un iespējamu dubultu lapu skatījumu uzskaiti; kontu iestatījumus nemainīt.
- [x] Ieviest tikai skaidrus, zema riska tehniskus labojumus bez redzamo tekstu, izskata un pasūtīšanas izmaiņām.
- [x] Veikt dažas Chromium datora un telefona izmēra pārbaudes un sagatavot audita rezultātus ar atlikušajiem riskiem.
- [x] Iepriekšējā audita izmaiņas Raimonds publicējis; jaunajam uzdevumam atļauta abu vietnes kartes funkciju izvietošana.

# Atlikušo darbu pabeigšana

- [x] Izmērīt un mazināt mobilās aiztures un galvenes nobīdi bez dizaina maiņas.
- [x] Atjaunot tikai precīzi apstiprinātas veco fotogrāfiju saites un dialoga attēlus.
- [ ] Publisko lapu HTML priekšrenderēšana: bloķē pārbaudāmas hostinga konfigurācijas trūkums atsevišķam SPA fallback; index.html saturs citādi nonāktu arī privātajās/nezināmajās adresēs.
- [x] Novērst novecojušu GA virsrakstu un privāto adrešu nosūtīšanu.
- [x] Izvietot un anonīmi pārbaudīt abas vietnes kartes funkcijas (46 vienādas publiskas adreses, 200).
- [ ] www 301/308: bloķē piekļuves trūkums hostinga HTTP pāradresācijas statusa konfigurācijai; pašlaik 302, OAuth nav mainīts.
- [x] Noslēgt ar 34 testiem, Chromium pārbaudēm un ārējiem šķēršļiem.
- [x] Iepriekšējie frontend labojumi publicēti un pārbaudīti pēc Raimonda apstiprinājuma.

# Preču izvēļu regresija

- [x] Izolēt krāsu, izmēru, attēlu, daudzumu un dizaina dialogus katras preces identitātei; tās pašas preces atsvaidzinājumā saglabāt izvēles.
- [x] Pārbaudīt Stanley Stella ↔ FANU saistīto preču pārejas pārlūkā bez kļūdām un pievienot 4 regresijas testus.
- [ ] Jauno labojumu pēc pārskatīšanas publicē Raimonds.
# Sākumlapas četru soļu animācija

- [x] Aizvietot statiskās ilustrācijas ar vienotu 22 sekunžu stāstu, saglabājot esošos tekstus.
- [x] Pievienot soļu izvēli, pauzi, redzamības apturēšanu un samazinātas kustības režīmu.
- [x] Pārbaudīt visus četrus soļus, pilnu ciklu, tastatūru, pauzi un samazinātas kustības režīmu 1280/390 px; bez pārplūdes un pārlūka kļūdām.
- [ ] Animāciju publicē Raimonds pēc pārskatīšanas.
