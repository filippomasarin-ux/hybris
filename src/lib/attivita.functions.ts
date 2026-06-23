import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getAttivitaAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const da = new Date();
    da.setDate(da.getDate() - 90);

    const { data } = await supabase
      .from("attivita")
      .select("sport_type,data,durata_min,distanza_km,rpe,fc_media,pace_media")
      .eq("user_id", userId)
      .gte("data", da.toISOString().slice(0, 10))
      .order("data", { ascending: false });

    return data ?? [];
  });
