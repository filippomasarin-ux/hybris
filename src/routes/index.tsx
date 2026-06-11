import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });

    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completato")
      .eq("id", data.user.id)
      .maybeSingle();

    if (!profile?.onboarding_completato) throw redirect({ to: "/onboarding" });
    throw redirect({ to: "/home" });
  },
  component: () => null,
});
