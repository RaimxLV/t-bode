import { lazy, Suspense, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Image as ImageIcon, Shirt, Wand2, Construction, Ruler } from "lucide-react";

const DesignLibrary = lazy(() => import("./bulk/DesignLibrary").then((m) => ({ default: m.DesignLibrary })));
const BaseProducts = lazy(() => import("./bulk/BaseProducts").then((m) => ({ default: m.BaseProducts })));
const PrintPresets = lazy(() => import("./bulk/PrintPresets").then((m) => ({ default: m.PrintPresets })));

const Fallback = () => (
  <div className="flex items-center justify-center py-16">
    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const ComingSoon = ({ title, desc }: { title: string; desc: string }) => (
  <Card className="border border-dashed border-border">
    <CardContent className="p-8 sm:p-12 text-center space-y-3">
      <Construction className="w-12 h-12 mx-auto text-muted-foreground" />
      <h3 className="text-lg font-display">{title}</h3>
      <p className="text-sm text-muted-foreground font-body max-w-md mx-auto">{desc}</p>
    </CardContent>
  </Card>
);

export function BulkStudio() {
  const [sub, setSub] = useState("library");

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl sm:text-2xl font-display">Bulk Studio</h2>
        <p className="text-xs sm:text-sm text-muted-foreground font-body">
          Augšupielādē dizainus, definē bāzes kreklus un masveidā ģenerē produktus visām krāsām.
        </p>
      </div>

      <Tabs value={sub} onValueChange={setSub}>
        <TabsList className="w-full sm:w-auto justify-start">
          <TabsTrigger value="library" className="gap-1.5">
            <ImageIcon className="w-4 h-4" /> Bibliotēka
          </TabsTrigger>
          <TabsTrigger value="bases" className="gap-1.5">
            <Shirt className="w-4 h-4" /> Bāzes krekli
          </TabsTrigger>
          <TabsTrigger value="sizes" className="gap-1.5">
            <Ruler className="w-4 h-4" /> Drukas izmēri
          </TabsTrigger>
          <TabsTrigger value="generate" className="gap-1.5">
            <Wand2 className="w-4 h-4" /> Ģenerators
          </TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="mt-4">
          <Suspense fallback={<Fallback />}>
            <DesignLibrary />
          </Suspense>
        </TabsContent>

        <TabsContent value="bases" className="mt-4">
          <Suspense fallback={<Fallback />}>
            <BaseProducts />
          </Suspense>
        </TabsContent>

        <TabsContent value="sizes" className="mt-4">
          <Suspense fallback={<Fallback />}>
            <PrintPresets />
          </Suspense>
        </TabsContent>

        <TabsContent value="generate" className="mt-4">
          <ComingSoon
            title="Bulk Ģenerators — pēc bāzu pievienošanas"
            desc="Izvēlies dizainus + bāzes kreklus + cenu, un viena klikšķa attālumā automātiski izveidosies produkti ar mockup visām krāsām, gatavi tirgoties."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}