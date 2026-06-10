import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Index from "./Index";
import { Seo } from "@/components/Seo";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";

const Veikali = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

  return (
    <>
      <Seo
        title="T-Bode | Kreklu apdruka un dizains tiešsaistē (Alfa, Akropole, Origo)"
        description="Meklē T-Bode stendu? Izmanto mūsu ērto online rīku un izveido savu dizainu pats. Ātra piegāde pakomātos visā Latvijā!"
        canonical="https://www.t-bode.lv/veikali"
        noTitleSuffix
      />
      <Index />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md border-cta-red/30 bg-background">
          <DialogHeader>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-cta-red/10">
              <MapPin className="h-6 w-6 text-cta-red" />
            </div>
            <DialogTitle className="text-center text-2xl md:text-3xl font-display tracking-wide">
              Meklēji mūsu stendu?
            </DialogTitle>
            <DialogDescription className="text-center text-base text-muted-foreground pt-2">
              Tev vairs nav jāmeklē mūs tirdzniecības centros Alfa, Akropole vai
              Origo! T-Bode tagad piedāvā ērtu un modernu online rīku, kur pats
              vari visu viegli un ātri izveidot savā ekrānā.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button
              size="lg"
              className="w-full bg-cta-red hover:bg-cta-red/90 text-white font-bold tracking-wide"
              onClick={() => {
                setOpen(false);
                navigate("/design");
              }}
            >
              Atvērt vizuālo konstruktoru
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Veikali;