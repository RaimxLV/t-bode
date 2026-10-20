import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useReducedMotion } from "framer-motion";
import { Pause, Play } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { StoryScene } from "./StoryScene";
import "./story.css";

const PHASE_MS = 5500;
const steps = [1, 2, 3, 4];

export function HowItWorksStory() {
  const { t, i18n } = useTranslation();
  const reducedMotion = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(false);
  const [foreground, setForeground] = useState(!document.hidden);
  const [time, setTime] = useState(0);
  const clock = useRef(0);
  const stage = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const phase = Math.floor(time / PHASE_MS) % 4;
  const playing = visible && foreground && !paused && !reducedMotion;
  const isLv = i18n.language.startsWith("lv");
  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(!!entry?.isIntersecting), { threshold: 0.15 });
    observer.observe(element);
    const onVisibility = () => setForeground(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", onVisibility); };
  }, []);
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last = performance.now();
    let paint = last;
    const tick = (now: number) => {
      clock.current = (clock.current + Math.min(now - last, 100)) % (PHASE_MS * 4);
      last = now;
      if (now - paint >= 32) { setTime(clock.current); paint = now; }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);
  const select = (index: number) => {
    clock.current = index * PHASE_MS;
    setTime(clock.current);
  };
  const keyboard = (event: KeyboardEvent, index: number) => {
    let next = index;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % 4;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index + 3) % 4;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = 3;
    else return;
    event.preventDefault(); select(next); tabs.current[next]?.focus();
  };
  return <div className="story" ref={stage} data-phase={phase + 1} data-playing={playing}>
    <div className="story-stage" id="how-it-works-scene" role="tabpanel" aria-labelledby={`how-step-${phase}`}>
      <StoryScene phase={phase} progress={(time % PHASE_MS) / PHASE_MS} staticScene={!!reducedMotion} title={t(`about.steps.s${phase + 1}.title`)} />
      <Button variant="ghost" size="icon" className="story-pause" onClick={() => setPaused(!paused)} aria-label={paused ? (isLv ? "Atsākt animāciju" : "Resume animation") : (isLv ? "Apturēt animāciju" : "Pause animation")} title={paused ? (isLv ? "Atsākt animāciju" : "Resume animation") : (isLv ? "Apturēt animāciju" : "Pause animation")} disabled={!!reducedMotion}>
        {paused || reducedMotion ? <Play /> : <Pause />}
      </Button>
    </div>
    <div className="story-steps" role="tablist" aria-label={t("about.howItWorks")}>
      {steps.map((num, index) => <Button key={num} ref={element => { tabs.current[index] = element; }} variant="ghost" id={`how-step-${index}`} role="tab" aria-selected={phase === index} aria-controls="how-it-works-scene" tabIndex={phase === index ? 0 : -1} onKeyDown={event => keyboard(event, index)} onClick={() => select(index)} className="story-step">
        <span className="story-step-track"><span className={phase === index ? "story-step-progress active" : "story-step-progress"} style={phase === index ? { transform: `scaleX(${reducedMotion || paused ? 1 : (time % PHASE_MS) / PHASE_MS})` } : undefined} /></span>
        <span className="story-step-number">{t("about.steps.step", "SOLIS")} {num}</span>
        <span className="story-step-title">{t(`about.steps.s${num}.title`)}</span>
        <span className="story-step-desc">{t(`about.steps.s${num}.desc`)}</span>
      </Button>)}
    </div>
  </div>;
}
