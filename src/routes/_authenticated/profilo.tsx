import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { SPORTS, OBIETTIVI } from "@/lib/sports";
import { toast } from "sonner";
import { LogOut, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profilo")({
  ssr: false,
  component: ProfiloPage,
});

type Profile = {
  id: string;
  email: string | null;
  nome: string | null;
  sport_primario: string | null;
  sport_secondari: string[] | null;
  obiettivo_tipo: string | null;
  obiettivo_dettaglio: string | null;
};

function ProfiloPage() {
  const navigate = useNavigate();
  const [p, setP] = useState<Profile | null>(null);
  const [editGoal, setEditGoal] = useState(false);

  const load = async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const { data } = await supabase
      .from("profiles")
      .select("id, email, nome, sport_primario, sport_secondari, obiettivo_tipo, obiettivo_dettaglio")
      .eq("id", auth.user.id)
      .maybeSingle();
    setP(data);
  };

  useEffect(() => {
    load();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const initials = (p?.nome ?? p?.email ?? "?")
    .split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  const obiettivo = OBIETTIVI.find((o) => o.key === p?.obiettivo_tipo);

  const updateGoal = async (key: string) => {
    if (!p) return;
    const { error } = await supabase
      .from("profiles")
      .update({ obiettivo_tipo: key })
      .eq("id", p.id);
    if (error) {
      toast.error("Errore");
      return;
    }
    toast.success("Obiettivo aggiornato");
    setEditGoal(false);
    load();
  };

  return (
    <AppShell>
      <div className="px-5 pt-8 pb-8">
        {p && (
          <>
            <div className="flex items-center gap-4">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full text-xl font-semibold text-accent-foreground"
                style={{ backgroundColor: "var(--color-accent)" }}
              >
                {initials}
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-xl">{p.nome ?? "Atleta"}</h1>
                <p className="truncate text-sm text-muted-foreground">{p.email}</p>
              </div>
            </div>

            {(p.sport_primario || (p.sport_secondari?.length ?? 0) > 0) && (
              <div className="mt-5 flex flex-wrap gap-2">
                {[p.sport_primario, ...(p.sport_secondari ?? []).filter((s) => s !== p.sport_primario)]
                  .filter(Boolean)
                  .map((k) => {
                    const s = SPORTS.find((x) => x.key === k);
                    if (!s) return null;
                    const Icon = s.icon;
                    return (
                      <span
                        key={k}
                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                        style={{ backgroundColor: `color-mix(in oklch, ${s.color} 14%, transparent)`, color: s.color }}
                      >
                        <Icon className="h-3 w-3" strokeWidth={2} /> {s.label}
                      </span>
                    );
                  })}
              </div>
            )}

            <section className="mt-8 space-y-2">
              <Row
                label="Obiettivo"
                value={obiettivo ? obiettivo.titolo : "Non impostato"}
                onClick={() => setEditGoal(true)}
              />
              <Row label="Strava" value="Non connesso" hint="In arrivo" />
            </section>

            <button
              onClick={handleLogout}
              className="mt-10 flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
            >
              <LogOut className="h-4 w-4" /> Esci
            </button>
          </>
        )}
      </div>

      {editGoal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setEditGoal(false)}>
          <div className="w-full max-w-md rounded-t-2xl bg-surface p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-semibold">Modifica obiettivo</h2>
            <div className="space-y-2">
              {OBIETTIVI.map((o) => {
                const sel = p?.obiettivo_tipo === o.key;
                const Icon = o.icon;
                return (
                  <button
                    key={o.key} onClick={() => updateGoal(o.key)}
                    className="flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition-colors"
                    style={{ borderColor: sel ? "var(--color-accent)" : "var(--color-border)" }}
                  >
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded-full"
                      style={{ backgroundColor: sel ? "var(--color-accent)" : "var(--color-muted)", color: sel ? "var(--color-accent-foreground)" : "var(--color-foreground)" }}
                    >
                      <Icon className="h-4 w-4" strokeWidth={1.8} />
                    </span>
                    <span className="flex-1 text-sm font-medium">{o.titolo}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Row({ label, value, hint, onClick }: { label: string; value: string; hint?: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick} disabled={!onClick}
      className="flex w-full items-center justify-between rounded-xl bg-surface px-4 py-3.5 text-left shadow-card transition-colors disabled:cursor-default hover:enabled:bg-muted"
    >
      <div>
        <p className="label-caps text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-sm font-medium">{value}</p>
      </div>
      <div className="flex items-center gap-2">
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
        {onClick && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </div>
    </button>
  );
}
