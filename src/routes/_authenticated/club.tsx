// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import {
  Users,
  Copy,
  RefreshCw,
  Plus,
  Calendar,
  MessageSquare,
  Settings,
  Shield,
  Send,
  Check,
  X,
  Trash2,
  Pencil,
  MapPin,
  LogOut,
  UserPlus,
  Crown,
} from "lucide-react";
import { toast } from "sonner";
import { SPORTS, sportInfo } from "@/lib/sports";

export const Route = createFileRoute("/_authenticated/club")({
  ssr: false,
  component: ClubPage,
});

type ClubRow = {
  id: string;
  nome: string;
  descrizione: string | null;
  codice_invito: string;
  sport: string[] | null;
  created_by: string;
};
type MemberRow = { id: string; user_id: string; ruolo: string; nome: string | null };
type EventoRow = {
  id: string;
  club_id: string;
  titolo: string;
  descrizione: string | null;
  sport: string | null;
  data: string;
  luogo: string | null;
  max_partecipanti: number | null;
};
type MsgRow = { id: string; user_id: string; testo: string; created_at: string };
type PartRow = { id: string; evento_id: string; user_id: string; stato: string };

const CARD = { background: "oklch(0.115 0.025 295)", border: "1px solid oklch(1 0 0 / 6%)" } as const;
const MUTED = { color: "#8E8E93" } as const;

function ClubPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [club, setClub] = useState<ClubRow | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
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
      setMembers([]);
      setMyRole(null);
      setLoading(false);
      return;
    }
    setMyRole(membership.ruolo);

    const [{ data: c }, { data: mems }] = await Promise.all([
      supabase
        .from("clubs")
        .select("id, nome, descrizione, codice_invito, sport, created_by")
        .eq("id", membership.club_id)
        .maybeSingle(),
      supabase.from("club_members").select("id, user_id, ruolo").eq("club_id", membership.club_id),
    ]);

    setClub(c as ClubRow);
    if (mems && mems.length > 0) {
      const ids = mems.map((m: any) => m.user_id);
      const { data: profs } = await supabase.from("profiles").select("id, nome").in("id", ids);
      const nameMap = new Map((profs ?? []).map((p: any) => [p.id, p.nome]));
      setMembers(mems.map((m: any) => ({ ...m, nome: nameMap.get(m.user_id) ?? null })));
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
        <div className="space-y-3 pt-8">
          <div className="h-32 animate-pulse rounded-2xl" style={CARD} />
          <div className="h-48 animate-pulse rounded-2xl" style={CARD} />
        </div>
      </AppShell>
    );
  }

  if (!userId) return <AppShell><div /></AppShell>;

  if (!club) {
    return (
      <AppShell>
        <EmptyState userId={userId} onChange={load} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <ClubView club={club} members={members} userId={userId} myRole={myRole ?? "atleta"} onChange={load} />
    </AppShell>
  );
}

/* ───────────────────────── Empty ───────────────────────── */

