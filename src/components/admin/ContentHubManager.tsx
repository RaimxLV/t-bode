import { Suspense, lazy } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, FileText, Lightbulb, Loader2 } from "lucide-react";

const ContentCalendar = lazy(() => import("./ContentCalendar").then((m) => ({ default: m.ContentCalendar })));
const TopicBank = lazy(() => import("./TopicBank").then((m) => ({ default: m.TopicBank })));
const BlogManager = lazy(() => import("./BlogManager").then((m) => ({ default: m.BlogManager })));

const Fallback = () => (
  <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
);

/** Admin home for the "Idejas un Padomi" content hub. */
export const ContentHubManager = () => (
  <Tabs defaultValue="calendar" className="w-full space-y-4">
    <TabsList className="flex flex-wrap h-auto w-full justify-start gap-1 p-1">
      <TabsTrigger value="calendar" className="gap-1.5"><CalendarDays className="w-4 h-4" /> Mēneša kalendārs</TabsTrigger>
      <TabsTrigger value="articles" className="gap-1.5"><FileText className="w-4 h-4" /> Visi raksti</TabsTrigger>
      <TabsTrigger value="topics" className="gap-1.5"><Lightbulb className="w-4 h-4" /> Tēmu banka</TabsTrigger>
    </TabsList>

    <TabsContent value="calendar" className="mt-0">
      <Suspense fallback={<Fallback />}><ContentCalendar /></Suspense>
    </TabsContent>
    <TabsContent value="articles" className="mt-0">
      <Suspense fallback={<Fallback />}><BlogManager /></Suspense>
    </TabsContent>
    <TabsContent value="topics" className="mt-0">
      <Suspense fallback={<Fallback />}><TopicBank /></Suspense>
    </TabsContent>
  </Tabs>
);