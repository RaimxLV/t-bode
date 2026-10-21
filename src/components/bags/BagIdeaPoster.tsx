import { useId } from "react";
import type { BagIdea } from "./bagIdeas";

function Motif({ name }: { name: string }) {
  switch (name) {
    case "eyes": return <g><path d="M28 274Q55 242 82 274Q55 294 28 274M158 274Q185 242 212 274Q185 294 158 274" /><path d="M55 262v22m130-22v22M18 300l35-8m-32 25 35-12m166-5-35-8m32 25-35-12" /></g>;
    case "paw": return <g transform="translate(100 211)"><path d="M3 20c-9 17 0 22 17 16 17 6 26 1 17-16L20 9Z" /><ellipse cx="3" cy="2" rx="5" ry="7" /><ellipse cx="15" cy="-7" rx="5" ry="7" /><ellipse cx="28" cy="-7" rx="5" ry="7" /><ellipse cx="39" cy="2" rx="5" ry="7" /></g>;
    case "whiskers": return <g><path d="m18 48 30 12m-21 7 20 3m143 17 32-12m-34 28 28-5M18 250l32-9m-22 29 29-15m135 8 25 15m-35-2 25 21" /></g>;
    case "receipt": return <g><path d="M22 25h196v264l-14-7-14 7-14-7-14 7-14-7-14 7-14-7-14 7-14-7-14 7-14-7-14 7-14-7-14 7Z" /><path strokeDasharray="3 5" d="M40 62h160m-160 170h160" /><path d="M51 255v15m8-15v15m5-15v15m9-15v15m4-15v15m10-15v15m4-15v15m8-15v15m5-15v15m9-15v15m7-15v15m4-15v15m10-15v15m9-15v15m4-15v15m10-15v15m6-15v15" /></g>;
    case "cup": return <g><path d="M83 228h67l-6 43H89ZM151 237h12c18 0 18 23-15 22m-67 20h77M98 211c-15-12 18-17 5-31m18 31c-12-12 14-18 4-31m20 31c-9-10 11-16 9-27" /></g>;
    case "battery": return <g><path d="M58 228h114v49H58Zm114 12h12v25h-12M83 214h60" /><path className="bag-poster-accent-fill" d="M67 237h22v31H67Zm30 0h22v31H97Zm30 0h22v31h-22Z" /></g>;
    case "checks": return <g><path d="m26 105 7 7 15-21m-22 97h19v19H26m5-14 9 9m0-9-9 9M22 241h196" /></g>;
    case "bread": return <g transform="translate(88 238)"><path d="M0 11c0-24 64-24 64 0v27H0Z" /><path d="m15 0 7 13m12-17 7 17m10-13 6 13" /></g>;
    case "rules": return <g><path d="M25 215h190M25 239h190M25 263h190M25 287h190m-175-5 155-60" /></g>;
    case "star": return <g><path d="M24 104V25h128m64 182v88H24V192M185 24l4 13 15 4-15 5-4 13-4-13-15-5 15-4Z" /></g>;
    case "path": return <g><path d="M30 293c155-5 222-45 134-53s-159-15-72-45" /><circle cx="30" cy="293" r="5" /></g>;
    case "route": return <g><path strokeDasharray="5 6" d="M37 263c28-91 60 60 105-10s69 2 56 34" /><circle cx="37" cy="263" r="9" /><circle cx="141" cy="254" r="9" /><path d="m190 287 8-15 8 15Z" /></g>;
    case "footsteps": return <g><ellipse transform="rotate(25 83 245)" cx="83" cy="245" rx="9" ry="16" /><ellipse transform="rotate(25 112 227)" cx="112" cy="227" rx="9" ry="16" /><path className="bag-poster-accent-fill" d="m156 240 27-8 10 33-27 8Zm9 10 16-5m-14 14 16-5" /></g>;
    case "compass": return <g transform="translate(177 253)"><circle r="31" /><path d="M0-39v9M0 39v-9M-39 0h9m69 0h-9M-10 15 3-20 12-11Z" /></g>;
    default: return null;
  }
}

/** Twenty native print compositions; readable slogan is also the control's accessible name. */
export function BagIdeaPoster({ idea }: { idea: BagIdea }) {
  const id = `poster-${useId().replace(/:/g, "")}`;
  const { layout, lines } = idea;
  let sizes = lines.map(() => 32);
  let positions = lines.map((_, index) => 94 + index * 44);
  if (layout === "peek") { sizes = [33, 49, 29]; positions = [87, 141, 197]; }
  if (layout === "stamp") { sizes = [48, 23]; positions = [137, 175]; }
  if (layout === "giant") { sizes = idea.id === 3 ? [23, 31, 100] : [37, 89, 29]; positions = [83, 128, 218]; }
  if (idea.id === 11) positions = [65, 159, 218];
  if (layout === "receipt") { sizes = [42, 42, 29, 29]; positions = [108, 154, 193, 222]; }
  if (layout === "scatter") { sizes = [52, 50, 27]; positions = [112, 168, 208]; }
  if (layout === "blocks") { sizes = [33, 59, 33, 45]; positions = [75, 136, 218, 268]; }
  if (layout === "cup" || layout === "battery") { sizes = [32, 33, 53]; positions = [66, 109, 165]; }
  if (layout === "outline") { sizes = [28, 65, 29]; positions = [98, 168, 227]; }
  if (layout === "checklist") { sizes = [41, 34, 31, 34]; positions = [89, 127, 180, 216]; }
  if (layout === "retro") { sizes = [29, 53, 36]; positions = [98, 168, 223]; }
  if (layout === "contrast" || layout === "manifesto") { sizes = [34, 64, 34, 51]; positions = [70, 139, 202, 266]; }
  if (["frame", "path", "route", "walk", "compass"].includes(layout)) { sizes = [32, 39, 29]; positions = [95, 141, 185]; }
  if (layout === "route") sizes[2] = 25;
  if (layout === "compass") sizes[0] = 24;
  return <svg className={`bag-poster palette-${idea.palette} layout-${layout}`} viewBox="0 0 240 320" aria-hidden="true" focusable="false">
    <rect className="bag-poster-paper" width="240" height="320" />
    {layout === "blocks" && <rect className="bag-poster-block" x="0" y="160" width="240" height="160" />}
    {layout === "stamp" && <g className="bag-poster-stamp"><circle cx="120" cy="151" r="92" /><circle cx="120" cy="151" r="85" strokeDasharray="3 4" /><defs><path id={id} d="M47 151a73 73 0 0 1 146 0" /></defs><text className="bag-poster-micro"><textPath href={`#${id}`} startOffset="50%" textAnchor="middle">OFICIĀLI · BEZ IEBILDUMIEM</textPath></text></g>}
    <g className="bag-poster-motif"><Motif name={idea.motif} /></g>
    <g className="bag-poster-type">
      {lines.map((line, index) => <text key={line} x={layout === "checklist" ? 58 : layout === "manifesto" ? 22 : layout === "compass" && index === 1 ? 32 : 120} y={positions[index]} fontSize={sizes[index]} textAnchor={layout === "checklist" || layout === "manifesto" || (layout === "compass" && index === 1) ? "start" : "middle"} className={`${(layout === "outline" && index === 2) || (layout === "contrast" && index === 3) ? "bag-poster-outline" : ""} ${line !== line.toUpperCase() ? "bag-poster-serif" : ""} ${layout === "blocks" && index > 1 ? "bag-poster-inverted" : ""}`}>{line}</text>)}
    </g>
  </svg>;
}