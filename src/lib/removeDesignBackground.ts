import { supabase } from "@/integrations/supabase/client";

type RemoveBackgroundResponse = {
  ok?: number;
  failed?: number;
  results?: Array<{ id: string; ok: boolean; error?: string; file_path?: string }>;
  error?: string;
};

function normalizeErrorMessage(message?: string) {
  if (!message) return "Fona noņemšana neizdevās";
  if (/unauthorized|forbidden/i.test(message)) {
    return "Admin sesija vairs nav aktīva. Pārlādē lapu un ielogojies vēlreiz.";
  }
  return message;
}

export async function removeDesignBackground(designIds: string[], replace = true) {
  await supabase.auth.refreshSession().catch(() => undefined);

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session?.access_token) {
    throw new Error("Admin sesija vairs nav aktīva. Pārlādē lapu un ielogojies vēlreiz.");
  }

  const { data, error } = await supabase.functions.invoke("remove-design-background", {
    body: { design_ids: designIds, replace },
  });

  const payload = (data ?? {}) as RemoveBackgroundResponse;
  const message = payload.error || error?.context?.json?.error || error?.message;

  if (error || payload.error) {
    throw new Error(normalizeErrorMessage(message));
  }

  return payload;
}