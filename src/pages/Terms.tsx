import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const Terms = () => {
  const { i18n } = useTranslation();
  const isLv = i18n.language === "lv";

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="text-4xl md:text-5xl mb-8">
            {isLv ? "Lietošanas noteikumi" : "Terms & Conditions"}
          </h1>
          <div className="prose prose-invert max-w-none font-body text-muted-foreground space-y-6 [&_h2]:text-foreground [&_h2]:font-display [&_h2]:text-2xl [&_h2]:mt-10 [&_h2]:mb-4 [&_strong]:text-foreground [&_a]:text-primary [&_a]:underline [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1">
            {isLv ? <TermsContentLV /> : <TermsContentEN />}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

const TermsContentLV = () => (
  <>
    <p><strong>Spēkā no:</strong> 2026. gada 16. aprīlis</p>
    <p>
      Šie lietošanas noteikumi nosaka interneta veikala <strong>T-Bode</strong> lietošanas kārtību un
      preču iegādes nosacījumus. Vietni pārvalda SIA "Ervitex", reģ. nr. 40203512897,
      adrese: Braslas iela 29-2, Rīga, LV-1084.
    </p>

    <h2>1. Vispārīgie noteikumi</h2>
    <p>
      Izmantojot šo vietni un veicot pasūtījumu, jūs apliecināt, ka esat iepazinies ar šiem
      noteikumiem un piekrītat tiem. Ja nepiekrītat noteikumiem, lūdzu, neizmantojiet šo vietni.
    </p>

    <h2>2. Preces un personalizācija</h2>
    <ul>
      <li>Veikalā pieejamas apdrukātas un personalizējamas preces.</li>
      <li>Produktu attēliem ir informatīvs raksturs, un faktiskā prece var nedaudz atšķirties.</li>
      <li>Personalizētu preču izskats tiek izgatavots pēc klienta apstiprinātā dizaina.</li>
    </ul>

    <h2>3. Cenas un apmaksa</h2>
    <ul>
      <li>Visas cenas norādītas euro valūtā un ietver PVN, ja tas piemērojams.</li>
      <li>Apmaksa notiek ar vietnē pieejamajām maksājumu metodēm pasūtījuma noformēšanas laikā.</li>
      <li>Pārdevējs patur tiesības mainīt cenas jebkurā laikā, bet pasūtījumam tiek piemērota cena, kas bija spēkā pirkuma brīdī.</li>
    </ul>

    <h2>4. Pasūtījuma noformēšana un izpilde</h2>
    <ul>
      <li>Pasūtījums tiek uzskatīts par pieņemtu pēc veiksmīgas apmaksas apstiprinājuma.</li>
      <li>Klients ir atbildīgs par pareizu piegādes un kontaktinformācijas norādīšanu.</li>
      <li>Mēs varam sazināties ar klientu, ja nepieciešams precizēt dizainu, piegādi vai citus pasūtījuma datus.</li>
    </ul>

    <h2>5. Piegāde</h2>
    <p>
      Piegādes termiņi ir atkarīgi no izvēlētā piegādes veida, preces pieejamības un personalizācijas apjoma.
      Aptuvenie termiņi tiek norādīti pasūtījuma veikšanas brīdī vai saziņā ar klientu.
    </p>

    <h2>6. Atteikuma tiesības un atgriešana</h2>
    <ul>
      <li>Standarta precēm patērētājam var būt atteikuma tiesības saskaņā ar Latvijas un ES patērētāju tiesību aktiem.</li>
      <li>Personalizētām vai pēc individuāla pasūtījuma izgatavotām precēm atteikuma tiesības var netikt piemērotas, ciktāl to pieļauj normatīvie akti.</li>
      <li>Ja prece ir bojāta vai neatbilst pasūtījumam, lūdzu, sazinieties ar mums iespējami drīz pēc saņemšanas.</li>
    </ul>

    <h2>7. Intelektuālais īpašums</h2>
    <p>
      Vietnes dizains, saturs, logo, attēli un citi materiāli ir aizsargāti ar intelektuālā īpašuma tiesībām.
      To izmantošana bez rakstiskas atļaujas nav pieļaujama.
    </p>

    <h2>8. Atbildības ierobežojums</h2>
    <p>
      Pārdevējs neatbild par zaudējumiem, kas radušies nepareizas vietnes lietošanas, neprecīzi ievadītu datu,
      trešo personu darbību vai nepārvaramas varas apstākļu dēļ, ciktāl to pieļauj normatīvie akti.
    </p>

    <h2>9. Privātums</h2>
    <p>
      Personas datu apstrāde notiek saskaņā ar mūsu <Link to="/privacy">Privātuma politiku</Link>.
    </p>

    <h2>10. Kontaktinformācija</h2>
    <p>
      Jautājumu gadījumā sazinieties ar mums: <a href="mailto:info@t-bode.lv">info@t-bode.lv</a>,
      tālr. +371 29 475 227.
    </p>
  </>
);

const TermsContentEN = () => (
  <>
    <p><strong>Effective from:</strong> April 16, 2026</p>
    <p>
      These Terms & Conditions govern the use of the <strong>T-Bode</strong> online store and the
      purchase of products offered on this website. The website is operated by SIA "Ervitex",
      reg. no. 40203512897, address: Braslas iela 29-2, Riga, LV-1084.
    </p>

    <h2>1. General</h2>
    <p>
      By using this website and placing an order, you confirm that you have read and agree to these
      terms. If you do not agree, please do not use this website.
    </p>

    <h2>2. Products and Personalization</h2>
    <ul>
      <li>The store offers printed and customizable products.</li>
      <li>Product images are for illustrative purposes only, and the actual product may differ slightly.</li>
      <li>The final appearance of personalized products is produced according to the design approved by the customer.</li>
    </ul>

    <h2>3. Pricing and Payment</h2>
    <ul>
      <li>All prices are shown in euro and include VAT where applicable.</li>
      <li>Payment is made using the payment methods available on the website during checkout.</li>
      <li>The seller reserves the right to change prices at any time, but the price valid at the time of purchase applies to the order.</li>
    </ul>

    <h2>4. Orders and Fulfilment</h2>
    <ul>
      <li>An order is considered accepted after successful payment confirmation.</li>
      <li>The customer is responsible for providing accurate delivery and contact information.</li>
      <li>We may contact the customer if clarification is needed regarding design, delivery, or other order details.</li>
    </ul>

    <h2>5. Delivery</h2>
    <p>
      Delivery times depend on the chosen shipping method, product availability, and the scope of personalization.
      Estimated timelines are shown during checkout or communicated directly to the customer.
    </p>

    <h2>6. Right of Withdrawal and Returns</h2>
    <ul>
      <li>Consumers may have withdrawal rights for standard products under Latvian and EU consumer protection law.</li>
      <li>Withdrawal rights may not apply to personalized or made-to-order products to the extent permitted by applicable law.</li>
      <li>If a product is damaged or does not match the order, please contact us as soon as possible after delivery.</li>
    </ul>

    <h2>7. Intellectual Property</h2>
    <p>
      The website design, content, logo, images, and other materials are protected by intellectual property rights.
      They may not be used without prior written permission.
    </p>

    <h2>8. Limitation of Liability</h2>
    <p>
      The seller is not liable for losses caused by improper use of the website, incorrectly entered information,
      third-party actions, or force majeure circumstances, to the extent permitted by law.
    </p>

    <h2>9. Privacy</h2>
    <p>
      Personal data is processed in accordance with our <Link to="/privacy">Privacy Policy</Link>.
    </p>

    <h2>10. Contact</h2>
    <p>
      If you have any questions, contact us at <a href="mailto:info@t-bode.lv">info@t-bode.lv</a>
      or call +371 29 475 227.
    </p>
  </>
);

export default Terms;
