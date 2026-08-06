import { lazy, Suspense, type ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Wand2, FileText, Image as ImageIcon, FileEdit as FileEditIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FreeDesignStudio } from "./FreeDesignStudio";

const BlogManager = lazy(() => import("./BlogManager").then((m) => ({ default: m.BlogManager })));
const PrintZonesManager = lazy(() => import("./PrintZonesManager").then((m) => ({ default: m.PrintZonesManager })));
const DesignsToProducts = lazy(() => import("./DesignsToProducts").then((m) => ({ default: m.DesignsToProducts })));
const DesignLibrary = lazy(() => import("./bulk/DesignLibrary").then((m) => ({ default: m.DesignLibrary })));

const SubTabFallback = () => (
  <div className="flex items-center justify-center py-16">
    <Loader2 className="w-6 h-6 animate-spin text-primary" />
  </div>
);

type AutopilotDashboardProps = {
  draftProducts?: any[];
  loadingProducts?: boolean;
  renderProductGrid?: (items: any[], forDesign: boolean) => ReactNode;
};

const triggerClass =
  "flex-col gap-1 py-2 text-[11px] sm:flex-row sm:gap-1.5 sm:text-sm";

/** AI design tools: studio, print zones, design library and product drafts. */
export const AutopilotDashboard = ({
  draftProducts = [],
  loadingProducts = false,
  renderProductGrid,
}: AutopilotDashboardProps) => (
  <Tabs defaultValue="studio" className="w-full space-y-4">
    <TabsList className="grid grid-cols-3 h-auto w-full gap-1 p-1 sm:flex sm:flex-wrap sm:justify-start">
      <TabsTrigger value="studio" className={triggerClass}>
        <Wand2 className="w-4 h-4" /> AI Studija
      </TabsTrigger>
      <TabsTrigger value="blog" className={triggerClass}>
        <FileText className="w-4 h-4" /> Kampaņu raksti
      </TabsTrigger>
      <TabsTrigger value="printzones" className={triggerClass}>
        <Wand2 className="w-4 h-4" /> Print zonas
      </TabsTrigger>
      <TabsTrigger value="designstoproducts" className={triggerClass}>
        <Sparkles className="w-4 h-4" /> Dizaini → Krekli
      </TabsTrigger>
      <TabsTrigger value="designlibrary" className={triggerClass}>
        <ImageIcon className="w-4 h-4" /> Bibliotēka
      </TabsTrigger>
      <TabsTrigger value="drafts" className={triggerClass}>
        <FileEditIcon className="w-4 h-4" /> Melnraksti
        {draftProducts.length > 0 && <Badge variant="secondary" className="ml-1 text-xs">{draftProducts.length}</Badge>}
      </TabsTrigger>
    </TabsList>

    <TabsContent value="studio" className="mt-0">
      <FreeDesignStudio />
    </TabsContent>

    <TabsContent value="blog" className="mt-0">
      <Suspense fallback={<SubTabFallback />}>
        <BlogManager />
      </Suspense>
    </TabsContent>

    <TabsContent value="printzones" className="mt-0">
      <Suspense fallback={<SubTabFallback />}>
        <PrintZonesManager />
      </Suspense>
    </TabsContent>

    <TabsContent value="designstoproducts" className="mt-0">
      <Suspense fallback={<SubTabFallback />}>
        <DesignsToProducts />
      </Suspense>
    </TabsContent>

    <TabsContent value="designlibrary" className="mt-0">
      <Suspense fallback={<SubTabFallback />}>
        <DesignLibrary />
      </Suspense>
    </TabsContent>

    <TabsContent value="drafts" className="mt-0">
      {loadingProducts ? (
        <p className="text-muted-foreground text-center py-12 font-body">Ielādē…</p>
      ) : draftProducts.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground font-body">
          Nav neviena produkta melnraksta. Tie tiek izveidoti, pārvēršot dizainus par produktiem.
        </CardContent></Card>
      ) : renderProductGrid ? (
        renderProductGrid(draftProducts, false)
      ) : null}
    </TabsContent>
  </Tabs>
);