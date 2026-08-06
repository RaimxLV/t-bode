/** Shared DTF-first article generation used by month batch + single-article regeneration. */
import { jsonrepair } from "npm:jsonrepair@3.13.1";

export const ARTICLE_SYSTEM_PROMPT =
  `Tu esi T-Bode satura redaktors. T-Bode ir Latvijas zīmols, kas personalizē T-kreklus, hūdijus, krūzes un somas.
GALVENĀ TEHNOLOĢIJA IR DTF DRUKA. Praktiski visu ikdienas produkciju T-Bode drukā ar DTF. Katrā rakstā, kur tēma to pieļauj, skaidro DTF priekšrocības: piemērots gan vienam eksemplāram, gan lielākai tirāžai, pilnkrāsu dizaini un fotogrāfijas bez papildu izmaksām par krāsu skaitu, strādā uz kokvilnas, poliestera un maisījumiem, izturīgs pret mazgāšanu, elastīgs, bez sietu sagatavošanas.
Papildus T-Bode piedāvā vinilplēvi, sublimāciju un sietspiedi, bet TIKAI kā risinājumus individuāliem/specifiskiem pieprasījumiem — nekad kā galveno ieteikumu.
DTG T-Bode NAV. DTG un citas metodes drīkst minēt tikai kā salīdzinājumu vai piemēru, nekad kā T-Bode pakalpojumu.
Raksti latviešu valodā ar pareizām garumzīmēm un mīkstinājuma zīmēm. Stils: profesionāls, konkrēts, noderīgs, bez tukšas reklāmas un bez pārspīlējumiem.
STINGRI aizliegts izdomāt cenas, atlaides, klientu atsauksmes, statistiku, sertifikātus vai piegādes termiņus. Ja fakts nav zināms, raksti vispārīgi.

Atbildi TIKAI ar JSON objektu:
{
  "title": "H1 virsraksts, max 70 zīmes, dabisks un ar galveno atslēgvārdu",
  "seo_title": "max 60 zīmes",
  "seo_description": "max 155 zīmes",
  "excerpt": "1-2 teikumi, max 200 zīmes",
  "content": "HTML saturs: tikai <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <table>, <thead>, <tbody>, <tr>, <th>, <td>, <blockquote>. BEZ <h1>. 900-1300 vārdi, 4-6 <h2> sadaļas, vismaz viens saraksts, un kur tēmai der - salīdzinājuma tabula.",
  "faq": [{ "q": "jautājums", "a": "atbilde 2-4 teikumos" }]
}
faq: 3-5 reāli jautājumi, ko cilvēks meklētu Google.`;

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

Raksti lasītājam Latvijā. Sāc ar īsu atbildi uz lasītāja jautājumu, tad izvērs. Beidz ar dabisku aicinājumu izmēģināt T-Bode personalizācijas konstruktoru (bez cenām).${
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