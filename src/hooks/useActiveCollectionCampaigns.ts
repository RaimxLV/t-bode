import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ActiveCampaign {
  id: string;
  title: string;
}

/** Campaigns whose products may currently be shown on the public collection page. */
export function useActiveCollectionCampaigns() {
  return useQuery({
    queryKey: ["campaigns", "active-collection"],
    queryFn: async (): Promise<ActiveCampaign[]> => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, title")
        .in("status", ["products_ready", "blog_ready", "completed", "active"]);
      if (error) throw error;
      return (data ?? []) as ActiveCampaign[];
    },
    staleTime: 60_000,
  });
}