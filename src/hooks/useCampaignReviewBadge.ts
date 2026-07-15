import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const PENDING_STATUSES = [
  "ready_for_review",
  "designs_ready",
  "products_ready",
  "blog_ready",
];

export type PendingCampaign = {
  id: string;
  title: string | null;
  status: string;
  step: 1 | 2 | 3;
};

function statusToStep(status: string): 1 | 2 | 3 {
  if (status === "ready_for_review") return 1;
  if (status === "designs_ready") return 2;
  return 3;
}

async function fetchPending(): Promise<PendingCampaign[]> {
  const { data, error } = await supabase
    .from("campaigns" as any)
    .select("id, title, status")
    .in("status", PENDING_STATUSES);
  if (error) return [];
  return ((data as any[]) ?? []).map((c) => ({
    id: c.id,
    title: c.title,
    status: c.status,
    step: statusToStep(c.status),
  }));
}

export function useCampaignReviewBadge(enabled = true) {
  return useQuery({
    queryKey: ["campaign-review-badge"],
    queryFn: fetchPending,
    enabled,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    staleTime: 60 * 1000,
  });
}