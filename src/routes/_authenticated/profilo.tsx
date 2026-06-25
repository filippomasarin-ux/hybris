// @ts-nocheck
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { SPORTS, OBIETTIVI } from "@/lib/sports";
import { toast } from "sonner";
import { LogOut, ChevronRight, RefreshCw, Unlink, X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { getStravaAuthUrl, getStravaStatus, stravaDisconnect, stravaSync } from "@/lib/strava.functions";

export const Route = createFileRoute("/_authenticated/profilo")({
  ssr: false,
  component: ProfiloPage,
});

type ObiettivoConPeso = { key: string; peso: number };

type Profile = {
  id: string;
  email: string | null;
  nome: string | null;
  sport_primario: string | null;
  sport_secondari: string[] | null;
  obiettivo_tipo: string | null;
  obiettivo_dettaglio: string | null;
  obiettivi: string[] | null;
  obiettivi_pesati: ObiettivoConPeso[] | null;
  volume_target: Record<string, number> | null;
};

const DEFAULT_VOLUME = 60;

function fmtMin(m: number): string {
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}min` : `${h}h`;
}

function normalizeWeights(keys: string[], pesi: Record<string, number>): Record<string, number> {
  if (keys.length === 0) return {};
  if (keys.length === 1) return { [keys[0]]: 100 };
  const total = keys.reduce((s, k) => s + (pesi[k] ?? 50), 0);
  if (total === 0) return Object.fromEntries(keys.map((k) => [k, Math.round(100 / keys.length)]));
  return Object.fromEntries(keys.map((k) => [k, Math.round(((pesi[k] ?? 50) / total) * 100)]));
}

function ProfiloPage() {
  const navigate = useNavigate();
  const [p, setP] = useState<Profile | null>(null);
  const [editGoal, setEditGoal] = useState(false);
  const [editVolume, setEditVolume] = useState(false);
  const [stravaConnected, setStravaConnected] = useState(false);
  const [stravaLoading, setStravaLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);

  const fetchAuthUrl = useServerFn(getStravaAuthUrl);
  const fetchStravaStatus = useServerFn(getStravaStatus);
  const disconnectStrava = useServerFn(stravaDisconnect);
  const syncStrava = useServerFn(stravaSync);

  const load = async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", auth.user.id)
      .maybeSingle();
    setP(data as Profile | null);
  };

  useEffect(() => {
    load();
    fetchStravaStatus().then((s) => setStravaConnected(s.connected)).catch(() => {});
  }, [fetchStravaStatus]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const initials = (p?.nome ?? p?.email ?? "?")
    .split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  const handleStravaConnect = async () => {
    setStravaLoading(true);
    try {
      const { url } = await fetchAuthUrl();
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore connessione Strava");
      setStravaLoading(false);
    }
  };

  const handleStravaDisconnect = async () => {
    if (!confirm("Disconnettere Strava? Le attività già importate rimarranno.")) return;
    setStravaLoading(true);
    try {
      await disconnectStrava();
      setStravaConnected(false);
      toast.success("Strava disconnesso");
    } catch {
      toast.error("Errore disconnessione");
    } finally {
      setStravaLoading(false);
    }
  };

  const handleStravaSync = async () => {
    setSyncLoading(true);
    try {
      const { imported } = await syncStrava();
      toast.success(`${imported} attività sincronizzate da Strava`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore sincronizzazione");
    } finally {
      setSyncLoading(false);
    }
  };

  const updateGoal = async (key: string) => {
    if (!p) return;
    const currentObiettivi = p.obiettivi ?? (p.obiettivo_tipo ? [p.obiettivo_tipo] : []);
    const isSelected = currentObiettivi.includes(key);
    const nextObiettivi = isSelected
      ? currentObiettivi.filter((k) => k !== key)
      : [...currentObiettivi, key];
    const currentPesi: Record<string, number> = {};
    (p.obiettivi_pesati ?? []).forEach((o) => { currentPesi[o.key] = o.peso; });
    if (!isSelected) currentPesi[key] = 50;
    const normalized = normalizeWeights(nextObiettivi, currentPesi);
    const obiettivi_pesati = nextObiettivi.map((k) => ({ key: k, peso: normalized[k] ?? 0 }));
    const { error } = await supabase
      .from("profiles")
      .update({
        obiettivi: nextObiettivi,
        obiettivo_tipo: nextObiettivi[0] ?? null,
        obiettivi_pesati,
      })
      .eq("id", p.id);
    if (error) {
      toast.error("Errore");
      return;
    }
    toast.success("Obiettivi aggiornati");
    load();
  };

  const updatePesoInModal = async (key: string, value: number) => {
    if (!p) return;
    const currentPesi: Record<string, number> = {};
    (p.obiettivi_pesati ?? []).forEach((o) => { currentPesi[o.key] = o.peso; });
    currentPesi[key] = value;
    const keys = p.obiettivi ?? [];
    const normalized = normalizeWeights(keys, currentPesi);
    const obiettivi_pesati = keys.map((k) => ({ key: k, peso: normalized[k] ?? 0 }));
    const { error } = await supabase
      .from("profiles")
      .update({ obiettivi_pesati })
      .eq("id", p.id);
    if (error) return;
    setP((prev) => prev ? { ...prev, obiettivi_pesati } : prev);
  };

  const updateVolumeTarget = async (sport: string, value: number) => {
    if (!p) return;
    const next = { ...(p.volume_target ?? {}), [sport]: value };
    const { error } = await supabase
      .from("profiles")
      .update({ volume_target: next })
      .eq("id", p.id);
    if (error) return;
    setP((prev) => prev ? { ...prev, volume_target: next } : prev);
  };

  const obiettivi = p?.obiettivi ?? (p?.obiettivo_tipo ? [p.obiettivo_tipo] : []);
  const pesiMap: Record<string, number> = {};
  (p?.obiettivi_pesati ?? []).forEach((o) => { pesiMap[o.key] = o.peso; });
  const normalizedPesi = normalizeWeights(obiettivi, pesiMap);

  const goalLabel = obiettivi.length === 0
    ? "Non impostato"
    : obiettivi.length === 1
    ? (OBIETTIVI.find((o) => o.key === obiettivi[0])?.titolo ?? obiettivi[0])
    : `${obiettivi.length} obiettivi`;

  const volumeLabel = (() => {
    const sports = p?.sport_secondari ?? [];
    if (sports.length === 0) return "Non impostato";
    return sports.map((k) => {
      const vol = p?.volume_target?.[k] ?? DEFAULT_VOLUME;
      const s = SPORTS.find((x) => x.key === k);
      return `${s?.label ?? k} ${fmtMin(vol)}`;
    }).join(" · ");
  })();

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
                label="Obiettivi"
                value={goalLabel}
                onClick={() => setEditGoal(true)}
              />
              <Row
                label="Volume settimanale"
                value={volumeLabel}
                onClick={() => setEditVolume(true)}
              />
              <StravaRow
                connected={stravaConnected}
                loading={stravaLoading}
                syncLoading={syncLoading}
                onConnect={handleStravaConnect}
                onDisconnect={handleStravaDisconnect}
                onSync={handleStravaSync}
              />
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

      {editGoal && p && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setEditGoal(false)}>
          <div className="w-full max-w-md rounded-t-2xl bg-surface p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Modifica obiettivi</h2>
              <button onClick={() => setEditGoal(false)} className="rounded-full p-1 hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2">
              {OBIETTIVI.map((o) => {
                const sel = obiettivi.includes(o.key);
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
                    {sel && <span className="label-caps text-accent">{normalizedPesi[o.key]}%</span>}
                  </button>
                );
              })}
            </div>

            {obiettivi.length > 1 && (
              <div className="mt-5 rounded-xl border border-border bg-background p-4">
                <p className="label-caps mb-3 text-muted-foreground">Bilanciamento</p>
                <div className="space-y-3">
                  {obiettivi.map((key) => {
                    const o = OBIETTIVI.find((x) => x.key === key);
                    if (!o) return null;
                    const Icon = o.icon;
                    const pct = normalizedPesi[key] ?? 0;
                    return (
                      <div key={key}>
                        <div className="mb-1 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className="h-3.5 w-3.5" style={{ color: "var(--color-accent)" }} strokeWidth={1.8} />
                            <span className="text-xs font-medium">{o.titolo}</span>
                          </div>
                          <span className="text-xs font-bold tabular-nums text-accent">{pct}%</span>
                        </div>
                        <input
                          type="range" min={10} max={90} step={5}
                          defaultValue={pesiMap[key] ?? 50}
                          onChange={(e) => updatePesoInModal(key, Number(e.target.value))}
                          className="w-full accent-[var(--color-accent)]"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {editVolume && p && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setEditVolume(false)}>
          <div className="w-full max-w-md rounded-t-2xl bg-surface p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Volume settimanale</h2>
              <button onClick={() => setEditVolume(false)} className="rounded-full p-1 hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-5">
              {(p.sport_secondari ?? []).map((k) => {
                const s = SPORTS.find((x) => x.key === k);
                if (!s) return null;
                const Icon = s.icon;
                const vol = p.volume_target?.[k] ?? DEFAULT_VOLUME;
                return (
                  <div key={k}>
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="flex h-7 w-7 items-center justify-center rounded-lg"
                          style={{ backgroundColor: `color-mix(in oklch, ${s.color} 15%, transparent)`, color: s.color }}
                        >
                          <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                        </span>
                        <span className="text-sm font-medium">{s.label}</span>
                      </div>
                      <span className="text-sm font-bold tabular-nums" style={{ color: s.color }}>{fmtMin(vol)}</span>
                    </div>
                    <input
                      type="range" min={30} max={600} step={15}
                      defaultValue={vol}
                      onChange={(e) => updateVolumeTarget(k, Number(e.target.value))}
                      className="w-full"
                      style={{ accentColor: s.color }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function StravaRow({
  connected,
  loading,
  syncLoading,
  onConnect,
  onDisconnect,
  onSync,
}: {
  connected: boolean;
  loading: boolean;
  syncLoading: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onSync: () => void;
}) {
  return (
    <div className="rounded-xl bg-surface px-4 py-3.5 shadow-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: connected ? "oklch(0.62 0.21 25 / 15%)" : "var(--color-muted)" }}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"
              style={{ color: connected ? "oklch(0.67 0.19 35)" : "var(--color-muted-foreground)" }}>
              <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
            </svg>
          </div>
          <div>
            <p className="label-caps text-muted-foreground">Strava</p>
            <p className="mt-0.5 text-sm font-medium">
              {connected ? "Connesso" : "Non connesso"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {connected ? (
            <>
              <button
                onClick={onSync}
                disabled={syncLoading}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-medium transition-colors hover:bg-secondary disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncLoading ? "animate-spin" : ""}`} />
                {syncLoading ? "Sync…" : "Sync"}
              </button>
              <button
                onClick={onDisconnect}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
              >
                <Unlink className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <button
              onClick={onConnect}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: "oklch(0.67 0.19 35)", color: "#fff" }}
            >
              {loading ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
                  <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                </svg>
              )}
              Connetti
            </button>
          )}
        </div>
      </div>

      {connected && (
        <p className="mt-2 text-xs text-muted-foreground">
          Sincronizza per importare le ultime 90 giorni di attività.
        </p>
      )}
    </div>
  );
}

function Row({ label, value, onClick }: { label: string; value: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick} disabled={!onClick}
      className="flex w-full items-center justify-between rounded-xl bg-surface px-4 py-3.5 text-left shadow-card transition-colors disabled:cursor-default hover:enabled:bg-muted"
    >
      <div className="min-w-0 flex-1 pr-3">
        <p className="label-caps text-muted-foreground">{label}</p>
        <p className="mt-0.5 truncate text-sm font-medium">{value}</p>
      </div>
      {onClick && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
    </button>
  );
}
