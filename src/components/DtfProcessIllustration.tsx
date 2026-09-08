import { motion, useReducedMotion } from "framer-motion";

interface DtfProcessIllustrationProps {
  step: number;
  label: string;
}

const loop = (duration: number, delay = 0) => ({
  duration,
  delay,
  repeat: Infinity,
  ease: "easeInOut" as const,
});

const Artwork = ({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <path
      d="M8 24C8 12.4 17.4 3 29 3s21 9.4 21 21-9.4 21-21 21S8 35.6 8 24Z"
      className="fill-process-yellow stroke-process-ink"
      strokeWidth="2.5"
    />
    <path d="M18 20h5M35 20h5" className="stroke-process-ink" strokeWidth="3.5" strokeLinecap="round" />
    <path d="M19 30c5.2 5 14.8 5 20 0" className="fill-none stroke-process-ink" strokeWidth="3.5" strokeLinecap="round" />
    <path d="m8 29-6 6m47-7 7 5M14 9 9 3m39 8 5-6" className="stroke-process-pink" strokeWidth="3" strokeLinecap="round" />
  </g>
);

const DirectionArrow = ({ x, y }: { x: number; y: number }) => (
  <g transform={`translate(${x} ${y})`} className="text-cta-red">
    <path d="M0 0h30" stroke="currentColor" strokeWidth="2" strokeDasharray="4 5" />
    <path d="m25-5 6 5-6 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </g>
);

const PrinterScene = ({ reduceMotion }: { reduceMotion: boolean }) => (
  <>
    <path d="M18 34h284v96H18z" className="fill-process-machine stroke-process-ink" strokeWidth="3" />
    <path d="M35 50h250v60H35z" className="fill-process-window stroke-process-ink" strokeWidth="2" />
    <path d="M48 96h224v22H48z" className="fill-process-film" />
    <path d="M48 96h224" className="stroke-process-grid" strokeWidth="1.5" strokeDasharray="5 5" />
    <motion.g
      animate={reduceMotion ? undefined : { x: [0, 150, 0] }}
      transition={loop(3.6)}
    >
      <path d="M58 43h65v45H58z" className="fill-process-ink stroke-process-ink" strokeWidth="2" />
      <path d="M67 88v9m12-9v9m12-9v9m12-9v9m12-9v9" className="stroke-process-cyan" strokeWidth="3" />
      <circle cx="70" cy="57" r="3" className="fill-process-cyan" />
      <circle cx="81" cy="57" r="3" className="fill-process-pink" />
      <circle cx="92" cy="57" r="3" className="fill-process-yellow" />
    </motion.g>
    <motion.g animate={reduceMotion ? undefined : { opacity: [0.35, 1, 0.35] }} transition={loop(2.4)}>
      <Artwork x={197} y={71} scale={0.78} />
    </motion.g>
    <DirectionArrow x={240} y={141} />
    <path d="M18 130h284v18H18z" className="fill-process-ink" />
    <circle cx="42" cy="139" r="4" className="fill-process-cyan" />
    <circle cx="56" cy="139" r="4" className="fill-process-pink" />
  </>
);

const PowderScene = ({ reduceMotion }: { reduceMotion: boolean }) => (
  <>
    <path d="M22 31h276v110H22z" className="fill-process-machine stroke-process-ink" strokeWidth="3" />
    <path d="M42 50h236v72H42z" className="fill-process-window stroke-process-ink" strokeWidth="2" />
    <path d="m82 45 18 31h120l18-31" className="fill-process-ink stroke-process-ink" strokeWidth="2" />
    <path d="M48 101h224v21H48z" className="fill-process-film stroke-process-grid" strokeWidth="1" />
    <Artwork x={132} y={74} scale={0.72} />
    {[105, 124, 143, 162, 181, 200, 219].map((x, index) => (
      <motion.circle
        key={x}
        cx={x}
        cy="78"
        r={index % 2 === 0 ? 3 : 2.2}
        className="fill-process-powder"
        animate={reduceMotion ? undefined : { cy: [70, 102], opacity: [0, 1, 0] }}
        transition={loop(1.15, index * 0.12)}
      />
    ))}
    <motion.path
      d="M96 96c37-9 91-9 128 0"
      className="fill-none stroke-process-powder"
      strokeWidth="4"
      strokeLinecap="round"
      animate={reduceMotion ? undefined : { pathLength: [0.2, 1, 0.2], opacity: [0.45, 1, 0.45] }}
      transition={loop(2)}
    />
    <path d="M22 141h276v13H22z" className="fill-process-ink" />
    <DirectionArrow x={238} y={134} />
  </>
);

const CuringScene = ({ reduceMotion }: { reduceMotion: boolean }) => (
  <>
    <path d="M18 38h284v105H18z" className="fill-process-machine stroke-process-ink" strokeWidth="3" />
    <path d="M43 57h164v66H43z" className="fill-process-ink stroke-process-ink" strokeWidth="2" />
    <path d="M207 69h76v54h-76z" className="fill-process-window stroke-process-ink" strokeWidth="2" />
    <path d="M31 113h244v22H31z" className="fill-process-film stroke-process-grid" strokeWidth="1" />
    <motion.g animate={reduceMotion ? undefined : { x: [0, 34, 0] }} transition={loop(3)}>
      <Artwork x={211} y={86} scale={0.58} />
    </motion.g>
    {[72, 113, 154].map((x, index) => (
      <motion.path
        key={x}
        d={`M${x} 100c-10-10 10-16 0-27s10-17 0-27`}
        className="fill-none stroke-cta-red"
        strokeWidth="3"
        strokeLinecap="round"
        animate={reduceMotion ? undefined : { y: [4, -5, 4], opacity: [0.35, 1, 0.35] }}
        transition={loop(1.8, index * 0.2)}
      />
    ))}
    <circle cx="244" cy="48" r="5" className="fill-process-cyan" />
    <DirectionArrow x={242} y={151} />
  </>
);

const PressScene = ({ reduceMotion }: { reduceMotion: boolean }) => (
  <>
    <path d="M55 125h210v21H55z" className="fill-process-ink stroke-process-ink" strokeWidth="3" />
    <path d="M72 110h176l17 15H55z" className="fill-process-shirt stroke-process-ink" strokeWidth="2" />
    <Artwork x={135} y={91} scale={0.68} />
    <path d="M48 36h220v22H48z" className="fill-cta-red stroke-process-ink" strokeWidth="3" />
    <path d="M245 19h18v51h-18z" className="fill-process-machine stroke-process-ink" strokeWidth="3" />
    <path d="M255 19h42" className="stroke-process-ink" strokeWidth="8" strokeLinecap="round" />
    <motion.g animate={reduceMotion ? undefined : { y: [0, 40, 40, 0] }} transition={{ duration: 4, times: [0, 0.25, 0.72, 1], repeat: Infinity, ease: "easeInOut" }}>
      <path d="M55 66h205v22H55z" className="fill-cta-red stroke-process-ink" strokeWidth="3" />
      <path d="M72 88h171" className="stroke-process-pink" strokeWidth="3" strokeDasharray="8 6" />
    </motion.g>
    <motion.g animate={reduceMotion ? undefined : { opacity: [0, 1, 1, 0] }} transition={{ duration: 4, times: [0, 0.3, 0.7, 1], repeat: Infinity }}>
      <path d="M105 98v-18m25 18V76m55 22V76m25 22V80" className="stroke-cta-red" strokeWidth="2.5" strokeLinecap="round" />
    </motion.g>
  </>
);

const PeelScene = ({ reduceMotion }: { reduceMotion: boolean }) => (
  <>
    <path d="M35 114h250v28H35z" className="fill-process-ink stroke-process-ink" strokeWidth="3" />
    <path d="M55 81h210l20 33H35z" className="fill-process-shirt stroke-process-ink" strokeWidth="2" />
    <Artwork x={133} y={72} scale={0.86} />
    <motion.path
      d="M75 82h171c-20-1-38-13-47-31-6-11-7-22-4-33"
      className="fill-process-film/80 stroke-process-grid"
      strokeWidth="2"
      animate={reduceMotion ? undefined : { d: [
        "M75 82h171c-20-1-38-13-47-31-6-11-7-22-4-33",
        "M75 82h171c-34-3-66-20-84-46-7-10-10-19-11-27",
        "M75 82h171c-20-1-38-13-47-31-6-11-7-22-4-33",
      ] }}
      transition={loop(3.4)}
    />
    <motion.g animate={reduceMotion ? undefined : { x: [0, -28, 0], y: [0, -6, 0] }} transition={loop(3.4)}>
      <path d="M202 17c14-8 30-4 37 8l-15 15-28-7z" className="fill-process-powder stroke-process-ink" strokeWidth="2" />
      <path d="m226 35 17 13" className="stroke-process-ink" strokeWidth="6" strokeLinecap="round" />
    </motion.g>
    <motion.path
      d="m116 61 8 7 14-17"
      className="fill-none stroke-process-cyan"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
      animate={reduceMotion ? undefined : { opacity: [0.35, 1, 0.35], scale: [0.9, 1.05, 0.9] }}
      transition={loop(2)}
    />
  </>
);

export const DtfProcessIllustration = ({ step, label }: DtfProcessIllustrationProps) => {
  const reduceMotion = useReducedMotion() ?? false;
  const scenes = [PrinterScene, PowderScene, CuringScene, PressScene, PeelScene];
  const Scene = scenes[step - 1] ?? PrinterScene;

  return (
    <div className="relative h-full min-h-[180px] overflow-hidden bg-process-surface" role="img" aria-label={label}>
      <div className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-sm border border-process-grid bg-background/90 px-2 py-1 font-body text-[10px] font-semibold uppercase text-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-cta-red" />
        Process {String(step).padStart(2, "0")}
      </div>
      <svg viewBox="0 0 320 170" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <pattern id={`grid-${step}`} width="16" height="16" patternUnits="userSpaceOnUse">
            <path d="M16 0H0v16" className="fill-none stroke-process-grid" strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect width="320" height="170" fill={`url(#grid-${step})`} opacity="0.45" />
        <Scene reduceMotion={reduceMotion} />
      </svg>
    </div>
  );
};