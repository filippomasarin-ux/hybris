import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createGeminiProvider } from "@/lib/ai-gateway.server";
import { calcolaProgressoSettimanale, type ProgressoSport, type VolumeTarget } from "@/lib/obiettivi-settimanali";

const GiornoSchema = z.object({
  giorno: z.string(),
  data: z.string(),
  sport: z.string(),
  titolo: z.string(),
  durata_min: z.number(),
  distanza_km: z.number().optional(),
  intensita_rpe: z.number(),
  zona_intensita: z.string(),
  descrizione: z.string(),
  riposo: z.boolean(),
  motivo_riposo: z.string().optional(),
});

const PianoSchema = z.object({
  note: z.string(),
  stato_forma_rilevato: z.enum(["fresco", "normale", "affaticato"]),
  carico_settimana: z.enum(["leggero", "medio", "intenso"]),
  giorni: z.array(GiornoSchema).length(7),
});

export type PianoSettimanale = z.infer<typeof PianoSchema>;
export type GiornoPiano = z.infer<typeof GiornoSchema>;

const GIORNI_IT = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];

function lunediCorrente(): string {
  const d = new Date();
  const giorno = d.getUTCDay();
  const diff = (giorno + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

function dataGiorno(inizio: string, offset: number): string {
  const d = new Date(inizio);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

function indiceOggi(): number {
  return (new Date().getUTCDay() + 6) % 7;
}

function zonaDaRpeSport(sport: string, rpe: number): string {
  if (sport === "palestra") return "Forza";
  if (sport === "hiit") return "HIIT";
  if (sport === "yoga") return "Mobilità";
  if (rpe <= 3) return "Z1 recupero";
  if (rpe <= 6) return "Z2 aerobico";
  if (rpe <= 8) return "Z3 soglia";
  return "Z4 VO2max";
}

/**
 * I giorni già trascorsi questa settimana devono riflettere ciò che è realmente
 * successo (da attivita), non l'ipotesi generata dall'AI/fallback. Oggi resta
 * invariato se non ci sono ancora attività registrate; i giorni futuri restano
 * quelli proposti (adattati agli obiettivi di volume residui).
 */
function riconciliaGiorniTrascorsi(
  giorni: GiornoPiano[],
  attivitaSettimana: Array<{
    data: string;
    sport_type: string | null;
    durata_min: number | null;
    distanza_km: number | null;
    rpe: number | null;
  }>,
  oggiIdx: number,
): GiornoPiano[] {
  return giorni.map((g, i) => {
    if (i > oggiIdx) return g;

    const svolte = attivitaSettimana.filter((a) => a.data === g.data);
    if (svolte.length === 0) {
      if (i === oggiIdx) return g;
      return {
        ...g,
        sport: "altro",
        titolo: "Riposo",
        durata_min: 0,
        distanza_km: undefined,
        intensita_rpe: 0,
        zona_intensita: "Riposo",
        descrizione: "Nessuna attività registrata questo giorno.",
        riposo: true,
        motivo_riposo: "Nessuna attività registrata",
      };
    }

    const durata_min = svolte.reduce((s, a) => s + (a.durata_min ?? 0), 0);
    const distanza_km = svolte.reduce((s, a) => s + (a.distanza_km ?? 0), 0);
    const rpeMedio = Math.round(svolte.reduce((s, a) => s + (a.rpe ?? 5), 0) / svolte.length);
    const sport = svolte[0].sport_type ?? "altro";
    return {
      ...g,
      sport,
      titolo: svolte.length > 1 ? `${svolte.length} attività svolte` : "Attività svolta",
      durata_min,
      distanza_km: distanza_km > 0 ? Math.round(distanza_km * 100) / 100 : undefined,
      intensita_rpe: rpeMedio,
      zona_intensita: zonaDaRpeSport(sport, rpeMedio),
      descrizione: "Sessione già completata e registrata dalle tue attività.",
      riposo: false,
      motivo_riposo: undefined,
    };
  });
}

function calcolaStatoForma(
  attivita: Array<{ data: string; rpe: number | null; durata_min: number | null }>,
) {
  const ora = new Date();
  const ieri = new Date(ora); ieri.setDate(ieri.getDate() - 1);
  const ultimi4g = new Date(ora); ultimi4g.setDate(ultimi4g.getDate() - 4);
  const ultimi7g = new Date(ora); ultimi7g.setDate(ultimi7g.getDate() - 7);

  const recenti = attivita.filter((a) => new Date(a.data) >= ultimi7g);
  const ultimaDuePlusGiorni = attivita.length === 0 || new Date(attivita[0].data) < ieri;
  const attivitaUltimi4g = attivita.filter((a) => new Date(a.data) >= ultimi4g);
  const rpeAlti = attivita.filter((a) => new Date(a.data) >= ieri && (a.rpe ?? 0) >= 8);
  const rpeRecente = recenti.length > 0
    ? recenti.reduce((sum, a) => sum + (a.rpe ?? 5), 0) / recenti.length
    : 5;

  if (rpeAlti.length > 0 || (attivitaUltimi4g.length >= 3 && rpeRecente > 7)) {
    return { stato: "affaticato" as const, rpe_medio: Math.round(rpeRecente * 10) / 10 };
  }
  if (ultimaDuePlusGiorni && rpeRecente <= 6) {
    return { stato: "fresco" as const, rpe_medio: Math.round(rpeRecente * 10) / 10 };
  }
  return { stato: "normale" as const, rpe_medio: Math.round(rpeRecente * 10) / 10 };
}

function calcolaDistribuzioneSport(
  sportPrimario: string,
  sportSecondari: string[],
  obiettivoTipo: string,
  giorniDisponibili: number,
): Record<string, number> {
  const tuttiSport = [sportPrimario, ...sportSecondari.filter((s) => s !== sportPrimario)];
  const dist: Record<string, number> = {};

  if (tuttiSport.length === 1) {
    dist[sportPrimario] = giorniDisponibili;
    return dist;
  }

  let percPrimario: number;
  switch (obiettivoTipo) {
    case "gara":
      percPrimario = 0.65;
      break;
    case "performance":
      percPrimario = 0.60;
      break;
    case "massa":
      percPrimario = sportPrimario === "weighttraining" ? 0.60 : 0.45;
      break;
    case "dimagrimento":
      percPrimario = 0.50;
      break;
    case "salute":
    case "longevita":
      percPrimario = 0.50;
      break;
    default:
      percPrimario = 0.55;
  }

  const giorniPrimario = Math.max(1, Math.round(giorniDisponibili * percPrimario));
  dist[sportPrimario] = giorniPrimario;

  const giorniRestanti = Math.max(0, giorniDisponibili - giorniPrimario);
  const secondari = sportSecondari.filter((s) => s !== sportPrimario);

  if (secondari.length === 1) {
    dist[secondari[0]] = giorniRestanti;
  } else if (secondari.length > 1) {
    secondari.forEach((s, i) => {
      dist[s] = i < giorniRestanti % secondari.length
        ? Math.ceil(giorniRestanti / secondari.length)
        : Math.floor(giorniRestanti / secondari.length);
    });
  }

  return dist;
}

const MAPPA_GIORNI: Record<string, number> = {
  "lunedì": 0, "lunedi": 0, "lun": 0,
  "martedì": 1, "martedi": 1, "mar": 1,
  "mercoledì": 2, "mercoledi": 2, "mer": 2,
  "giovedì": 3, "giovedi": 3, "gio": 3,
  "venerdì": 4, "venerdi": 4, "ven": 4,
  "sabato": 5, "sab": 5,
  "domenica": 6, "dom": 6,
};

function pianoFallback(
  inizio: string,
  sportPrimario: string,
  giorniDisponibili: string[],
  stato: "fresco" | "normale" | "affaticato",
): PianoSettimanale {
  const dispIdx = new Set(
    (giorniDisponibili.length > 0 ? giorniDisponibili : Object.keys(MAPPA_GIORNI))
      .map((g) => MAPPA_GIORNI[g.toLowerCase()])
      .filter((n) => n !== undefined),
  );
  const giorni: GiornoPiano[] = [];
  let consecutivi = 0;
  for (let i = 0; i < 7; i++) {
    const isDisp = dispIdx.has(i);
    const riposo = !isDisp || consecutivi >= 2;
    if (riposo) {
      consecutivi = 0;
      giorni.push({
        giorno: GIORNI_IT[i],
        data: dataGiorno(inizio, i),
        sport: "altro",
        titolo: "Riposo",
        durata_min: 0,
        intensita_rpe: 0,
        zona_intensita: "Riposo",
        descrizione: "Giornata di riposo. Idratazione, sonno e alimentazione curata.",
        riposo: true,
        motivo_riposo: isDisp ? "Recupero programmato" : "Giorno non disponibile",
      });
    } else {
      consecutivi += 1;
      giorni.push({
        giorno: GIORNI_IT[i],
        data: dataGiorno(inizio, i),
        sport: sportPrimario || "altro",
        titolo: "Sessione aerobica",
        durata_min: 50,
        intensita_rpe: stato === "affaticato" ? 4 : 6,
        zona_intensita: "Z2 aerobico",
        descrizione: "Allenamento aerobico a ritmo conversazionale. Riscaldamento 10min, parte centrale, defaticamento 5min.",
        riposo: false,
      });
    }
  }
  return {
    note: "Piano di emergenza generato localmente. Rigenera per ottenere un piano AI personalizzato.",
    stato_forma_rilevato: stato,
    carico_settimana: stato === "affaticato" ? "leggero" : "medio",
    giorni,
  };
}

export const generaPianoSettimanale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!key) throw new Error("Missing GOOGLE_GENERATIVE_AI_API_KEY");

    const inizio = lunediCorrente();
    const fine = new Date(new Date(inizio).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const [{ data: profile }, { data: attivitaRaw }, { data: attivitaSettimanaRaw }] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "nome,eta,anni_esperienza,sport_primario,sport_secondari,obiettivo_tipo,obiettivo_dettaglio,giorni_disponibili,limitazioni_fisiche,club_id,volume_target",
        )
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("attivita")
        .select("sport_type,data,durata_min,distanza_km,rpe")
        .eq("user_id", userId)
        .order("data", { ascending: false })
        .limit(21),
      supabase
        .from("attivita")
        .select("sport_type,data,durata_min,distanza_km,rpe")
        .eq("user_id", userId)
        .gte("data", inizio),
    ]);

    const attivita = attivitaRaw ?? [];
    const attivitaSettimana = attivitaSettimanaRaw ?? [];
    const volumeTarget = (profile?.volume_target ?? {}) as VolumeTarget;
    const oggiIdx = indiceOggi();
    const progresso = calcolaProgressoSettimanale(attivitaSettimana, volumeTarget, inizio);

    // appuntamenti club: tabella non presente nello schema attuale, manteniamo vuoto
    const appuntamenti: Array<{ titolo: string; data_ora: string; tipo: string }> = [];
    void fine;

    const sportPrimario = profile?.sport_primario ?? "corsa";
    const sportSecondari = profile?.sport_secondari ?? [];
    const obiettivoTipo = profile?.obiettivo_tipo ?? "salute";
    const giorniDisp = profile?.giorni_disponibili ?? [];
    const numGiorniDisp = Math.max(1, giorniDisp.length || 5);

    const statoForma = calcolaStatoForma(attivita);
    const distribuzione = calcolaDistribuzioneSport(
      sportPrimario,
      sportSecondari,
      obiettivoTipo,
      Math.max(3, numGiorniDisp - 1), // riserviamo almeno 1 giorno di riposo
    );

    const ctx = `PROFILO ATLETA:
Nome: ${profile?.nome ?? "-"} · Età: ${profile?.eta ?? "-"} anni · Esperienza: ${profile?.anni_esperienza ?? 0} anni
Sport principale: ${sportPrimario}
Sport secondari: ${sportSecondari.join(", ") || "nessuno"}
Obiettivo: ${obiettivoTipo} — ${profile?.obiettivo_dettaglio ?? ""}
Giorni disponibili: ${giorniDisp.join(", ") || "tutti"} (${numGiorniDisp} giorni/settimana)
Limitazioni fisiche: ${profile?.limitazioni_fisiche || "nessuna"}

STATO FORMA ATTUALE: ${statoForma.stato.toUpperCase()}
RPE medio ultimi 7 giorni: ${statoForma.rpe_medio}/10
Implicazione: ${
      statoForma.stato === "affaticato"
        ? "PRIORITÀ AL RECUPERO. Riduci intensità. Max 1 sessione intensa questa settimana."
        : statoForma.stato === "fresco"
        ? "Atleta riposato. Puoi inserire 1-2 sessioni di qualità (Z3-Z4 o forza pesante)."
        : "Forma nella norma. Allenamento standard con progressione moderata."
    }

DISTRIBUZIONE SPORT RACCOMANDATA PER QUESTA SETTIMANA:
${Object.entries(distribuzione).map(([s, g]) => `- ${s}: ${g} sessioni`).join("\n")}

ULTIME 21 ATTIVITÀ (più recente prima):
${attivita.map((a) => `- ${a.data} · ${a.sport_type ?? "?"} · ${a.durata_min ?? "?"}min${a.distanza_km ? ` · ${a.distanza_km}km` : ""} · RPE ${a.rpe ?? "?"}`).join("\n") || "Nessuna"}

APPUNTAMENTI CLUB QUESTA SETTIMANA:
${appuntamenti.length > 0 ? appuntamenti.map((a) => `- ${new Date(a.data_ora).toLocaleDateString("it-IT", { weekday: "long" })} · ${a.tipo}: ${a.titolo}`).join("\n") : "Nessuno"}
${appuntamenti.length > 0 ? "IMPORTANTE: gli appuntamenti club devono essere integrati nel piano come sessioni (non aggiunti come giorni extra). Sostituisci la sessione pianificata per quel giorno con l'appuntamento club." : ""}

OBIETTIVI SETTIMANALI DI VOLUME (impostati dall'atleta):
${
  progresso.length > 0
    ? progresso
        .map(
          (p) =>
            `- ${p.sport}: target ${p.target}${p.unita === "km" ? "km" : "h"} · già fatto questa settimana ${p.fatto}${p.unita === "km" ? "km" : "h"} · residuo ${p.rimanente}${p.unita === "km" ? "km" : "h"}`,
        )
        .join("\n")
    : "Nessun obiettivo di volume impostato dall'atleta."
}

Settimana che inizia il ${inizio} (lunedì). Le date dei 7 giorni devono partire da ${inizio} in ordine cronologico.
Oggi è ${GIORNI_IT[oggiIdx]} (giorno ${oggiIdx + 1} di 7): i giorni da ${GIORNI_IT[oggiIdx]} incluso in poi sono quelli che conta dimensionare bene, perché quelli precedenti sono già trascorsi e verranno sostituiti automaticamente con le attività realmente svolte prima di mostrare il piano — non serve che tu li stimi con precisione.`;

    const system = `Sei un coach esperto di endurance e strength training. Genera un piano settimanale personalizzato in italiano.

REGOLE ASSOLUTE:
- 7 giorni esatti (lunedì → domenica), ordine cronologico.
- Rispetta SEMPRE i giorni disponibili dell'atleta: i giorni NON disponibili devono essere riposo=true.
- Inserisci 1-2 giorni di riposo anche tra i giorni disponibili per garantire recupero (mai 3+ giorni consecutivi di allenamento ad alta intensità).
- Rispetta la distribuzione sport raccomandata — è calcolata sull'obiettivo dell'atleta.
- Non aumentare il volume di più del 10% rispetto alla settimana precedente (stima dal carico recente).
- Se stato_forma = "affaticato": max 1 sessione con RPE > 7 nell'intera settimana.
- Se stato_forma = "fresco": puoi inserire 2 sessioni con RPE >= 8.
- Mai 2 sessioni consecutive con RPE >= 8.
- Mai 2 sessioni di forza pesante sullo stesso gruppo muscolare a meno di 72h.
- Se per uno sport è indicato un OBIETTIVO SETTIMANALE DI VOLUME con residuo > 0, dimensiona durata_min/distanza_km delle sessioni di quello sport nei giorni ancora da svolgere in modo da avvicinarti al residuo entro domenica, distribuendolo tra le sessioni rimanenti di quello sport senza violare le altre regole di recupero. Se il residuo è già a 0 o negativo, non aggiungere ulteriore volume di quello sport oltre a quanto già pianificato.

REGOLE PER OBIETTIVO:
- gara: periodizzazione specifica — sessione lunga weekend, una sessione di qualità (ritmo gara / intervalli), resto facile. Includi la gara/evento se specificato nelle date.
- performance: training polarizzato — 80% Z1-Z2, 20% Z3-Z4. Alternare giorni facili e giorni duri.
- massa: 2-3 sessioni di forza progressiva (compound: squat, deadlift, press, pull), cardio leggero nei giorni di recupero attivo. RPE forza 7-9.
- dimagrimento: cardio aerobico prevalente (Z2), 1-2 sessioni HIIT a settimana, 1 sessione forza. Evitare sottocalorismo + alta intensità nello stesso giorno.
- salute/longevita: varietà, nessun estremo. Mix aerobico + forza + mobilità. RPE max 7.

ZONE DI INTENSITÀ da usare nel campo zona_intensita:
- "Z1 recupero" → RPE 1-3: camminata, corsa lentissima, pedalata leggera
- "Z2 aerobico" → RPE 4-6: conversazione possibile, ritmo maratona o più lento
- "Z3 soglia" → RPE 7-8: ritmo 10km, soglia lattato, sforzo elevato ma sostenibile
- "Z4 VO2max" → RPE 9-10: intervalli brevi, sprint
- "Forza" → RPE 7-9: pesi, resistance training
- "HIIT" → RPE 8-9: circuit training, tabata, box jump
- "Mobilità" → RPE 1-2: yoga, stretching, foam roller
- "Riposo" → RPE 0

OUTPUT: JSON con schema esatto fornito. descrizione: max 40 parole, specifica e pratica (es. "4x1km a ritmo 10km con 90s recupero, riscaldamento 15min e defaticamento 10min"). note: 2-3 frasi che spiegano la logica della settimana in prima persona rivolgendoti direttamente all'atleta. Per i giorni di riposo compila motivo_riposo (es. "Recupero post-sessione intensa" o "Giorno non disponibile"). Per corsa/ciclismo/nuoto includi distanza_km coerente con durata e intensità.`;

    let piano: PianoSettimanale;
    try {
      const gemini = createGeminiProvider(key);
      const model = gemini("gemini-2.5-flash");
      const { experimental_output } = await generateText({
        model,
        system,
        prompt: ctx,
        experimental_output: Output.object({ schema: PianoSchema }),
      });
      piano = experimental_output;
    } catch (err) {
      console.error("[generaPianoSettimanale] AI failed, using fallback:", err);
      piano = pianoFallback(inizio, sportPrimario, giorniDisp, statoForma.stato);
    }

    piano = {
      ...piano,
      giorni: riconciliaGiorniTrascorsi(piano.giorni, attivitaSettimana, oggiIdx),
    };

    const { error } = await supabase
      .from("piani_settimanali")
      .upsert(
        {
          user_id: userId,
          settimana_inizio: inizio,
          giorni: piano.giorni,
          note: piano.note,
        },
        { onConflict: "user_id,settimana_inizio" },
      );
    if (error) throw new Error(error.message);

    return { settimana_inizio: inizio, ...piano, progresso };
  });

