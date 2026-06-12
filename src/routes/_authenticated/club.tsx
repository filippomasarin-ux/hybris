import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Users, Copy, LogOut, Megaphone, Plus, Shield, X, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/club")({
  ssr: false,
  component: ClubPage,
});

type ClubRow = { id: string; nome: string; descrizione: string | null; codice_invito: string };
type MemberRow = { id: string; user_id: string; ruolo: string; nome: string | null };
type AnnouncementRow = { id: string; titolo: string | null; contenuto: string; created_at: string; author_id: string };

function ClubPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [club, setClub] = useState<ClubRow | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    setUserId(auth.user.id);

    const { data: membership } = await supabase
      .from("club_members")
      .select("club_id, ruolo")
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (!membership) {
      setClub(null);
      setLoading(false);
      return;
    }
    setMyRole(membership.ruolo);

    const [{ data: c }, { data: mems }, { data: ann }] = await Promise.all([
      supabase.from("clubs").select("id, nome, descrizione, codice_invito").eq("id", membership.club_id).maybeSingle(),
      supabase.from("club_members").select("id, user_id, ruolo").eq("club_id", membership.club_id),
      supabase
        .from("club_announcements")
        .select("id, titolo, contenuto, created_at, author_id")
        .eq("club_id", membership.club_id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    setClub(c);
    setAnnouncements(ann ?? []);

    if (mems && mems.length > 0) {
      const ids = mems.map((m) => m.user_id);
      const { data: profs } = await supabase.from("profiles").select("id, nome").in("id", ids);
      const nameMap = new Map((profs ?? []).map((p) => [p.id, p.nome]));
      setMembers(mems.map((m) => ({ ...m, nome: nameMap.get(m.user_id) ?? null })));
    } else {
      setMembers([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <AppShell>
        <div className="space-y-3 p-5">
          <div className="h-32 animate-pulse rounded-2xl bg-muted" />
          <div className="h-48 animate-pulse rounded-2xl bg-muted" />
        </div>
      </AppShell>
    );
  }

  if (!club || !userId) {
    return (
      <AppShell>
        <ClubEmptyState userId={userId} onChange={load} />
      </AppShell>
    );
  }

  return (
    <ClubView
      club={club}
      members={members}
      announcements={announcements}
      userId={userId}
      myRole={myRole ?? "atleta"}
      onChange={load}
    />
  );
}

/* ----------------- Empty: create or join ----------------- */

function ClubEmptyState({ userId, onChange }: { userId: string | null; onChange: () => void }) {
  const [mode, setMode] = useState<"home" | "create" | "join">("home");
  const [nome, setNome] = useState("");
  const [desc, setDesc] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const genCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

  const create = async () => {
    if (!userId || !nome.trim()) return;
    setBusy(true);
    const { data: newClub, error } = await supabase
      .from("clubs")
      .insert({ nome: nome.trim(), descrizione: desc.trim() || null, codice_invito: genCode(), created_by: userId })
      .select("id")
      .single();
    if (error || !newClub) {
      toast.error("Errore nella creazione del club");
      setBusy(false);
      return;
    }
    const { error: memErr } = await supabase
      .from("club_members")
      .insert({ club_id: newClub.id, user_id: userId, ruolo: "captain" });
    setBusy(false);
    if (memErr) {
      toast.error("Errore nell'iscrizione");
      return;
    }
    toast.success("Club creato! Sei il captain.");
    onChange();
  };

  const join = async () => {
    if (!userId || !code.trim()) return;
    setBusy(true);
    const { data: c } = await supabase.from("clubs").select("id, nome").eq("codice_invito", code.trim().toUpperCase()).maybeSingle();
    if (!c) {
      toast.error("Codice non valido");
      setBusy(false);
      return;
    }
    const { error } = await supabase.from("club_members").insert({ club_id: c.id, user_id: userId, ruolo: "atleta" });
    setBusy(false);
    if (error) {
      toast.error(error.code === "23505" ? "Sei già in un club" : "Errore");
      return;
    }
    toast.success(`Benvenuto in ${c.nome}!`);
    onChange();
  };

  if (mode === "home") {
    return (
      <div className="p-5">
        <header className="pt-3 pb-6">
          <h1 className="text-2xl">Run Club</h1>
          <p className="mt-1 text-sm text-muted-foreground">Allenati con la tua community.</p>
        </header>

        <div className="space-y-3">
          <button
            onClick={() => setMode("join")}
            className="flex w-full items-center justify-between rounded-2xl bg-surface p-5 text-left shadow-card transition-all hover:border-ring hover:shadow-card-hover"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">Unisciti a un club</p>
                <p className="text-sm text-muted-foreground">Inserisci il codice del captain</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setMode("create")}
            className="flex w-full items-center justify-between rounded-2xl bg-surface p-5 text-left shadow-card transition-all hover:border-ring hover:shadow-card-hover"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-full text-accent-foreground" style={{ backgroundColor: "var(--color-accent)" }}>
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">Crea il tuo club</p>
                <p className="text-sm text-muted-foreground">Diventa captain e invita atleti</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5">
      <button onClick={() => setMode("home")} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        ← Indietro
      </button>

      {mode === "create" ? (
        <div className="space-y-5">
          <header>
            <h1 className="text-2xl">Crea club</h1>
            <p className="mt-1 text-sm text-muted-foreground">Sarai il captain con pieni poteri.</p>
          </header>
          <Field label="Nome del club">
            <input value={nome} onChange={(e) => setNome(e.target.value)} className={inputCls} placeholder="es. Milano Runners" />
          </Field>
          <Field label="Descrizione (opzionale)">
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} className={inputCls + " resize-none"} />
          </Field>
          <button disabled={busy || !nome.trim()} onClick={create} className={btnPrimary}>
            {busy ? "Creazione…" : "Crea club"}
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          <header>
            <h1 className="text-2xl">Unisciti a un club</h1>
            <p className="mt-1 text-sm text-muted-foreground">Chiedi il codice al captain.</p>
          </header>
          <Field label="Codice invito">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className={inputCls + " font-mono tracking-widest text-lg uppercase"}
              placeholder="ABC123"
              maxLength={6}
            />
          </Field>
          <button disabled={busy || !code.trim()} onClick={join} className={btnPrimary}>
            {busy ? "Iscrizione…" : "Entra nel club"}
          </button>
        </div>
      )}
    </div>
  );
}

/* ----------------- Club view ----------------- */

function ClubView({
  club,
  members,
  announcements,
  userId,
  myRole,
  onChange,
}: {
  club: ClubRow;
  members: MemberRow[];
  announcements: AnnouncementRow[];
  userId: string;
  myRole: string;
  onChange: () => void;
}) {
  const [showCompose, setShowCompose] = useState(false);
  const isCaptain = myRole === "captain";

  const copyCode = () => {
    navigator.clipboard.writeText(club.codice_invito);
    toast.success("Codice copiato");
  };

  const leave = async () => {
    if (!confirm("Uscire dal club?")) return;
    const { error } = await supabase.from("club_members").delete().eq("user_id", userId).eq("club_id", club.id);
    if (error) {
      toast.error("Errore");
      return;
    }
    toast.success("Hai lasciato il club");
    onChange();
  };

  return (
    <AppShell>
      <div className="space-y-5 px-5 pt-8 pb-12">
        <header>
          <p className="label-caps text-muted-foreground">Il tuo club</p>
          <h1 className="mt-1 text-2xl">{club.nome}</h1>
          {club.descrizione && <p className="mt-1 text-sm text-muted-foreground">{club.descrizione}</p>}
          <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: isCaptain ? "var(--color-accent)" : "var(--color-muted-foreground)" }}>
            {isCaptain ? <Shield className="h-3 w-3" /> : <Users className="h-3 w-3" />}
            {isCaptain ? "Captain" : "Atleta"}
          </div>
        </header>

        <section className="rounded-2xl bg-surface p-5 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="label-caps text-muted-foreground">Codice invito</p>
              <p className="mt-1 font-mono text-xl font-semibold tracking-widest">{club.codice_invito}</p>
            </div>
            <button onClick={copyCode} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-input hover:bg-muted" aria-label="Copia">
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </section>

        <section className="rounded-2xl bg-surface p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Bacheca</h2>
            {isCaptain && (
              <button onClick={() => setShowCompose(true)} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                <Plus className="h-3 w-3" /> Annuncio
              </button>
            )}
          </div>
          {announcements.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
              <Megaphone className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
              Nessun annuncio ancora.
            </div>
          ) : (
            <ul className="space-y-3">
              {announcements.map((a) => (
                <li key={a.id} className="border-l-2 border-accent pl-3">
                  {a.titolo && <p className="text-sm font-semibold">{a.titolo}</p>}
                  <p className="text-sm whitespace-pre-wrap">{a.contenuto}</p>
                  <div className="mt-1 flex items-center justify-between">
                    <p className="text-[11px] text-muted-foreground">{new Date(a.created_at).toLocaleString("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                    {isCaptain && (
                      <button
                        onClick={async () => {
                          await supabase.from("club_announcements").delete().eq("id", a.id);
                          onChange();
                        }}
                        className="text-[11px] text-muted-foreground hover:text-destructive"
                      >
                        Elimina
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl bg-surface p-5 shadow-card">
          <h2 className="mb-3 font-semibold">Membri · {members.length}</h2>
          <ul className="divide-y divide-border">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                  {(m.nome ?? "?").split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.nome ?? "Atleta"}{m.user_id === userId && " (tu)"}</p>
                </div>
                {m.ruolo === "captain" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">
                    <Shield className="h-3 w-3" /> Captain
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>

        <button onClick={leave} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive">
          <LogOut className="h-4 w-4" /> Esci dal club
        </button>
      </div>

      {showCompose && (
        <ComposeAnnouncement
          clubId={club.id}
          authorId={userId}
          onClose={() => setShowCompose(false)}
          onSaved={() => {
            setShowCompose(false);
            onChange();
          }}
        />
      )}
    </AppShell>
  );
}

function ComposeAnnouncement({
  clubId,
  authorId,
  onClose,
  onSaved,
}: {
  clubId: string;
  authorId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [titolo, setTitolo] = useState("");
  const [contenuto, setContenuto] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!contenuto.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from("club_announcements")
      .insert({ club_id: clubId, author_id: authorId, titolo: titolo.trim() || null, contenuto: contenuto.trim() });
    setSaving(false);
    if (error) {
      toast.error("Errore");
      return;
    }
    toast.success("Annuncio pubblicato");
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-2xl bg-surface p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Nuovo annuncio</h2>
          <button onClick={onClose} className="rounded-full p-1 text-muted-foreground hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3">
          <Field label="Titolo (opzionale)">
            <input value={titolo} onChange={(e) => setTitolo(e.target.value)} className={inputCls} placeholder="es. Allenamento giovedì" />
          </Field>
          <Field label="Messaggio">
            <textarea value={contenuto} onChange={(e) => setContenuto(e.target.value)} rows={5} className={inputCls + " resize-none"} placeholder="Cosa vuoi comunicare al club?" />
          </Field>
          <button disabled={saving || !contenuto.trim()} onClick={submit} className={btnPrimary + " inline-flex items-center justify-center gap-2"}>
            <Check className="h-4 w-4" /> {saving ? "Pubblico…" : "Pubblica"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-input bg-surface px-3 py-2.5 text-[15px] outline-none focus:border-ring focus:ring-2 focus:ring-ring/20";
const btnPrimary =
  "w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label-caps mb-1.5 block text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
