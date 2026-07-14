import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Image as ImageIcon, Check } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Seo } from "@/components/Seo";

const steps = [
  {
    title: "Dizaina sagatavošana un druka uz plēves",
    body:
      "Tavs dizains ar speciālu printeri spoguļattēlā tiek uzdrukāts uz caurspīdīgas PET plēves. Vispirms printeris uzklāj krāsaino slāni (CMYK krāsas), bet uzreiz pēc tam – blīvu, baltu krāsas pamatni. Baltā krāsa ir kritiski svarīga, lai dizains izskatītos spilgts un nepārspējami košs arī uz tumšiem vai melniem audumiem.",
  },
  {
    title: "Līmes pulvera uzklāšana",
    body:
      "Kamēr tinte uz plēves vēl ir mitra, tai pāri tiek uzbērts īpašs termo-līmes pulveris. Šis pulveris pielīp tikai pie apdrukātajām vietām (tintes), bet neapskartās plēves vietas paliek pilnīgi tīras.",
  },
  {
    title: "Līmes fiksācija (kausēšana)",
    body:
      "Plēve nonāk specializētā žāvēšanas krāsnī. Karstumā termo-pulveris izkūst, pārvēršoties par plānu, viendabīgu un elastīgu līmes slāni, kas cieši sasaistās ar uzdrukāto krāsu.",
  },
  {
    title: "Termodruka (Karstā pārnese uz auduma)",
    body:
      "Sagatavotā plēve tiek precīzi novietota uz apģērba (piemēram, T-krekla vai džempera) un ievietota profesionālā termopresē. Augstā temperatūrā (parasti ap 150°C–160°C) un zem spēcīga spiediena izkususī līme burtiski „ieaug\" auduma šķiedrās.",
  },
  {
    title: "Plēves noņemšana un gala fiksācija",
    body:
      "Karstumā piespiestais materiāls tiek atdzesēts, un PET plēve tiek uzmanīgi noņemta. Uz apģērba paliek tikai un vienīgi pats dizains – bez jebkādām fona plēves malām. Pašā noslēgumā mēs veicam īsu „gala presēšanu\" (fiksāciju), kas nodrošina, ka dizains ir patīkami mīksts un maksimāli noturīgs pret mazgāšanu.",
  },
];

const comparisonRows: { feature: string; dtf: string; dtg: string; screen: string }[] = [
  {
    feature: "Piemērotie audumi",
    dtf: "Jebkurš materiāls (kokvilna, poliesters, neilons, softshell u.c.)",
    dtg: "Pamatā tikai 100% kokvilna",
    screen: "Kokvilna un tās maisījumi",
  },
  {
    feature: "Sagatavošanās izmaksas",
    dtf: "Nav (nav dārgu sagatavošanās darbu)",
    dtg: "Nav (digitāla druka)",
    screen: "Augstas (jāizgatavo fiziski sieti katrai krāsai)",
  },
  {
    feature: "Sīkas detaļas un pārejas",
    dtf: "Izcili precīzi (pat smalkas fotogrāfijas)",
    dtg: "Labi, bet mēdz būt blāvas uz tumša auduma",
    screen: "Sarežģītas un dārgas daudzkrāsu pārejas",
  },
  {
    feature: "Minimālais pasūtījums",
    dtf: "Sākot no 1 gabala",
    dtg: "Sākot no 1 gabala",
    screen: "Tikai lielas tirāžas (no 20-50+ gab.)",
  },
  {
    feature: "Izturība (mazgāšanā)",
    dtf: "Izcila (elastīgs dizains, kas neplaisā)",
    dtg: "Vidēja (ar laiku krāsa izbalē un nodilst)",
    screen: "Izcila (biezs krāsas slānis)",
  },
];

const benefits = [
  {
    title: "Universālums",
    body:
      "Nav svarīgi, vai tas ir plāns vasaras T-krekls, biezs kokvilnas džemperis, sporta jaka no poliestera vai darba apģērbs – DTF perfekti turas uz jebkura auduma.",
  },
  {
    title: "Neticams elastīgums",
    body:
      "Apdruka stiepjas un kustas līdz ar audumu. Tā neplaisā un nesadrupinās pat pie intensīvas lietošanas.",
  },
  {
    title: "Ilgmūžība",
    body:
      "Šī metode garantē, ka dizains saglabās savu sākotnējo košumu un struktūru arī pēc 50+ mazgāšanas reizēm.",
  },
];

