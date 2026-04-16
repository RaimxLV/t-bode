import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useTranslation } from "react-i18next";

const PrivacyPolicy = () => {
  const { i18n } = useTranslation();
  const isLv = i18n.language === "lv";

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="text-4xl md:text-5xl mb-8">
            {isLv ? "Privātuma politika" : "Privacy Policy"}
          </h1>
          <div className="prose prose-invert max-w-none font-body text-muted-foreground space-y-6 [&_h2]:text-foreground [&_h2]:font-display [&_h2]:text-2xl [&_h2]:mt-10 [&_h2]:mb-4 [&_h3]:text-foreground [&_h3]:font-display [&_h3]:text-xl [&_h3]:mt-6 [&_h3]:mb-3 [&_strong]:text-foreground [&_a]:text-primary [&_a]:underline [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1">
            {isLv ? <PrivacyContentLV /> : <PrivacyContentEN />}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

const PrivacyContentLV = () => (
  <>
    <p><strong>Spēkā no:</strong> 2026. gada 16. aprīlis</p>
    <p>
      SIA "Ervitex" (reģ. nr. 40203512897, adrese: Braslas iela 29-2, Rīga, LV-1084),
      turpmāk — <strong>T-Bode</strong>, apņemas aizsargāt jūsu privātumu un personas datus
      saskaņā ar Eiropas Parlamenta un Padomes Regulu (ES) 2016/679 (Vispārīgā datu aizsardzības regula — GDPR)
      un Latvijas Fizisko personu datu apstrādes likumu.
    </p>

    <h2>1. Pārzinis</h2>
    <p>
      Personas datu pārzinis ir SIA "Ervitex".<br />
      E-pasts: <a href="mailto:info@t-bode.lv">info@t-bode.lv</a><br />
      Tālrunis: +371 29 475 227
    </p>

    <h2>2. Kādus datus mēs vācam</h2>
    <ul>
      <li><strong>Kontaktinformācija:</strong> vārds, e-pasta adrese, tālruņa numurs — kad jūs veidojat kontu vai veiciet pasūtījumu.</li>
      <li><strong>Pasūtījumu dati:</strong> piegādes adrese, pasūtījumu vēsture, maksājumu informācija (apstrādā Stripe).</li>
      <li><strong>Tehniskie dati:</strong> IP adrese, pārlūkprogrammas veids, apmeklējuma laiks — automātiski, izmantojot sīkdatnes.</li>
      <li><strong>Saziņas dati:</strong> ziņojumi, ko jūs mums sūtāt caur kontaktformu.</li>
    </ul>

    <h2>3. Datu apstrādes mērķi un tiesiskais pamats</h2>
    <ul>
      <li><strong>Līguma izpilde</strong> (GDPR 6(1)(b)): pasūtījumu apstrāde, piegāde, konta pārvaldība.</li>
      <li><strong>Leģitīmās intereses</strong> (GDPR 6(1)(f)): vietnes uzlabošana, krāpšanas novēršana, statistika.</li>
      <li><strong>Piekrišana</strong> (GDPR 6(1)(a)): mārketinga paziņojumi, analītiskās sīkdatnes.</li>
      <li><strong>Juridiskais pienākums</strong> (GDPR 6(1)(c)): grāmatvedības un nodokļu prasības.</li>
    </ul>

    <h2>4. Sīkdatnes</h2>
    <p>Mēs izmantojam šādas sīkdatnes:</p>
    <ul>
      <li><strong>Nepieciešamās sīkdatnes:</strong> nodrošina vietnes pamatfunkcijas (sesija, valodas izvēle, iepirkumu grozs). Neprasa piekrišanu.</li>
      <li><strong>Analītiskās sīkdatnes:</strong> palīdz saprast, kā apmeklētāji lieto vietni. Tiek izmantotas tikai ar jūsu piekrišanu.</li>
    </ul>
    <p>Jūs varat pārvaldīt sīkdatņu iestatījumus, dzēšot tās savā pārlūkprogrammā vai atsakoties no tām, kad parādās sīkdatņu paziņojums.</p>

    <h2>5. Datu nodošana trešajām personām</h2>
    <p>Mēs nenododam jūsu datus trešajām personām, izņemot:</p>
    <ul>
      <li><strong>Stripe</strong> — maksājumu apstrāde (ES datu centri).</li>
      <li><strong>Omniva</strong> — piegādes pakalpojums (Latvija/Baltija).</li>
      <li><strong>Servera pakalpojumu sniedzēji</strong> — datu uzglabāšana ES teritorijā.</li>
    </ul>

    <h2>6. Datu glabāšanas termiņi</h2>
    <ul>
      <li>Pasūtījumu dati — 5 gadi (grāmatvedības prasības saskaņā ar LR likumdošanu).</li>
      <li>Konta dati — kamēr konts ir aktīvs vai pēc jūsu pieprasījuma dzēst.</li>
      <li>Analītiskie dati — ne ilgāk kā 26 mēneši.</li>
    </ul>

    <h2>7. Jūsu tiesības</h2>
    <p>Saskaņā ar GDPR jums ir šādas tiesības:</p>
    <ul>
      <li>Piekļūt saviem personas datiem.</li>
      <li>Labot neprecīzus datus.</li>
      <li>Dzēst savus datus ("tiesības tikt aizmirstam").</li>
      <li>Ierobežot datu apstrādi.</li>
      <li>Iebilst pret datu apstrādi.</li>
      <li>Datu pārnesamība.</li>
      <li>Atsaukt piekrišanu jebkurā laikā.</li>
    </ul>
    <p>
      Lai izmantotu savas tiesības, sazinieties ar mums: <a href="mailto:info@t-bode.lv">info@t-bode.lv</a>.
      Ja uzskatāt, ka jūsu tiesības ir pārkāptas, jums ir tiesības iesniegt sūdzību
      Datu valsts inspekcijai (<a href="https://www.dvi.gov.lv" target="_blank" rel="noopener noreferrer">www.dvi.gov.lv</a>).
    </p>

    <h2>8. Drošība</h2>
    <p>
      Mēs izmantojam atbilstošus tehniskos un organizatoriskos pasākumus, lai aizsargātu jūsu personas datus
      pret nesankcionētu piekļuvi, zudumu vai iznīcināšanu, tostarp šifrētu datu pārraidi (SSL/TLS).
    </p>

    <h2>9. Izmaiņas privātuma politikā</h2>
    <p>
      Mēs paturam tiesības atjaunināt šo privātuma politiku. Par būtiskām izmaiņām informēsim
      vietnē vai pa e-pastu. Aicinām periodiski pārskatīt šo lapu.
    </p>
  </>
);

const PrivacyContentEN = () => (
  <>
    <p><strong>Effective from:</strong> April 16, 2026</p>
    <p>
      SIA "Ervitex" (reg. no. 40203512897, address: Braslas iela 29-2, Riga, LV-1084),
      hereinafter — <strong>T-Bode</strong>, is committed to protecting your privacy and personal data
      in accordance with Regulation (EU) 2016/679 (General Data Protection Regulation — GDPR)
      and the Latvian Personal Data Processing Law.
    </p>

    <h2>1. Data Controller</h2>
    <p>
      The data controller is SIA "Ervitex".<br />
      Email: <a href="mailto:info@t-bode.lv">info@t-bode.lv</a><br />
      Phone: +371 29 475 227
    </p>

    <h2>2. Data We Collect</h2>
    <ul>
      <li><strong>Contact information:</strong> name, email, phone number — when you create an account or place an order.</li>
      <li><strong>Order data:</strong> delivery address, order history, payment details (processed by Stripe).</li>
      <li><strong>Technical data:</strong> IP address, browser type, visit time — collected automatically via cookies.</li>
      <li><strong>Communication data:</strong> messages sent through our contact form.</li>
    </ul>

    <h2>3. Purposes and Legal Basis</h2>
    <ul>
      <li><strong>Contract performance</strong> (GDPR Art. 6(1)(b)): order processing, delivery, account management.</li>
      <li><strong>Legitimate interests</strong> (GDPR Art. 6(1)(f)): website improvement, fraud prevention, analytics.</li>
      <li><strong>Consent</strong> (GDPR Art. 6(1)(a)): marketing communications, analytical cookies.</li>
      <li><strong>Legal obligation</strong> (GDPR Art. 6(1)(c)): accounting and tax requirements.</li>
    </ul>

    <h2>4. Cookies</h2>
    <p>We use the following types of cookies:</p>
    <ul>
      <li><strong>Essential cookies:</strong> enable core website functions (session, language preference, shopping cart). No consent required.</li>
      <li><strong>Analytical cookies:</strong> help understand how visitors use the site. Used only with your consent.</li>
    </ul>
    <p>You can manage cookie settings by clearing them in your browser or declining them when the cookie notice appears.</p>

    <h2>5. Data Sharing</h2>
    <p>We do not share your data with third parties except:</p>
    <ul>
      <li><strong>Stripe</strong> — payment processing (EU data centers).</li>
      <li><strong>Omniva</strong> — delivery services (Latvia/Baltics).</li>
      <li><strong>Hosting providers</strong> — data storage within the EU.</li>
    </ul>

    <h2>6. Data Retention</h2>
    <ul>
      <li>Order data — 5 years (accounting requirements under Latvian law).</li>
      <li>Account data — as long as the account is active or upon your deletion request.</li>
      <li>Analytical data — no longer than 26 months.</li>
    </ul>

    <h2>7. Your Rights</h2>
    <p>Under GDPR you have the right to:</p>
    <ul>
      <li>Access your personal data.</li>
      <li>Rectify inaccurate data.</li>
      <li>Erase your data ("right to be forgotten").</li>
      <li>Restrict processing.</li>
      <li>Object to processing.</li>
      <li>Data portability.</li>
      <li>Withdraw consent at any time.</li>
    </ul>
    <p>
      To exercise your rights, contact us at: <a href="mailto:info@t-bode.lv">info@t-bode.lv</a>.
      If you believe your rights have been violated, you may file a complaint with
      the Data State Inspectorate (<a href="https://www.dvi.gov.lv" target="_blank" rel="noopener noreferrer">www.dvi.gov.lv</a>).
    </p>

    <h2>8. Security</h2>
    <p>
      We implement appropriate technical and organizational measures to protect your personal data
      against unauthorized access, loss, or destruction, including encrypted data transmission (SSL/TLS).
    </p>

    <h2>9. Changes to This Policy</h2>
    <p>
      We reserve the right to update this privacy policy. We will inform you of material changes
      on this website or via email. We encourage you to review this page periodically.
    </p>
  </>
);

export default PrivacyPolicy;
