import { useId } from "react";

const ease = (value: number) => { const n = Math.min(1, Math.max(0, value)); return n * n * (3 - 2 * n); };

function Cat({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <circle cx="0" cy="0" r="48" fill="var(--story-cat-backdrop)" />
    <path d="M-30 4 L-31-32 -12-20 Q0-28 13-20 L32-32 30 4 Q29 32 0 34 Q-30 32-30 4" fill="var(--story-cat)" stroke="var(--story-ink)" strokeWidth="3" strokeLinejoin="round" />
    <path d="M-26-25-16-18-25-12 M26-25 16-18 25-12" fill="var(--story-blush)" />
    <path d="M-15 3q5-6 10 0 M7 3q5-6 10 0 M-8 16q8 12 16 0" fill="none" stroke="var(--story-ink)" strokeWidth="3" strokeLinecap="round" />
    <path d="m-4 10 4 4 4-4" fill="var(--story-ink)" />
    <path d="M-35 10h12 M-34 17l12-3 M23 10h12 M23 14l11 3" stroke="var(--story-ink)" strokeWidth="2" strokeLinecap="round" />
    <circle cx="-19" cy="12" r="4" fill="var(--story-blush)" /><circle cx="19" cy="12" r="4" fill="var(--story-blush)" />
  </g>;
}
function Shirt({ x, y, scale = 1, printed = false, color = "var(--story-white)" }: { x: number; y: number; scale?: number; printed?: boolean; color?: string }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <path d="M-29-61-68-42-92 0-56 20-39-3-42 98 Q0 107 42 98L39-3 56 20 92 0 68-42 29-61Q0-40-29-61Z" fill={color} stroke="var(--story-line)" strokeWidth="3" strokeLinejoin="round" />
    <path d="M-29-61q29 42 58 0 M-38 87q38 8 76 0" fill="none" stroke="var(--story-line)" strokeWidth="3" />
    {printed && <Cat y={22} scale={0.55} />}
  </g>;
}
function Character({ delivery, reach, parcel }: { delivery: number; reach: number; parcel: number }) {
  return <g transform={`translate(${610 + delivery * 20} 40)`}>
    {/* Silhouette has distinct hands, hair, facial expression and tailored clothing. */}
    <path d="M-56 285-61 412-72 535-29 535-9 395 9 395 20 535 63 535 59 402 49 285Z" fill="var(--story-navy)" stroke="var(--story-navy-deep)" strokeWidth="4" />
    <path d="M-6 314-9 393 M-49 309l23 14 M40 309l-23 14" fill="none" stroke="var(--story-navy-light)" strokeWidth="3" />
    <path d="M-72 529-76 550q2 13 26 13h39q10-2 6-12l-25-17 M20 530l-3 22q1 11 24 11h45q9-4 4-12l-30-16" fill="var(--story-navy-deep)" stroke="var(--story-line)" strokeWidth="3" />
    <path d="M-73 558h63 M22 558h65 M-49 541l13 3m-16 3 14 3 M41 540l14 4m-17 2 16 4" stroke="var(--story-white)" strokeWidth="3" strokeLinecap="round" />
    <path d="M-22 121-64 140-79 208-49 220-54 291q54 15 108 0l-5-70 30-13-15-68-42-19Z" fill="var(--story-red)" stroke="var(--story-red-deep)" strokeWidth="4" />
    <path d="M-22 113v19q22 26 44 0v-25" fill="var(--story-skin)" stroke="var(--story-skin-shadow)" strokeWidth="3" />
    <path d="M-26 130q26 32 52 0 M-56 168l5 48 M53 168l-3 48 M-42 280q42 9 84 0" fill="none" stroke="var(--story-red-deep)" strokeWidth="3" />
    {/* Far arm reaches the locker; near arm collects the same parcel. */}
    <g transform={`rotate(${-reach * 34} 61 204)`}>
      <path d="M65 202q13 21 8 48l-19 12-49-30 12-20 35 13-8-17" fill="var(--story-skin)" stroke="var(--story-skin-shadow)" strokeWidth="3" />
      <path d="m9 218 19-5q7 0 5 7l-14 6 15 6q5 5-2 8l-23-9" fill="var(--story-skin)" stroke="var(--story-skin-shadow)" strokeWidth="2" />
    </g>
    <g opacity={1 - delivery} transform="translate(7 186) rotate(12)">
      <rect width="35" height="65" rx="6" fill="var(--story-navy-deep)" stroke="var(--story-navy-light)" strokeWidth="3" /><rect x="5" y="7" width="25" height="45" rx="2" fill="var(--story-phone-screen)" /><circle cx="18" cy="58" r="2" fill="var(--story-white)" />
    </g>
    <path d={`M-76 204q-11 42 18 53l${47 - parcel * 9} ${-21 + parcel * 15}q10-5 6-14l-10-8-40 16 9-17`} fill="var(--story-skin)" stroke="var(--story-skin-shadow)" strokeWidth="3" />
    <path d="m-3 217 15-12q5-3 7 1l-10 12 17-6q7-1 7 4l-20 11" fill="var(--story-skin)" stroke="var(--story-skin-shadow)" strokeWidth="2" strokeLinecap="round" />
    <ellipse cx="-39" cy="70" rx="10" ry="17" fill="var(--story-skin)" /><ellipse cx="40" cy="70" rx="9" ry="17" fill="var(--story-skin)" />
    <path d="M-38 40q4-34 39-33t40 35l-2 44q-8 35-37 38-30-2-39-34Z" fill="var(--story-skin)" stroke="var(--story-skin-shadow)" strokeWidth="3" />
    <path d="M-39 65q-13-27-3-48-17-16 2-28-3-12 13-12 20-15 44-2 22 6 35-8 11 26-3 41 4 27-8 46l-4-30Q5 39-17 16l-9 28Z" fill="var(--story-hair)" />
    <path d="M-20-5Q6 9 30-3 M-16 6q20 13 45 6" fill="none" stroke="var(--story-hair-highlight)" strokeWidth="3" strokeLinecap="round" />
    <path d="M-27 49q11-8 21-1 M13 48q10-8 19 0" stroke="var(--story-hair)" strokeWidth="5" fill="none" strokeLinecap="round" />
    <ellipse cx="-16" cy="66" rx="10" ry="12" fill="var(--story-white)" /><ellipse cx="23" cy="65" rx="10" ry="12" fill="var(--story-white)" />
    <ellipse cx="-12" cy="67" rx="5" ry="7" fill="var(--story-ink)" /><ellipse cx="26" cy="66" rx="5" ry="7" fill="var(--story-ink)" />
    <circle cx="-10" cy="64" r="2" fill="var(--story-white)" /><circle cx="28" cy="63" r="2" fill="var(--story-white)" />
    <path d="m5 68-3 15 9 1" fill="none" stroke="var(--story-skin-shadow)" strokeWidth="2" strokeLinecap="round" />
    <path d="M-18 91q24 13 45-4-6 28-24 27-14-3-21-23" fill="var(--story-mouth)" /><path d="M-15 92q20 10 39-2l-3 8q-17 8-32 1Z" fill="var(--story-white)" />
    <ellipse cx="-26" cy="83" rx="8" ry="4" fill="var(--story-blush)" opacity=".4" />
  </g>;
}
function Box({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <path d="M-53-35 25-43 61-27 61 42-16 51-53 34Z" fill="var(--story-box)" stroke="var(--story-box-edge)" strokeWidth="2" />
    <path d="M-53-35-16-19 61-27 M-16-19v70 M-20-39 17-23 17-1 29-2 29-25-8-41" fill="var(--story-box-tape)" stroke="var(--story-box-edge)" strokeWidth="2" />
    <rect x="-3" y="3" width="47" height="26" rx="2" fill="var(--story-white)" /><text x="20" y="14" textAnchor="middle" className="story-box-label">T-BODE</text><Cat x={20} y={22} scale={0.12} />
  </g>;
}

export function StoryScene({ phase, progress, staticScene, title }: { phase: number; progress: number; staticScene: boolean; title: string }) {
  const id = useId().replace(/:/g, "");
  const p = staticScene ? 0.85 : progress;
  const delivery = phase === 3 ? ease(p / 0.18) : 0;
  const upload = ease((p - 0.22) / 0.24);
  const order = ease((p - 0.46) / 0.17);
  const open = phase === 3 ? ease((p - 0.23) / 0.18) : 0;
  const collect = phase === 3 ? ease((p - 0.49) / 0.24) : 0;
  const scroll = phase === 0 ? ease((p - 0.12) / 0.4) * 135 : 0;
  const tap = (start: number) => Math.max(0, 1 - Math.abs(p - start) / 0.1);
  return <svg viewBox="0 0 1000 640" className="story-scene" role="img" aria-label={title}>
    <defs><clipPath id={`${id}-screen`}><rect x="146" y="100" width="300" height="422" rx="5" /></clipPath></defs>
    <ellipse cx="500" cy="607" rx="340" ry="10" fill="var(--story-ground)" />
    {/* Orange lockers replace the enlarged phone in the final phase. */}
    <g opacity={delivery} transform={`translate(${(1 - delivery) * -60} 0)`}>
      <rect x="140" y="143" width="415" height="447" rx="7" fill="var(--story-locker)" stroke="var(--story-locker-edge)" strokeWidth="5" />
      <path d="M151 150h392v8H151Z" fill="var(--story-locker-light)" />
      {[0, 1, 2].map(col => [0, 1, 2, 3].map(row => <g key={`${col}-${row}`}>
        <rect x={153 + col * 130} y={170 + row * 100} width="119" height="91" rx="2" fill="var(--story-locker)" stroke="var(--story-locker-edge)" strokeWidth="3" />
        <text x={250 + col * 130} y={191 + row * 100} className="story-locker-number">{col + 1}{row + 1}</text>
        <circle cx={258 + col * 130} cy={220 + row * 100} r="3" fill="var(--story-ink)" />
      </g>))}
      <rect x="282" y="277" width="120" height="84" rx="3" fill="var(--story-navy-deep)" />
      <rect x="295" y="287" width="94" height="60" rx="3" fill="var(--story-mint)" />
      <path d="m322 317 13 12 26-27" stroke="var(--story-success)" strokeWidth="6" fill="none" strokeLinecap="round" />
      <rect x="413" y="370" width="119" height="91" fill="var(--story-navy-deep)" opacity={open} />
      <g opacity={open * (1 - collect)}><Box x={470} y={421} scale={0.7} /></g>
      <g transform={`translate(413 370) skewY(${-open * 12}) scale(${1 - open * 0.82} 1)`}>
        <rect width="119" height="91" rx="2" fill="var(--story-locker)" stroke="var(--story-locker-edge)" strokeWidth="3" /><circle cx="105" cy="50" r="3" fill="var(--story-ink)" />
      </g>
    </g>
    <g opacity={1 - delivery} transform={`translate(${delivery * -70} 0)`}>
      <rect x="127" y="50" width="338" height="522" rx="38" fill="var(--story-phone-body)" stroke="var(--story-navy-light)" strokeWidth="5" />
      <rect x="139" y="62" width="314" height="498" rx="29" fill="var(--story-phone-screen)" />
      <rect x="251" y="69" width="89" height="13" rx="7" fill="var(--story-phone-body)" />
      <text x="159" y="88" className="story-small story-light">9:41</text><path d="M412 79v7m6-10v10m6-13v13" stroke="var(--story-white)" strokeWidth="3" />
      <g clipPath={`url(#${id}-screen)`}>
        <rect x="146" y="100" width="300" height="422" fill="var(--story-phone-screen)" />
        <text x="167" y="132" className="story-brand">T-BODE</text>
        <path d="M400 114h7l5 16h17l5-12h-24m5 17h1m12 0h1" fill="none" stroke="var(--story-white)" strokeWidth="3" strokeLinecap="round" />
        {phase === 0 && <>
          <rect x="164" y="150" width="264" height="28" rx="14" fill="var(--story-navy-light)" /><circle cx="180" cy="163" r="5" fill="none" stroke="var(--story-muted)" strokeWidth="2" /><path d="m184 168 4 4" stroke="var(--story-muted)" strokeWidth="2" />
          <svg x="157" y="188" width="279" height="319" viewBox="0 0 279 319" overflow="hidden">
            <g transform={`translate(0 ${-scroll})`}>
              {["var(--story-red)", "var(--story-locker)", "var(--story-mint)", "var(--story-white)", "var(--story-navy)", "var(--story-cat-backdrop)"].map((color, i) => <g key={i} transform={`translate(${i % 2 * 140} ${Math.floor(i / 2) * 150})`}>
                <rect x="4" y="2" width="126" height="138" rx="8" fill={i % 2 ? "var(--story-card-warm)" : "var(--story-card-cool)"} />
                <Shirt x={67} y={48} scale={0.46} color={color} /><rect x="23" y="114" width="86" height="5" rx="2" fill="var(--story-navy-light)" opacity=".5" />
              </g>)}
            </g>
          </svg>
          <rect x="300" y="204" width="126" height="138" rx="8" fill="none" stroke="var(--story-red)" strokeWidth="4" opacity={ease((p - 0.72) / 0.1)} />
          <g transform={`translate(370 ${365 - ease((p - 0.6) / 0.15) * 74})`}><Cursor ripple={tap(0.78)} /></g>
        </>}
        {phase === 1 && <>
          <rect x="165" y="151" width="262" height="294" rx="8" fill="var(--story-editor)" />
          <Shirt x={296} y={259} scale={1.08} />
          <g opacity={upload} transform={`translate(${225 + upload * 71} ${405 - upload * 122})`}><Cat scale={0.58} /></g>
          <g opacity={ease((p - 0.62) / 0.08)} stroke="var(--story-red)" fill="var(--story-white)"><rect x="262" y="248" width="68" height="70" fill="none" strokeDasharray="4 3" />{[[262,248],[330,248],[262,318],[330,318]].map(([x,y]) => <rect key={`${x}-${y}`} x={x-3} y={y-3} width="6" height="6" />)}</g>
          <rect x="166" y="459" width="53" height="45" rx="5" fill="var(--story-red)" />
          <path d="M193 487v-18m-7 7 7-7 7 7 M181 486v8h23v-8" stroke="var(--story-white)" strokeWidth="3" fill="none" strokeLinecap="round" />
          <Cat x={246} y={482} scale={0.38} />
          <circle cx="297" cy="482" r="12" fill="var(--story-red)" /><circle cx="335" cy="482" r="12" fill="var(--story-mint)" /><circle cx="373" cy="482" r="12" fill="var(--story-cat-backdrop)" />
          <g transform={`translate(${194 + upload * 117} ${480 - upload * 182})`}><Cursor ripple={tap(0.23)} /></g>
        </>}
        {phase === 2 && <>
          <g opacity={1-order}>
            <rect x="165" y="155" width="263" height="217" rx="8" fill="var(--story-editor)" /><Shirt x={296} y={226} scale={0.84} printed />
            <rect x="167" y="392" width="160" height="7" rx="3" fill="var(--story-muted)" /><rect x="167" y="412" width="104" height="5" rx="2" fill="var(--story-navy-light)" />
            <rect x="166" y="454" width="262" height="47" rx="7" fill="var(--story-red)" />
            <path d="M277 467h7l6 17h20l5-13h-29m5 18h1m16 0h1" fill="none" stroke="var(--story-white)" strokeWidth="3" strokeLinecap="round" />
            <g transform="translate(340 478)"><Cursor ripple={tap(0.46)} /></g>
          </g>
          <g opacity={order} transform={`translate(0 ${(1-order)*25})`}>
            <circle cx="296" cy="220" r="49" fill="var(--story-mint)" /><path d="m272 218 17 18 33-37" fill="none" stroke="var(--story-success)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
            <text x="296" y="305" textAnchor="middle" className="story-confirm">T-BODE</text><Shirt x={296} y={380} scale={0.55} printed />
            <path d="M269 476h54m-44 14h35" stroke="var(--story-muted)" strokeWidth="5" strokeLinecap="round" />
          </g>
        </>}
      </g>
      <rect x="252" y="540" width="88" height="5" rx="3" fill="var(--story-white)" />
    </g>
    <Character delivery={delivery} reach={open * (1 - collect)} parcel={collect} />
    {phase === 3 && <g opacity={ease((p - 0.49) / 0.06)}><Box x={470 + collect * 163} y={421 - collect * 115} scale={0.7 + collect * 0.3} /></g>}
    <g transform="translate(833 213)" opacity={phase === 2 ? order : phase === 3 ? collect : 0}>
      <circle r="27" fill="var(--story-mint)" /><path d="m-12 0 8 9 16-19" stroke="var(--story-success)" strokeWidth="4" fill="none" strokeLinecap="round" />
    </g>
  </svg>;
}
function Cursor({ ripple }: { ripple: number }) {
  return <g><circle r={8 + (1 - ripple) * 22} opacity={ripple * 0.75} fill="none" stroke="var(--story-red)" strokeWidth="4" /><path d="m0 0 5 29 8-9 10 9 5-5-10-9 12-4Z" fill="var(--story-white)" stroke="var(--story-ink)" strokeWidth="2" strokeLinejoin="round" /></g>;
}
