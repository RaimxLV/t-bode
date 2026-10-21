import { ImagePlus, PackageCheck, ShoppingBag } from "lucide-react";
import { bagSteps } from "./bagContent";
import { useBagReveal } from "./useBagReveal";

const icons = [ShoppingBag, ImagePlus, PackageCheck];
export function BagProcess() {
  const ref = useBagReveal();
  return <section className="bag-section bag-process-editorial" aria-labelledby="bag-process-title">
    <div><p className="bag-eyebrow">NO EKRĀNA IKDIENĀ</p><h2 id="bag-process-title">Trīs soļi līdz<br /><em>tavam maisiņam.</em></h2></div>
    <div className="bag-steps bag-connected-steps" ref={ref} data-paused="true">
      <span className="bag-process-track" aria-hidden="true" />
      {bagSteps.map(([title, text], index) => {
        const Icon = icons[index];
        return <div className="bag-step" key={title}><div className="bag-step-symbol"><Icon aria-hidden="true" strokeWidth={1.4} /><span>0{index + 1}</span></div><h3>{title}</h3><p>{text}</p></div>;
      })}
    </div>
  </section>;
}