import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, ChevronDown, Copy, Expand, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { bagIdeaCategories, bagIdeas, copyBagIdea, visibleBagIdeas, type BagIdea, type BagIdeaCategory } from "./bagIdeas";
import { BagIdeaPoster } from "./BagIdeaPoster";
import { useBagReveal } from "./useBagReveal";

export function BagIdeasGallery({ href }: { href: string }) {
  const [category, setCategory] = useState<BagIdeaCategory>("Visi");
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<BagIdea>();
  const [copyState, setCopyState] = useState<"idle" | "success" | "error">("idle");
  const trigger = useRef<HTMLButtonElement>();
  const ref = useBagReveal();
  const shown = visibleBagIdeas(category, expanded);

  return <div className="bag-print-gallery" ref={ref} data-paused="true">
    <div className="bag-print-heading"><div><p className="bag-studio-kicker">20 IDEJAS · VIENS TAVS RAKSTURS</p><h3>Vārdi ar <em>raksturu.</em></h3></div><p>Kaķiem, kafijai un ikdienas mazajiem piedzīvojumiem.</p></div>
    <div className="bag-print-filters" role="group" aria-label="Ideju kategorijas">
      {bagIdeaCategories.map((item) => <Button key={item} variant="ghost" aria-pressed={category === item} onClick={() => setCategory(item)}>{item}<span>{item === "Visi" ? bagIdeas.length : bagIdeas.filter((idea) => idea.category === item).length}</span></Button>)}
    </div>
    <div className="bag-print-grid" id="bag-print-grid" aria-label="Tipogrāfiskas apdrukas idejas">
      {shown.map((idea) => <Button key={idea.id} variant="ghost" className="bag-print-tile" aria-label={`Apskatīt ideju: ${idea.slogan}`} onClick={(event) => { trigger.current = event.currentTarget; setSelected(idea); setCopyState("idle"); }}>
        <BagIdeaPoster idea={idea} />
        <span className="bag-print-tile-meta"><span>{String(idea.id).padStart(2, "0")} / {idea.category}</span><Expand aria-hidden="true" /></span>
      </Button>)}
    </div>
    <div className="bag-print-reveal"><span role="status">{shown.length} no {category === "Visi" ? 20 : bagIdeas.filter((idea) => idea.category === category).length} idejām</span>{category === "Visi" && !expanded && <Button variant="ghost" aria-controls="bag-print-grid" aria-expanded={expanded} onClick={() => setExpanded(true)}>Rādīt visas 20 idejas <ChevronDown aria-hidden="true" /></Button>}</div>
    <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(undefined); }}>
      {selected && <DialogContent className="bag-idea-dialog [&>button:last-child]:hidden" data-lenis-prevent onCloseAutoFocus={(event) => { event.preventDefault(); trigger.current?.focus({ preventScroll: true }); }}>
        <DialogClose asChild><Button variant="ghost" size="icon" className="bag-idea-close" aria-label="Aizvērt priekšskatījumu"><X aria-hidden="true" /></Button></DialogClose>
        <div className="bag-idea-preview"><BagIdeaPoster idea={selected} /></div>
        <div className="bag-idea-dialog-copy"><p className="bag-idea-category">{selected.category} / {String(selected.id).padStart(2, "0")}</p><DialogTitle>{selected.slogan}</DialogTitle><DialogDescription>Ideja iedvesmai. Savu tekstu personalizēšanas rīkā pievienosi pats.</DialogDescription>
          <Button variant="outline" className="bag-idea-copy" onClick={async () => setCopyState(await copyBagIdea(selected.slogan))}>{copyState === "success" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}Kopēt tekstu</Button>
          <p className="bag-idea-copy-status" role="status">{copyState === "success" ? "Teksts nokopēts." : copyState === "error" ? "Neizdevās nokopēt. Atlasi un kopē saukli pats." : ""}</p>
          <Button asChild className="bag-studio-cta"><Link to={href}>Izveidot savu maisiņu <ArrowRight aria-hidden="true" /></Link></Button>
        </div>
      </DialogContent>}
    </Dialog>
  </div>;
}