export const getPianoCorrente = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const inizio = lunediCorrente();
    const [{ data }, { data: profile }, { data: attivitaSettimanaRaw }] = await Promise.all([
      supabase
        .from("piani_settimanali")
        .select("settimana_inizio, giorni, note")
        .eq("user_id", userId)
        .eq("settimana_inizio", inizio)
        .maybeSingle(),
      supabase.from("profiles").select("volume_target").eq("id", userId).maybeSingle(),
      supabase
        .from("attivita")
        .select("sport_type,data,durata_min,distanza_km,rpe")
        .eq("user_id", userId)
        .gte("data", inizio),
    ]);
    if (!data) return null;

    const volumeTarget = (profile?.volume_target ?? {}) as VolumeTarget;
    const progresso = calcolaProgressoSettimanale(attivitaSettimanaRaw ?? [], volumeTarget, inizio);
    const giorni = data.giorni as PianoSettimanale["giorni"];
    // Stato/carico non sono persistiti separatamente: li ricaviamo dai giorni se assenti
    const giorniAllenamento = giorni.filter((g) => !g.riposo);
    const rpeMedio = giorniAllenamento.length > 0
      ? giorniAllenamento.reduce((s, g) => s + (g.intensita_rpe ?? 0), 0) / giorniAllenamento.length
      : 0;
    const carico: "leggero" | "medio" | "intenso" =
      giorniAllenamento.length <= 3 ? "leggero" : giorniAllenamento.length >= 6 ? "intenso" : "medio";
    const stato: "fresco" | "normale" | "affaticato" =
      rpeMedio >= 7.5 ? "affaticato" : rpeMedio <= 5 ? "fresco" : "normale";
    return {
      settimana_inizio: data.settimana_inizio,
      note: data.note ?? "",
      stato_forma_rilevato: stato,
      carico_settimana: carico,
      giorni,
      progresso,
    };
  });
