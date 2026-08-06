/** Shared DTF-first article generation used by month batch + single-article regeneration. */
import { jsonrepair } from "npm:jsonrepair@3.13.1";

export const ARTICLE_SYSTEM_PROMPT =
  `Tu esi T-Bode redakcijas rakstnieks. T-Bode ir Latvijas zīmols, kas personalizē T-kreklus, hūdijus, krūzes un somas.
Sadaļas fokuss: PRAKTISKI CEĻVEŽI UN IDEJAS cilvēkiem, kas grib pasūtīt personalizētu apģērbu — komandām, klasēm, pasākumiem, ģimenei, maziem zīmoliem. Nevis raksti par tehnoloģiju.

RAKSTĪŠANAS STILS (obligāts):
- Raksti kā laba žurnāla redaktors: konkrēti, dzīvi, ar reāliem piemēriem un skaitļiem no situācijas (izmēru sadalījums, termiņi, plānošanas soļi).
- Sāc ar konkrētu situāciju vai lēmumu, ko lasītājs risina. NEKAD nesāc ar definīciju, ar "Vai zināji, ka...", ar "Mūsdienās..." vai ar tehnoloģijas skaidrojumu.
- Īsi teikumi, aktīvā forma. Bez tukšiem vispārinājumiem, bez pašaprotamiem apgalvojumiem, bez pompoziem ievadiem.
- Bez reklāmas toņa. Nekādu "izvēlies mūs", "labākā kvalitāte", "par pieejamu cenu".

STINGRI AIZLIEGTS:
- Salīdzinājumu tabulas un salīdzinājumi starp drukas metodēm (DTF pret DTG pret sietspiedi). Šādu saturu neveido nekad.
- Tehnoloģiju izklāsti kā raksta galvenā tēma vai atsevišķa "Kas ir DTF" sadaļa.
- Izdomātas cenas, atlaides, atsauksmes, statistika, sertifikāti, piegādes termiņi.

PAR TEHNOLOĢIJU: T-Bode drukā ar DTF. DTF drīkst pieminēt tikai īsi un dabiski, kad tas patiešām atbild uz praktisku jautājumu (piem. vai var pasūtīt vienu gabalu, vai der pilnkrāsu foto, kā mazgāt). Maksimums 1-2 pieminējumi rakstā, vienmēr lasītāja labuma kontekstā, nekad ar priekšrocību uzskaitījumu. DTG T-Bode NAV un to nevajag pieminēt.

Raksti latviešu valodā ar pareizām garumzīmēm un mīkstinājuma zīmēm.

Atbildi TIKAI ar JSON objektu:
{
  "title": "Virsraksts, max 70 zīmes, dabisks, bez klikšķu ēsmas",
  "seo_title": "max 60 zīmes",
  "seo_description": "max 155 zīmes",
  "excerpt": "1-2 teikumi, max 200 zīmes, konkrēts solījums lasītājam",
  "content": "HTML saturs: tikai <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <blockquote>. BEZ <h1> un BEZ <table>. 700-1100 vārdi, 3-5 <h2> sadaļas, vismaz viens praktisks saraksts vai soļu secība.",
  "faq": [{ "q": "jautājums", "a": "atbilde 2-4 teikumos" }]
}
faq: 3-4 praktiski jautājumi, ko cilvēks tiešām uzdotu pirms pasūtīšanas.`;

export async function generateArticle(
  apiKey: string,
  topic: {
    title_lv: string;
    primary_keyword?: string | null;
    secondary_keywords?: string[] | null;
    angle_hint?: string | null;
  },
  categoryName: string,
  extraInstruction?: string,
) {
  const userPrompt = `Tēma: ${topic.title_lv}
Kategorija: ${categoryName}
Galvenais atslēgvārds: ${topic.primary_keyword ?? topic.title_lv}
Papildu atslēgvārdi: ${(topic.secondary_keywords ?? []).join(", ")}
Leņķis: ${topic.angle_hint ?? "praktisks ceļvedis Latvijas lasītājam"}

Raksti lasītājam Latvijā. Sāc ar konkrētu situāciju, ne ar definīciju. Dod praktiskus soļus un izvēles, ko lasītājs var izmantot uzreiz. Beidz ar noderīgu domu vai kontrolsarakstu — bez pārdošanas aicinājuma un bez cenām (saite uz konstruktoru tiek pielikta automātiski zem raksta).${
    extraInstruction ? `\n\nPapildu norādes: ${extraInstruction}` : ""
  }`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: ARTICLE_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (res.status === 429) throw new Error("AI pieprasījumu limits (429). Mēģini pēc brīža.");
  if (res.status === 402) throw new Error("AI kredīti ir beigušies (402).");
  if (!res.ok) throw new Error(`AI kļūda ${res.status}: ${(await res.text()).slice(0, 200)}`);

  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content ?? "{}";
  let parsed: any = raw;
  if (typeof raw === "string") {
    const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/\s*```$/, "");
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = JSON.parse(jsonrepair(cleaned));
    }
  }
  if (!parsed?.title || !parsed?.content) throw new Error("AI atgrieza nepilnīgu rakstu");
  return parsed;
}

/** Months (1-12) a topic is relevant for; empty array = evergreen. */
export function isTopicInSeason(seasonMonths: unknown, month: number): boolean {
  if (!Array.isArray(seasonMonths) || seasonMonths.length === 0) return true;
  return seasonMonths.map(Number).includes(month);
}