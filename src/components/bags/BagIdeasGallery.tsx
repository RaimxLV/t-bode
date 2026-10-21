import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, ChevronDown, Copy, Expand, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { bagIdeaCategories, bagIdeas, copyBagIdea, matchingBagIdeas, visibleBagIdeas, type BagIdea, type BagIdeaCategory } from "./bagIdeas";
import { BagIdeaPoster } from "./BagIdeaPoster";
import { bagTemplateNavigation } from "@/lib/bagTemplateBridge";

export function BagIdeasGallery({ href }: { href: string }) {
  const [category, setCategory] = useState<BagIdeaCategory>("Visi");
  const [limit, setLimit] = useState(8);
  const [selected, setSelected] = useState<BagIdea>();
  const [copyState, setCopyState] = useState<"idle" | "success" | "error">("idle");
  const trigger = useRef<HTMLButtonElement>();
  const shown = visibleBagIdeas(category, limit);
  const total = matchingBagIdeas(category).length;
  const templateNavigation = selected ? bagTemplateNavigation(href, selected.id) : null;

  return <div className="bag-print-gallery">
    <div className="bag-print-heading"><div><p className="bag-studio-kicker">{bagIdeas.length} IDEJAS · VIENS TAVS RAKSTURS</p><h3>Vārdi ar <em>raksturu.</em></h3></div><p>Kaķiem, kafijai, svētkiem un ikdienas mazajiem piedzīvojumiem.</p></div>
    <div className="bag-print-filters" role="group" aria-label="Ideju kategorijas">
      {bagIdeaCategories.map((item) => <Button key={item} variant="ghost" aria-pressed={category === item} onClick={() => { setCategory(item); setLimit(8); }}>{item}<span>{item === "Visi" ? bagIdeas.length : bagIdeas.filter((idea) => idea.category === item).length}</span></Button>)}
    </div>
    <div className="bag-print-grid" id="bag-print-grid" aria-label="Tipogrāfiskas apdrukas idejas">
      {shown.map((idea) => <Button key={idea.id} variant="ghost" className="bag-print-tile" aria-label={`Apskatīt ideju: ${idea.slogan}`} onClick={(event) => { trigger.current = event.currentTarget; setSelected(idea); setCopyState("idle"); }}>
        <BagIdeaPoster idea={idea} />
        <span className="bag-print-tile-meta"><span>{String(idea.id).padStart(2, "0")} / {idea.category}</span><Expand aria-hidden="true" /></span>
      </Button>)}
    </div>
    <div className="bag-print-reveal"><span role="status">{shown.length} no {total} idejām</span>{shown.length < total && <Button variant="ghost" aria-controls="bag-print-grid" onClick={() => setLimit((current) => current + 16)}>Rādīt vēl {Math.min(16, total - shown.length)} idejas <ChevronDown aria-hidden="true" /></Button>}</div>
    <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(undefined); }}>
      {selected && <DialogContent className="bag-idea-dialog [&>button:last-child]:hidden" data-lenis-prevent onCloseAutoFocus={(event) => { event.preventDefault(); trigger.current?.focus({ preventScroll: true }); }}>
        <DialogClose asChild><Button variant="ghost" size="icon" className="bag-idea-close" aria-label="Aizvērt priekšskatījumu"><X aria-hidden="true" /></Button></DialogClose>
        <div className="bag-idea-preview"><BagIdeaPoster idea={selected} /></div>
        <div className="bag-idea-dialog-copy"><p className="bag-idea-category">{selected.category} / {String(selected.id).padStart(2, "0")}</p><DialogTitle>{selected.slogan}</DialogTitle><DialogDescription>{templateNavigation ? "Sagatavi izvēlēsies pirms personalizēšanas sākšanas." : "Ideja iedvesmai — vēl nav pieejama kā gatava sagatave. Vari nokopēt saukli un pievienot to savam maisiņam pats."}</DialogDescription>
          <Button variant="outline" className="bag-idea-copy" onClick={async () => setCopyState(await copyBagIdea(selected.slogan))}>{copyState === "success" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}Kopēt tekstu</Button>
          <p className="bag-idea-copy-status" role="status">{copyState === "success" ? "Teksts nokopēts." : copyState === "error" ? "Neizdevās nokopēt. Atlasi un kopē saukli pats." : ""}</p>
          <Button asChild className="bag-studio-cta"><Link to={templateNavigation?.to ?? href} state={templateNavigation?.state}>{templateNavigation ? "Izvēlēties šo sagatavi" : "Izveidot savu maisiņu"} <ArrowRight aria-hidden="true" /></Link></Button>
        </div>
      </DialogContent>}
    </Dialog>
  </div>;
}