function EmptyState({ userId, onChange }: { userId: string; onChange: () => void }) {
  const [mode, setMode] = useState<"home" | "create" | "join">("home");
  const [nome, setNome] = useState("");
  const [desc, setDesc] = useState("");
  const [sports, setSports] = useState<string[]>([]);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const genCode = () => Math.random().toString(36).slice(2, 10).toUpperCase();

  const create = async () => {
    if (!nome.trim()) return;
    setBusy(true);
    const { data: c, error } = await supabase
      .from("clubs")
      .insert({ nome: nome.trim(), descrizione: desc.trim() || null, sport: sports, codice_invito: genCode(), created_by: userId })
      .select("id")
      .single();
    if (error || !c) { toast.error("Errore creazione club"); setBusy(false); return; }
    const { error: e2 } = await supabase.from("club_members").insert({ club_id: c.id, user_id: userId, ruolo: "captain" });
    setBusy(false);
    if (e2) { toast.error("Errore iscrizione"); return; }
    toast.success("Club creato");
    onChange();
  };

  const join = async () => {
    if (!code.trim()) return;
    setBusy(true);
    const { data: c } = await supabase.from("clubs").select("id, nome").eq("codice_invito", code.trim().toUpperCase()).maybeSingle();
    if (!c) { toast.error("Codice non valido"); setBusy(false); return; }
    const { error } = await supabase.from("club_members").insert({ club_id: c.id, user_id: userId, ruolo: "atleta" });
    setBusy(false);
    if (error) { toast.error(error.code === "23505" ? "Sei già in un club" : "Errore"); return; }
    toast.success(`Benvenuto in ${c.nome}`);
    onChange();
  };

  if (mode === "home") {
    return (
      <div className="mx-auto max-w-md py-12">
        <div className="rounded-3xl p-8 text-center" style={CARD}>
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: "var(--gradient-hero)" }}>
            <Users size={28} strokeWidth={2.5} color="white" />
          </div>
          <h1 className="font-display text-2xl tracking-wider uppercase">Non sei in nessun club</h1>
          <p className="mt-2 text-sm" style={MUTED}>Unisciti con un codice o crea il tuo.</p>
          <div className="mt-7 flex flex-col gap-2.5">
            <button onClick={() => setMode("join")} className="rounded-xl border px-4 py-3 font-display tracking-widest uppercase text-sm" style={{ background: "#0F0F12", borderColor: "oklch(1 0 0 / 8%)", color: "#FFFFFF" }}>
              Unisciti con codice
            </button>
            <button onClick={() => setMode("create")} className="rounded-xl px-4 py-3 font-display tracking-widest uppercase text-sm text-white" style={{ background: "var(--color-accent)" }}>
              Crea club →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md py-10">
      <button onClick={() => setMode("home")} className="mb-5 text-sm" style={MUTED}>← Indietro</button>
      <div className="rounded-3xl p-7 space-y-4" style={CARD}>
        {mode === "create" ? (
          <>
            <h2 className="font-display text-xl tracking-wider uppercase">Crea club</h2>
            <Field label="Nome">
              <input value={nome} onChange={(e) => setNome(e.target.value)} className={inputCls} placeholder="es. Milano Runners" />
            </Field>
            <Field label="Descrizione">
              <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} className={inputCls + " resize-none"} />
            </Field>
            <Field label="Sport del club">
              <div className="flex flex-wrap gap-2">
                {SPORTS.map((s) => {
                  const sel = sports.includes(s.key);
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setSports((p) => (sel ? p.filter((x) => x !== s.key) : [...p, s.key]))}
                      className="rounded-xl border px-3 py-1.5 text-xs uppercase tracking-wider"
                      style={sel ? { background: s.color, color: "white", borderColor: s.color } : { background: "#0F0F12", borderColor: "oklch(1 0 0 / 8%)", color: "#8E8E93" }}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </Field>
            <button disabled={busy || !nome.trim()} onClick={create} className={btnPrimary}>
              {busy ? "Creazione…" : "Crea club"}
            </button>
          </>
        ) : (
          <>
            <h2 className="font-display text-xl tracking-wider uppercase">Unisciti</h2>
            <Field label="Codice invito">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className={inputCls + " font-mono text-lg tracking-widest"}
                placeholder="ABCD1234"
                maxLength={8}
              />
            </Field>
            <button disabled={busy || !code.trim()} onClick={join} className={btnPrimary}>
              {busy ? "Iscrizione…" : "Entra"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── Main view ───────────────────────── */

type TabKey = "calendario" | "chat" | "gestione";

function ClubView({
  club,
  members,
  userId,
  myRole,
  onChange,
}: {
  club: ClubRow;
  members: MemberRow[];
  userId: string;
  myRole: string;
  onChange: () => void;
}) {
  const [tab, setTab] = useState<TabKey>("calendario");
  const isCaptain = myRole === "captain";

  return (
    <div className="pt-7 pb-12">
      {/* Header */}
      <header className="mb-5">
        <p className="label-caps" style={{ color: "var(--color-accent)" }}>Il tuo club</p>
        <h1 className="mt-1 font-display text-3xl tracking-wider uppercase">{club.nome}</h1>
        {club.descrizione && <p className="mt-1 text-sm" style={MUTED}>{club.descrizione}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {(club.sport ?? []).map((k) => {
            const info = sportInfo(k);
            return (
              <span key={k} className="rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider"
                style={{ background: `${info.color}22`, color: info.color, border: `1px solid ${info.color}44` }}>
                {info.label}
              </span>
            );
          })}
          <span className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] uppercase tracking-wider"
            style={{ background: "#1A1A1A", color: isCaptain ? "var(--color-accent-2)" : "#8E8E93" }}>
            {isCaptain ? <><Crown size={11} /> Capitano</> : <><Users size={11} /> Membro</>}
          </span>
        </div>
      </header>

      {/* Tabs */}
      <div className="mb-5 flex items-center gap-1 border-b" style={{ borderColor: "oklch(1 0 0 / 6%)" }}>
        <PillTab active={tab === "calendario"} onClick={() => setTab("calendario")} icon={Calendar} label="Calendario" />
        <PillTab active={tab === "chat"} onClick={() => setTab("chat")} icon={MessageSquare} label="Chat" />
        {isCaptain && <PillTab active={tab === "gestione"} onClick={() => setTab("gestione")} icon={Settings} label="Gestione" />}
      </div>

      {tab === "calendario" && <CalendarioTab club={club} userId={userId} members={members} isCaptain={isCaptain} />}
      {tab === "chat" && <ChatTab clubId={club.id} userId={userId} members={members} isCaptain={isCaptain} />}
      {tab === "gestione" && isCaptain && <GestioneTab club={club} members={members} userId={userId} onChange={onChange} />}
    </div>
  );
}

function PillTab({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button
      onClick={onClick}
      className="relative flex items-center gap-2 px-4 py-3 text-sm font-display tracking-widest uppercase transition-all"
      style={{ color: active ? "#FFFFFF" : "#8E8E93" }}
    >
      <Icon size={15} strokeWidth={2.2} />
      {label}
      {active && (
        <span className="absolute -bottom-px left-0 right-0 h-0.5" style={{ background: "var(--color-accent)" }} />
      )}
    </button>
  );
}

/* ───────────────────────── Calendario ───────────────────────── */

function CalendarioTab({
  club, userId, members, isCaptain,
}: { club: ClubRow; userId: string; members: MemberRow[]; isCaptain: boolean }) {
  const [eventi, setEventi] = useState<EventoRow[]>([]);
  const [parts, setParts] = useState<PartRow[]>([]);
  const [composeOpen, setComposeOpen] = useState(false);
  const [editing, setEditing] = useState<EventoRow | null>(null);

  const load = async () => {
    const { data: e } = await supabase.from("club_eventi").select("*").eq("club_id", club.id).order("data", { ascending: true });
    const eventiList = (e ?? []) as EventoRow[];
    setEventi(eventiList);
    if (eventiList.length > 0) {
      const { data: p } = await supabase.from("club_partecipazioni").select("id, evento_id, user_id, stato").in("evento_id", eventiList.map((x) => x.id));
      setParts((p ?? []) as PartRow[]);
    } else setParts([]);
  };

  useEffect(() => { load(); }, [club.id]);

  useEffect(() => {
    const ch = supabase.channel(`partecipazioni-${club.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "club_partecipazioni" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [club.id]);

  const now = Date.now();
  const futuri = eventi.filter((e) => new Date(e.data).getTime() >= now);
  const passati = eventi.filter((e) => new Date(e.data).getTime() < now);

  const myStato = (eventoId: string) => parts.find((p) => p.evento_id === eventoId && p.user_id === userId)?.stato;
  const conta = (eventoId: string) => parts.filter((p) => p.evento_id === eventoId && p.stato === "confermato").length;

  const rsvp = async (eventoId: string, nuovo: "confermato" | "declinato") => {
    const existing = parts.find((p) => p.evento_id === eventoId && p.user_id === userId);
    if (existing) {
      if (existing.stato === nuovo) {
        await supabase.from("club_partecipazioni").delete().eq("id", existing.id);
      } else {
        await supabase.from("club_partecipazioni").update({ stato: nuovo }).eq("id", existing.id);
      }
    } else {
      await supabase.from("club_partecipazioni").insert({ evento_id: eventoId, user_id: userId, stato: nuovo });
    }
    load();
  };

  const elimina = async (id: string) => {
    if (!confirm("Eliminare l'evento?")) return;
    await supabase.from("club_eventi").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-5">
      {isCaptain && (
        <div className="flex justify-end">
          <button onClick={() => { setEditing(null); setComposeOpen(true); }}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-display tracking-widest uppercase text-white"
            style={{ background: "var(--color-accent)" }}>
            <Plus size={15} strokeWidth={2.5} /> Nuovo evento
          </button>
        </div>
      )}

      {futuri.length === 0 && passati.length === 0 ? (
        <div className="rounded-2xl border border-dashed py-14 text-center" style={{ borderColor: "oklch(1 0 0 / 10%)" }}>
          <Calendar size={22} className="mx-auto mb-3" style={MUTED} />
          <p className="text-sm" style={MUTED}>Nessun evento programmato.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {futuri.map((e) => (
              <EventoCard
                key={e.id}
                evento={e}
                myStato={myStato(e.id)}
                count={conta(e.id)}
                members={members}
                parts={parts}
                onRsvp={rsvp}
                onEdit={isCaptain ? () => { setEditing(e); setComposeOpen(true); } : undefined}
                onDelete={isCaptain ? () => elimina(e.id) : undefined}
              />
            ))}
          </div>
          {passati.length > 0 && (
            <>
              <p className="label-caps mt-6" style={MUTED}>Conclusi</p>
              <div className="grid grid-cols-1 gap-3 opacity-50 md:grid-cols-2 lg:grid-cols-3">
                {passati.slice(0, 6).map((e) => (
                  <EventoCard key={e.id} evento={e} myStato={myStato(e.id)} count={conta(e.id)} members={members} parts={parts} concluded />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {composeOpen && (
        <ComposeEvento
          clubId={club.id}
          userId={userId}
          evento={editing}
          onClose={() => setComposeOpen(false)}
          onSaved={() => { setComposeOpen(false); load(); }}
        />
      )}
    </div>
  );
}

function EventoCard({
  evento, myStato, count, members, parts, onRsvp, onEdit, onDelete, concluded,
}: {
  evento: EventoRow;
  myStato?: string;
  count: number;
  members: MemberRow[];
  parts: PartRow[];
  onRsvp?: (id: string, s: "confermato" | "declinato") => void;
  onEdit?: () => void;
  onDelete?: () => void;
  concluded?: boolean;
}) {
  const [expand, setExpand] = useState(false);
  const sport = sportInfo(evento.sport);
  const partecipanti = parts.filter((p) => p.evento_id === evento.id);
  const nameOf = (uid: string) => members.find((m) => m.user_id === uid)?.nome ?? "Atleta";

  return (
    <div className="rounded-2xl p-5" style={CARD}>
      <div className="flex items-start gap-3">
        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: sport.color, boxShadow: `0 0 8px ${sport.color}` }} />
        <div className="flex-1 min-w-0">
          <p className="font-display text-lg tracking-wider uppercase truncate">{evento.titolo}</p>
          <p className="mt-0.5 text-xs" style={MUTED}>
            {new Date(evento.data).toLocaleString("it-IT", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          </p>
          {evento.luogo && (
            <p className="mt-1 inline-flex items-center gap-1 text-xs" style={MUTED}>
              <MapPin size={11} /> {evento.luogo}
            </p>
          )}
          {evento.descrizione && <p className="mt-2 text-sm" style={{ color: "#C7C7CC" }}>{evento.descrizione}</p>}
        </div>
        {(onEdit || onDelete) && (
          <div className="flex shrink-0 flex-col gap-1">
            {onEdit && <button onClick={onEdit} className="rounded-md p-1.5 hover:bg-white/5"><Pencil size={13} style={MUTED} /></button>}
            {onDelete && <button onClick={onDelete} className="rounded-md p-1.5 hover:bg-white/5"><Trash2 size={13} style={MUTED} /></button>}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button onClick={() => setExpand((v) => !v)} className="text-xs font-mono tracking-wider" style={{ color: "#FFFFFF" }}>
          {count}{evento.max_partecipanti ? `/${evento.max_partecipanti}` : ""} · partecipanti
        </button>
        {!concluded && onRsvp && (
          <div className="flex gap-2">
            <button
              onClick={() => onRsvp(evento.id, "confermato")}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-display tracking-widest uppercase"
              style={myStato === "confermato"
                ? { background: "#16A34A", color: "white" }
                : { background: "#0F0F12", color: "#FFFFFF", border: "1px solid oklch(1 0 0 / 8%)" }}
            >
              <Check size={12} /> Partecipo
            </button>
            <button
              onClick={() => onRsvp(evento.id, "declinato")}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-display tracking-widest uppercase"
              style={myStato === "declinato"
                ? { background: "#3A1410", color: "#FF6B6B", border: "1px solid #5A1F1F" }
                : { background: "#0F0F12", color: "#8E8E93", border: "1px solid oklch(1 0 0 / 8%)" }}
            >
              <X size={12} /> No
            </button>
          </div>
        )}
        {concluded && <span className="label-caps" style={MUTED}>Concluso</span>}
      </div>

      {expand && partecipanti.length > 0 && (
        <ul className="mt-3 space-y-1.5 border-t pt-3" style={{ borderColor: "oklch(1 0 0 / 6%)" }}>
          {partecipanti.map((p) => (
            <li key={p.id} className="flex items-center justify-between text-xs">
              <span>{nameOf(p.user_id)}</span>
              <span className="font-mono uppercase tracking-wider" style={{ color: p.stato === "confermato" ? "#16A34A" : p.stato === "declinato" ? "#FF6B6B" : "#8E8E93" }}>
                {p.stato}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ComposeEvento({
  clubId, userId, evento, onClose, onSaved,
}: { clubId: string; userId: string; evento: EventoRow | null; onClose: () => void; onSaved: () => void }) {
  const [titolo, setTitolo] = useState(evento?.titolo ?? "");
  const [descrizione, setDescrizione] = useState(evento?.descrizione ?? "");
  const [sport, setSport] = useState(evento?.sport ?? "corsa");
  const [data, setData] = useState(evento ? new Date(evento.data).toISOString().slice(0, 16) : "");
  const [luogo, setLuogo] = useState(evento?.luogo ?? "");
  const [max, setMax] = useState<string>(evento?.max_partecipanti?.toString() ?? "");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!titolo.trim() || !data) return;
    setBusy(true);
    const payload: any = {
      titolo: titolo.trim(),
      descrizione: descrizione.trim() || null,
      sport,
      data: new Date(data).toISOString(),
      luogo: luogo.trim() || null,
      max_partecipanti: max ? parseInt(max) : null,
    };
    const { error } = evento
      ? await supabase.from("club_eventi").update(payload).eq("id", evento.id)
      : await supabase.from("club_eventi").insert({ ...payload, club_id: clubId, created_by: userId });
    setBusy(false);
    if (error) { toast.error("Errore"); return; }
    toast.success(evento ? "Aggiornato" : "Evento creato");
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl p-6 sm:rounded-3xl" style={CARD} onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl tracking-wider uppercase">{evento ? "Modifica" : "Nuovo evento"}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-white/5"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <Field label="Titolo"><input className={inputCls} value={titolo} onChange={(e) => setTitolo(e.target.value)} /></Field>
          <Field label="Sport">
            <select className={inputCls} value={sport} onChange={(e) => setSport(e.target.value)}>
              {SPORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </Field>
          <Field label="Data e ora"><input type="datetime-local" className={inputCls} value={data} onChange={(e) => setData(e.target.value)} /></Field>
          <Field label="Luogo"><input className={inputCls} value={luogo} onChange={(e) => setLuogo(e.target.value)} placeholder="Parco Sempione" /></Field>
          <Field label="Max partecipanti"><input type="number" className={inputCls} value={max} onChange={(e) => setMax(e.target.value)} /></Field>
          <Field label="Descrizione"><textarea rows={3} className={inputCls + " resize-none"} value={descrizione} onChange={(e) => setDescrizione(e.target.value)} /></Field>
          <button disabled={busy || !titolo.trim() || !data} onClick={save} className={btnPrimary}>
            {busy ? "Salvataggio…" : "Salva"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Chat ───────────────────────── */

function ChatTab({ clubId, userId, members, isCaptain }: { clubId: string; userId: string; members: MemberRow[]; isCaptain: boolean }) {
  const [msgs, setMsgs] = useState<MsgRow[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const { data } = await supabase
      .from("club_messaggi")
      .select("id, user_id, testo, created_at")
      .eq("club_id", clubId)
      .order("created_at", { ascending: true })
      .limit(200);
    setMsgs((data ?? []) as MsgRow[]);
  };

  useEffect(() => { load(); }, [clubId]);

  useEffect(() => {
    const ch = supabase.channel(`msgs-${clubId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "club_messaggi", filter: `club_id=eq.${clubId}` }, (payload) => {
        setMsgs((p) => [...p, payload.new as MsgRow]);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [clubId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs.length]);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    const t = text.trim();
    setText("");
    const { error } = await supabase.from("club_messaggi").insert({ club_id: clubId, user_id: userId, testo: t });
    setSending(false);
    if (error) { toast.error("Errore invio"); setText(t); }
  };

  const memberRole = (uid: string) => members.find((m) => m.user_id === uid)?.ruolo;
  const memberName = (uid: string) => members.find((m) => m.user_id === uid)?.nome ?? "Atleta";
  const initials = (n: string) => n.split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="flex flex-col rounded-2xl" style={{ ...CARD, height: "min(70vh, 640px)" }}>
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-5">
        {msgs.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm" style={MUTED}>Nessun messaggio. Inizia la conversazione!</p>
          </div>
        ) : (
          msgs.map((m, i) => {
            const own = m.user_id === userId;
            const prev = msgs[i - 1];
            const sameAuthor = prev && prev.user_id === m.user_id;
            const role = memberRole(m.user_id);
            return (
              <div key={m.id} className={`flex ${own ? "justify-end" : "justify-start"} gap-2`}>
                {!own && (
                  <div className="w-8 shrink-0">
                    {!sameAuthor && (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold uppercase" style={{ background: "#1A1A1A", color: "#FFFFFF" }}>
                        {initials(memberName(m.user_id))}
                      </div>
                    )}
                  </div>
                )}
                <div className={`max-w-[75%] ${own ? "items-end" : "items-start"} flex flex-col`}>
                  {!sameAuthor && (
                    <div className="mb-1 flex items-center gap-1.5 px-1 text-[10px] uppercase tracking-wider" style={MUTED}>
                      <span>{own ? "Tu" : memberName(m.user_id)}</span>
                      {role === "captain" && own && isCaptain && (
                        <span className="rounded px-1 text-[9px]" style={{ background: "var(--color-accent-2)", color: "#000" }}>Capitano</span>
                      )}
                      {role === "captain" && !own && (
                        <span className="rounded px-1 text-[9px]" style={{ background: "var(--color-accent-2)", color: "#000" }}>Capitano</span>
                      )}
                      <span>· {new Date(m.created_at).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  )}
                  <div
                    className="rounded-2xl px-3.5 py-2 text-sm"
                    style={own
                      ? { background: "var(--color-accent)", color: "white", borderTopRightRadius: sameAuthor ? 16 : 6 }
                      : { background: "#1A1A1A", color: "#FFFFFF", borderTopLeftRadius: sameAuthor ? 16 : 6 }}
                  >
                    {m.testo}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="flex items-end gap-2 border-t p-3" style={{ borderColor: "oklch(1 0 0 / 6%)" }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          rows={1}
          placeholder="Scrivi un messaggio…"
          className="flex-1 resize-none rounded-xl border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-[var(--color-accent)]"
          style={{ borderColor: "oklch(1 0 0 / 10%)", color: "#FFFFFF", maxHeight: 120 }}
        />
        <button
          onClick={send}
          disabled={sending || !text.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white disabled:opacity-40"
          style={{ background: "var(--color-accent)" }}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────── Gestione ───────────────────────── */

function GestioneTab({ club, members, userId, onChange }: { club: ClubRow; members: MemberRow[]; userId: string; onChange: () => void }) {
  const [nome, setNome] = useState(club.nome);
  const [desc, setDesc] = useState(club.descrizione ?? "");
  const [sport, setSport] = useState<string[]>(club.sport ?? []);
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState<{ eventi: number; conclusi: number; topSport: string | null; topMember: string | null } | null>(null);

  useEffect(() => { loadStats(); }, [club.id]);

  const loadStats = async () => {
    const { data: ev } = await supabase.from("club_eventi").select("sport, data").eq("club_id", club.id);
    const eventi = (ev ?? []) as Array<{ sport: string | null; data: string }>;
    const now = Date.now();
    const conclusi = eventi.filter((e) => new Date(e.data).getTime() < now).length;
    const sportCount: Record<string, number> = {};
    eventi.forEach((e) => { if (e.sport) sportCount[e.sport] = (sportCount[e.sport] ?? 0) + 1; });
    const topSport = Object.entries(sportCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    // top member by weekly volume
    const ids = members.map((m) => m.user_id);
    let topMember: string | null = null;
    if (ids.length > 0) {
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data: att } = await supabase.from("attivita").select("user_id, durata_min").in("user_id", ids).gte("data", since);
      const tot: Record<string, number> = {};
      (att ?? []).forEach((a: any) => { tot[a.user_id] = (tot[a.user_id] ?? 0) + (a.durata_min ?? 0); });
      const topId = Object.entries(tot).sort((a, b) => b[1] - a[1])[0]?.[0];
      if (topId) topMember = members.find((m) => m.user_id === topId)?.nome ?? "Atleta";
    }
    setStats({ eventi: eventi.length, conclusi, topSport, topMember });
  };

  const saveInfo = async () => {
    setBusy(true);
    const { error } = await supabase.from("clubs").update({ nome: nome.trim(), descrizione: desc.trim() || null, sport }).eq("id", club.id);
    setBusy(false);
    if (error) { toast.error("Errore"); return; }
    toast.success("Aggiornato");
    onChange();
  };

  const regenCode = async () => {
    const newCode = Math.random().toString(36).slice(2, 10).toUpperCase();
    const { error } = await supabase.from("clubs").update({ codice_invito: newCode }).eq("id", club.id);
    if (error) { toast.error("Errore"); return; }
    toast.success("Nuovo codice generato");
    onChange();
  };

  const copyCode = () => {
    navigator.clipboard.writeText(club.codice_invito);
    toast.success("Codice copiato");
  };

  const promote = async (memberUserId: string) => {
    if (!confirm("Trasferire il ruolo di capitano? Diventerai un membro normale.")) return;
    // demote self, promote target
    await supabase.from("club_members").update({ ruolo: "atleta" }).eq("user_id", userId).eq("club_id", club.id);
    await supabase.from("club_members").update({ ruolo: "captain" }).eq("user_id", memberUserId).eq("club_id", club.id);
    toast.success("Ruolo trasferito");
    onChange();
  };

  const remove = async (memberId: string, name: string) => {
    if (!confirm(`Rimuovere ${name} dal club?`)) return;
    await supabase.from("club_members").delete().eq("id", memberId);
    toast.success("Membro rimosso");
    onChange();
  };

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {/* Info */}
      <section className="rounded-2xl p-5" style={CARD}>
        <h3 className="mb-4 font-display text-base tracking-widest uppercase">Info club</h3>
        <div className="space-y-3">
          <Field label="Nome"><input className={inputCls} value={nome} onChange={(e) => setNome(e.target.value)} /></Field>
          <Field label="Descrizione"><textarea rows={2} className={inputCls + " resize-none"} value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
          <Field label="Sport">
            <div className="flex flex-wrap gap-2">
              {SPORTS.map((s) => {
                const sel = sport.includes(s.key);
                return (
                  <button key={s.key} type="button"
                    onClick={() => setSport((p) => (sel ? p.filter((x) => x !== s.key) : [...p, s.key]))}
                    className="rounded-lg border px-2.5 py-1 text-xs uppercase tracking-wider"
                    style={sel ? { background: s.color, color: "white", borderColor: s.color } : { background: "#0F0F12", borderColor: "oklch(1 0 0 / 8%)", color: "#8E8E93" }}>
                    {s.label}
                  </button>
                );
              })}
            </div>
          </Field>
          <button disabled={busy} onClick={saveInfo} className={btnPrimary}>{busy ? "Salvataggio…" : "Salva"}</button>
        </div>

        <div className="mt-5 rounded-xl p-4" style={{ background: "#0F0F12", border: "1px solid oklch(1 0 0 / 6%)" }}>
          <p className="label-caps mb-2" style={MUTED}>Codice invito</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 font-mono text-lg tracking-widest">{club.codice_invito}</code>
            <button onClick={copyCode} className="rounded-lg border p-2 hover:bg-white/5" style={{ borderColor: "oklch(1 0 0 / 10%)" }} title="Copia">
              <Copy size={14} />
            </button>
            <button onClick={regenCode} className="rounded-lg border p-2 hover:bg-white/5" style={{ borderColor: "oklch(1 0 0 / 10%)" }} title="Rigenera">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* Membri */}
      <section className="rounded-2xl p-5" style={CARD}>
        <h3 className="mb-4 flex items-center gap-2 font-display text-base tracking-widest uppercase">
          <UserPlus size={15} /> Membri · {members.length}
        </h3>
        <ul className="divide-y" style={{ borderColor: "oklch(1 0 0 / 6%)" }}>
          {members.map((m) => {
            const isMe = m.user_id === userId;
            const isCap = m.ruolo === "captain";
            const initials = (m.nome ?? "?").split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase();
            return (
              <li key={m.id} className="flex items-center gap-3 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold uppercase" style={{ background: "#1A1A1A", color: "#FFFFFF" }}>
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {m.nome ?? "Atleta"}{isMe && " (tu)"}
                  </p>
                  {isCap && <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--color-accent-2)" }}>Capitano</p>}
                </div>
                {!isMe && !isCap && (
                  <>
                    <button onClick={() => promote(m.user_id)} className="rounded-md border px-2 py-1 text-[10px] uppercase tracking-wider hover:bg-white/5" style={{ borderColor: "oklch(1 0 0 / 10%)" }}>
                      Promuovi
                    </button>
                    <button onClick={() => remove(m.id, m.nome ?? "Atleta")} className="rounded-md p-1.5 hover:bg-white/5">
                      <Trash2 size={13} style={{ color: "#FF6B6B" }} />
                    </button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* Stats */}
      <section className="rounded-2xl p-5 lg:col-span-2" style={CARD}>
        <h3 className="mb-4 font-display text-base tracking-widest uppercase">Statistiche club</h3>
        {!stats ? (
          <p className="text-sm" style={MUTED}>Caricamento…</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatBox label="Membri" value={String(members.length)} />
            <StatBox label="Eventi tot." value={String(stats.eventi)} sub={`${stats.conclusi} conclusi`} />
            <StatBox label="Top sport" value={stats.topSport ? sportInfo(stats.topSport).label : "—"} accent={stats.topSport ? sportInfo(stats.topSport).color : undefined} />
            <StatBox label="Più attivo (7gg)" value={stats.topMember ?? "—"} />
          </div>
        )}
      </section>
    </div>
  );
}

function StatBox({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: "#0F0F12", border: "1px solid oklch(1 0 0 / 6%)" }}>
      <p className="label-caps" style={MUTED}>{label}</p>
      <p className="mt-2 font-display text-xl tracking-wider uppercase" style={{ color: accent ?? "#FFFFFF" }}>{value}</p>
      {sub && <p className="mt-1 text-[11px]" style={MUTED}>{sub}</p>}
    </div>
  );
}

/* ───────────────────────── helpers ───────────────────────── */

const inputCls = "w-full rounded-xl border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-[var(--color-accent)] text-white placeholder:text-white/30";
const btnPrimary = "w-full rounded-xl px-4 py-3 font-display text-sm tracking-widest uppercase text-white transition-opacity hover:opacity-90 disabled:opacity-40 bg-[var(--color-accent)]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label-caps mb-1.5 block" style={MUTED}>{label}</label>
      {children}
    </div>
  );
}