const KasIrDtf = () => {
  const canonical = "https://t-bode.lv/kas-ir-dtf";
  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Kas ir DTF druka? | T-Bode apdruka Rīgā"
        description="Uzzini, kas ir DTF (Direct-to-Film) druka un kā tā top solis pa solim. DTF, DTG un sietspiedes salīdzinājums un galvenās priekšrocības no T-Bode."
        canonical={canonical}
        type="article"
        breadcrumbs={[
          { name: "Sākums", url: "https://t-bode.lv/" },
          { name: "Kas ir DTF druka?", url: canonical },
        ]}
      />
      <Navbar />

      <main>
        {/* HERO */}
        <section className="relative overflow-hidden border-b border-border">
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, hsl(0 0% 5%) 0%, hsl(220 25% 8%) 60%, hsl(0 0% 4%) 100%)",
            }}
          />
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(900px 500px at 85% 10%, hsl(0 72% 45% / 0.35), transparent 60%), radial-gradient(700px 400px at 10% 90%, hsl(20 90% 50% / 0.18), transparent 65%)",
            }}
          />
          <div className="relative z-10 container mx-auto px-4 pt-28 pb-16 md:pt-36 md:pb-24 max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-white/90 mb-6">
              Tehnoloģija
            </div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl uppercase leading-[1.02] tracking-tight text-white"
            >
              Kas ir DTF druka un kā top Tava apdruka?
            </motion.h1>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="mt-8 space-y-4 text-base md:text-lg text-white/85 leading-relaxed max-w-2xl"
            >
              <p>
                Mūsdienu apģērbu apdrukā DTF (Direct-to-Film) ir tehnoloģija, kas
                pilnībā mainījusi kvalitātes standartus. Tā ir digitālā druka uz
                speciālas plēves, kas pēc tam ar karstuma un spiediena palīdzību
                tiek pārnesta tieši uz auduma šķiedrām.
              </p>
              <p>
                Šī metode nodrošina košas krāsas, neticamu detaļu precizitāti un
                izturību, kas pārsniedz tradicionālos risinājumus.
              </p>
            </motion.div>
          </div>
        </section>

        {/* STEPS */}
        <section className="container mx-auto px-4 py-16 md:py-24 max-w-5xl">
          <div className="max-w-2xl mb-12">
            <div className="text-primary text-xs font-semibold uppercase tracking-[0.2em] mb-2">
              Ražošanas process
            </div>
            <h2 className="font-display text-3xl md:text-5xl uppercase leading-tight">
              Soli pa solim: Kā top DTF apdruka?
            </h2>
            <p className="text-muted-foreground mt-4 leading-relaxed">
              Mūsu ražošanas process sastāv no 5 precīziem soļiem, lai nodrošinātu
              maksimālu kvalitāti.
            </p>
          </div>

          <ol className="space-y-6">
            {steps.map((s, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="group grid md:grid-cols-[220px_1fr] gap-5 md:gap-8 items-stretch rounded-2xl border border-border bg-card p-4 md:p-6 hover:border-primary/40 transition-colors"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                {/* Image placeholder */}
                <div className="relative aspect-video md:aspect-auto md:h-full rounded-xl border border-dashed border-border bg-muted/40 flex items-center justify-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2 text-xs uppercase tracking-wider">
                    <ImageIcon className="w-6 h-6 opacity-50" />
                    <span>Foto {i + 1}</span>
                  </div>
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-display text-primary text-3xl md:text-4xl tabular-nums leading-none">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3 className="font-display uppercase text-xl md:text-2xl leading-tight">
                      {s.title}
                    </h3>
                  </div>
                  <p className="text-foreground/85 leading-relaxed text-sm md:text-base">
                    {s.body}
                  </p>
                </div>
              </motion.li>
            ))}
          </ol>
        </section>

        {/* COMPARISON TABLE */}
        <section className="bg-muted/30 border-y border-border">
          <div className="container mx-auto px-4 py-16 md:py-24 max-w-6xl">
            <div className="max-w-2xl mb-10">
              <div className="text-primary text-xs font-semibold uppercase tracking-[0.2em] mb-2">
                Salīdzinājums
              </div>
              <h2 className="font-display text-3xl md:text-5xl uppercase leading-tight">
                DTF pret DTG un Sietspiedi
              </h2>
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-primary text-primary-foreground">
                    <th className="text-left font-display uppercase text-xs tracking-wider px-5 py-4">
                      Funkcija / Īpašība
                    </th>
                    <th className="text-left font-display uppercase text-xs tracking-wider px-5 py-4">
                      DTF <span className="text-white/70">(T-Bode izvēle)</span>
                    </th>
                    <th className="text-left font-display uppercase text-xs tracking-wider px-5 py-4">
                      DTG (Direct-to-Garment)
                    </th>
                    <th className="text-left font-display uppercase text-xs tracking-wider px-5 py-4">
                      Sietspiede
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row, i) => (
                    <tr
                      key={i}
                      className={i % 2 === 0 ? "bg-transparent" : "bg-muted/40"}
                    >
                      <td className="align-top px-5 py-4 font-semibold">{row.feature}</td>
                      <td className="align-top px-5 py-4 text-foreground/90 border-l-2 border-primary/60 bg-primary/5">
                        {row.dtf}
                      </td>
                      <td className="align-top px-5 py-4 text-foreground/80">{row.dtg}</td>
                      <td className="align-top px-5 py-4 text-foreground/80">{row.screen}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile stacked cards */}
            <div className="md:hidden space-y-4">
              {comparisonRows.map((row, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <div className="font-display uppercase text-sm text-primary mb-3 tracking-wider">
                    {row.feature}
                  </div>
                  <dl className="space-y-2 text-sm">
                    <div className="rounded-md bg-primary/5 border border-primary/30 p-3">
                      <dt className="text-xs uppercase tracking-wider font-semibold text-primary mb-1">
                        DTF (T-Bode)
                      </dt>
                      <dd className="text-foreground/90">{row.dtf}</dd>
                    </div>
                    <div className="p-3">
                      <dt className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1">
                        DTG
                      </dt>
                      <dd className="text-foreground/80">{row.dtg}</dd>
                    </div>
                    <div className="p-3 border-t border-border">
                      <dt className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1">
                        Sietspiede
                      </dt>
                      <dd className="text-foreground/80">{row.screen}</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* BENEFITS */}
        <section className="container mx-auto px-4 py-16 md:py-24 max-w-5xl">
          <div className="max-w-2xl mb-10">
            <div className="text-primary text-xs font-semibold uppercase tracking-[0.2em] mb-2">
              Priekšrocības
            </div>
            <h2 className="font-display text-3xl md:text-5xl uppercase leading-tight">
              Kāpēc DTF ir labākā izvēle Tavai apdrukai?
            </h2>
          </div>

          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {benefits.map((b, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="rounded-xl border border-border bg-card p-6 hover:border-primary/40 transition-colors"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <div
                  className="inline-flex items-center justify-center w-10 h-10 rounded-lg mb-4"
                  style={{ background: "var(--gradient-brand)" }}
                >
                  <Check className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-display uppercase text-lg mb-2">{b.title}</h3>
                <p className="text-sm text-foreground/85 leading-relaxed">{b.body}</p>
              </motion.li>
            ))}
          </ul>
        </section>

        {/* CTA */}
        <section className="relative overflow-hidden">
          <div aria-hidden className="absolute inset-0" style={{ background: "var(--gradient-brand)" }} />
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(800px 400px at 20% 110%, hsl(0 0% 0% / 0.5), transparent 60%), linear-gradient(180deg, transparent, hsl(0 0% 0% / 0.4))",
            }}
          />
          <div className="relative container mx-auto px-4 py-20 md:py-24 max-w-3xl text-center text-white">
            <h2 className="font-display text-3xl md:text-5xl uppercase mb-4 leading-tight">
              Gatavs izmēģināt DTF apdruku?
            </h2>
            <p className="text-white/85 mb-8 text-base md:text-lg max-w-xl mx-auto">
              Augšupielādē savu dizainu, izvēlies apģērbu un saņem gatavu apdruku
              2–5 darba dienās.
            </p>
            <Link
              to="/design"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white text-foreground px-8 py-4 font-body font-bold uppercase tracking-wide hover:bg-white/90 transition-colors"
            >
              Sāc dizainēt
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default KasIrDtf;