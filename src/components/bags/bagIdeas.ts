import { bagAuthoredIdeas } from "./bagAuthoredIdeas";

export const bagIdeaCategories = ["Visi", "Ziemassvētki", "Kaķi", "Kafija", "Ikdiena", "Pastaigas"] as const;
export type BagIdeaCategory = typeof bagIdeaCategories[number];
export type BagIdea = { id: number; category: Exclude<BagIdeaCategory, "Visi">; slogan: string; lines: string[]; palette: string; layout: string; motif: string };
export const originalBagIdeas: BagIdea[] = [
  { id: 1, category: "Kaķi", slogan: "Šajā maisā kaķa nav. Pagaidām.", lines: ["ŠAJĀ MAISĀ", "KAĶA NAV.", "Pagaidām."], palette: "paper", layout: "peek", motif: "eyes" },
  { id: 2, category: "Kaķi", slogan: "Kaķis apstiprināja.", lines: ["KAĶIS", "APSTIPRINĀJA."], palette: "paper-blue", layout: "stamp", motif: "paw" },
  { id: 3, category: "Kaķi", slogan: "Mans priekšnieks saka: ņau.", lines: ["MANS PRIEKŠNIEKS", "SAKA:", "ŅAU."], palette: "coral", layout: "giant", motif: "whiskers" },
  { id: 4, category: "Kaķi", slogan: "Pērku ēdienu. Kaķim, protams.", lines: ["PĒRKU", "ĒDIENU.", "Kaķim,", "protams."], palette: "paper", layout: "receipt", motif: "receipt" },
  { id: 5, category: "Kaķi", slogan: "Kaķu spalvas nāk komplektā.", lines: ["KAĶU", "SPALVAS", "nāk komplektā."], palette: "lilac", layout: "scatter", motif: "whiskers" },
  { id: 6, category: "Kafija", slogan: "Vispirms kafija. Tad viedoklis.", lines: ["VISPIRMS", "KAFIJA.", "TAD", "VIEDOKLIS."], palette: "blue", layout: "blocks", motif: "none" },
  { id: 7, category: "Kafija", slogan: "Nesu kafiju un lielus plānus.", lines: ["NESU KAFIJU", "UN LIELUS", "PLĀNUS."], palette: "lime", layout: "cup", motif: "cup" },
  { id: 8, category: "Kafija", slogan: "Bez kafijas — tikai melnraksts.", lines: ["BEZ KAFIJAS —", "TIKAI", "MELNRAKSTS."], palette: "paper-coral", layout: "outline", motif: "none" },
  { id: 9, category: "Kafija", slogan: "Mana baterija ir kafijas krūze.", lines: ["MANA BATERIJA", "IR KAFIJAS", "KRŪZE."], palette: "blue-lime", layout: "battery", motif: "battery" },
  { id: 10, category: "Kafija", slogan: "Kafiju paņēmu. Pacietību aizmirsu.", lines: ["KAFIJU", "PAŅĒMU.", "PACIETĪBU", "AIZMIRSU."], palette: "paper", layout: "checklist", motif: "checks" },
  { id: 11, category: "Ikdiena", slogan: "Gāju tikai pēc maizes.", lines: ["GĀJU", "TIKAI", "PĒC MAIZES."], palette: "lime", layout: "giant", motif: "bread" },
  { id: 12, category: "Ikdiena", slogan: "Te bija iepirkumu saraksts.", lines: ["TE BIJA", "IEPIRKUMU", "SARAKSTS."], palette: "ink-lime", layout: "ruled", motif: "rules" },
  { id: 13, category: "Ikdiena", slogan: "Plāns bija neko nepirkt.", lines: ["PLĀNS BIJA", "NEKO", "NEPIRKT."], palette: "coral", layout: "retro", motif: "none" },
  { id: 14, category: "Ikdiena", slogan: "Maisiņš pilns. Budžets tukšs.", lines: ["MAISIŅŠ", "PILNS.", "BUDŽETS", "TUKŠS."], palette: "paper", layout: "contrast", motif: "none" },
  { id: 15, category: "Ikdiena", slogan: "Nesu savu. Arī viedokli.", lines: ["NESU", "SAVU.", "ARĪ", "VIEDOKLI."], palette: "ink", layout: "manifesto", motif: "none" },
  { id: 16, category: "Ikdiena", slogan: "Vieta vēl vienai labai idejai.", lines: ["VIETA VĒL", "VIENAI", "LABAI IDEJAI."], palette: "paper-blue", layout: "frame", motif: "star" },
  { id: 17, category: "Pastaigas", slogan: "Aizgāju izvēdināt domas.", lines: ["AIZGĀJU", "IZVĒDINĀT", "DOMAS."], palette: "sage", layout: "path", motif: "path" },
  { id: 18, category: "Pastaigas", slogan: "Pa ceļam savācu piedzīvojumus.", lines: ["PA CEĻAM", "SAVĀCU", "PIEDZĪVOJUMUS."], palette: "paper-blue", layout: "route", motif: "route" },
  { id: 19, category: "Pastaigas", slogan: "Soli pa solim. Ar uzkodām.", lines: ["SOLI PA", "SOLIM.", "Ar uzkodām."], palette: "lime", layout: "walk", motif: "footsteps" },
  { id: 20, category: "Pastaigas", slogan: "Šodienas plāns: mazliet nomaldīties.", lines: ["ŠODIENAS PLĀNS:", "MAZLIET", "NOMALDĪTIES."], palette: "blue", layout: "compass", motif: "compass" },
];
/** Wrap text only; paintings stay absent until the author's asset commit. */
function sloganLines(slogan: string): string[] {
  const lines: string[] = [];
  for (const word of slogan.split(" ")) {
    const last = lines.length - 1;
    if (last >= 0 && `${lines[last]} ${word}`.length <= 19) lines[last] += ` ${word}`;
    else lines.push(word);
  }
  return lines;
}
export const bagIdeas: BagIdea[] = [...originalBagIdeas, ...bagAuthoredIdeas.map((row) => ({
  ...row, lines: sloganLines(row.slogan), palette: "paper-blue", layout: "authored-text", motif: "none",
}))];
export const curatedBagIdeaIds = [1, 21, 6, 31, 11, 41, 17, 51] as const;
export function matchingBagIdeas(category: BagIdeaCategory) {
  const matching = bagIdeas.filter((idea) => category === "Visi" || idea.category === category);
  if (category !== "Visi") return matching;
  return [...curatedBagIdeaIds.flatMap((id) => matching.filter((idea) => idea.id === id)),
    ...matching.filter((idea) => !curatedBagIdeaIds.some((id) => id === idea.id))];
}
export function visibleBagIdeas(category: BagIdeaCategory, limit: number = 8) {
  return matchingBagIdeas(category).slice(0, limit);
}
export async function copyBagIdea(slogan: string, clipboard: Pick<Clipboard, "writeText"> | undefined = navigator.clipboard): Promise<"success" | "error"> {
  if (!clipboard) return "error";
  try { await clipboard.writeText(slogan); return "success"; } catch { return "error"; }
}