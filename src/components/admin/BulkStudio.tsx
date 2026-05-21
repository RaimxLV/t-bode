import { lazy, Suspense, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Image as ImageIcon, Shirt, Wand2, Ruler } from "lucide-react";

const DesignLibrary = lazy(() => import("./bulk/DesignLibrary").then((m) => ({ default: m.DesignLibrary })));
const BaseProducts = lazy(() => import("./bulk/BaseProducts").then((m) => ({ default: m.BaseProducts })));
const PrintPresets = lazy(() => import("./bulk/PrintPresets").then((m) => ({ default: m.PrintPresets })));
const Generator = lazy(() => import("./bulk/Generator").then((m) => ({ default: m.Generator })));

const Fallback = () => (
  <div className="flex items-center justify-center py-16">
    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
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
          <Suspense fallback={<Fallback />}>
            <Generator />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}