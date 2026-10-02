# Tehniskā SEO sakārtošana

## Atrastie cēloņi
- **Dublētais apraksts:** sākuma faila galvenē ir "cietais" sākumlapas apraksts, title, canonical un og tagi. Katra apakšlapa pieliek savu, bet vecais paliek — Google redz divus aprakstus un bieži ņem sākumlapas.
- **Tehniskās lapas:** Kasei, Profilam, Pieslēgšanai, Admin jau ir noindex, bet **"Paldies par pirkumu" (/payment-success) nav vispār**. Grozs ir izvelkams panelis, kuru Google redz kā saiti "Grozs" izvēlnē.
- **Sitemap:** rakstu saites ved uz vecajām /blog/... adresēm (pāradresācijas), trūkst /idejas, /kas-ir-dtf, /auduma-maisinu-apdruka; /install nav vajadzīga.

## Ko darīšu (tikai SEO, dizains un pasūtīšana netiek aiztikti)
1. **noindex:** pievienot /payment-success, /install, /reset-password pārbaude; robots.txt aizliegt /checkout, /profile, /auth, /admin, /payment-success; izvēlnes "Grozs" pogai `rel="nofollow"` un ka tā ir poga, nevis saite.
2. **Unikāli meta dati:** no sākuma faila izņemt dublējošo title/description/canonical (atstāju tikai rezerves og tagus sociālajiem tīkliem). Sākumlapas aprakstā: "Pasūti kreklu un saņem 1-2 dienās jebkur pakomātā." Pārbaudīt un, kur trūkst vai dublējas, iedot savu tekstu: Kolekcija (katalogs), Dizains, Veikali/Kontakti, Idejas + kategorijas, preces (bērnu krekli u.c. — no preces nosaukuma un kategorijas), DTF lapa, noteikumi, privātums.
3. **Sitemap + canonical:** prioritātes — sākumlapa 1.0; Kolekcija, Dizains 0.9; Veikali, Idejas, DTF 0.8; preces 0.6; raksti 0.5; juridiskās 0.2. Rakstiem pareizās /idejas/... adreses. Canonical katrai lapai uz pašu sevi (jau ir centrāli, pārbaudīšu dublikātu neesamību).
4. **SiteNavigationElement:** sākumlapā Schema.org iezīmējums galvenajām sadaļām: Kolekcija, Izveido dizainu, Idejas un padomi, Kas ir DTF, Veikali un kontakti.

## Pārbaude
Atvēršu katru lapu pārlūkā un pārliecināšos, ka ir tieši viens title, viens apraksts, viens canonical un pareizs noindex.

Piezīme: Google sitelinkus atjauno pats 1–4 nedēļu laikā pēc publicēšanas.
