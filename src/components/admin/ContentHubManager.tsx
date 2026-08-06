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
    <TabsList className="grid grid-cols-3 h-auto w-full gap-1 p-1 sm:flex sm:flex-wrap sm:justify-start">
      <TabsTrigger value="calendar" className="flex-col gap-1 py-2 text-[11px] sm:flex-row sm:gap-1.5 sm:text-sm">
        <CalendarDays className="w-4 h-4" /> <span className="sm:hidden">Kalendārs</span>
        <span className="hidden sm:inline">Mēneša kalendārs</span>
      </TabsTrigger>
      <TabsTrigger value="articles" className="flex-col gap-1 py-2 text-[11px] sm:flex-row sm:gap-1.5 sm:text-sm">
        <FileText className="w-4 h-4" /> <span className="sm:hidden">Raksti</span>
        <span className="hidden sm:inline">Visi raksti</span>
      </TabsTrigger>
      <TabsTrigger value="topics" className="flex-col gap-1 py-2 text-[11px] sm:flex-row sm:gap-1.5 sm:text-sm">
        <Lightbulb className="w-4 h-4" /> <span className="sm:hidden">Tēmas</span>
        <span className="hidden sm:inline">Tēmu banka</span>
      </TabsTrigger>
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