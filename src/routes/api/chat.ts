import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createGeminiProvider } from "@/lib/ai-gateway.server";

type ChatRequestBody = { messages?: unknown };

const SYSTEM_PROMPT = `Sei il coach di Hybris, un coach personale AI esperto in allenamento sportivo per atleti amatoriali (corsa, ciclismo, nuoto, palestra, HIIT, yoga).

LINEE GUIDA:
- Rispondi sempre in italiano, in modo chiaro, professionale ed empatico.
- Usa un tono umano, concreto e motivante. Non essere paternalistico.
- Basa i consigli sui dati di allenamento dell'utente (RPE, distanza, durata, frequenza) quando forniti nel contesto.
- Se l'utente descrive sintomi di sovrallenamento o dolore, suggerisci sempre cautela e, se necessario, di consultare un professionista sanitario.
- Quando proponi un piano, sii specifico: durata, intensità (RPE 1–10), tipologia, recupero.
- Usa formattazione markdown: **grassetto** per i concetti chiave, elenchi puntati per i piani, intestazioni quando il messaggio è lungo.
- Mantieni le risposte concise ma complete. Niente paragrafi inutilmente lunghi.`;

async function loadUserContext(token: string): Promise<string> {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!SUPABASE_URL || !SUPABASE_KEY) return "";
    const { createClient } = await import("@supabase/supabase-js");
    const supa = createClient(SUPABASE_URL, SUPABASE_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: claims } = await supa.auth.getClaims(token);
    const uid = claims?.claims?.sub;
    if (!uid) return "";

    const [{ data: profile }, { data: attivita }] = await Promise.all([
      supa.from("profiles").select("nome,eta,anni_esperienza,sport_primario,sport_secondari,obiettivo_tipo,obiettivo_dettaglio,giorni_disponibili,limitazioni_fisiche").eq("id", uid).maybeSingle(),
      supa.from("attivita").select("sport_type,data,durata_min,distanza_km,rpe,note_utente").eq("user_id", uid).order("data", { ascending: false }).limit(10),
    ]);

    let ctx = "DATI ATLETA:\n";
    if (profile) {
      ctx += `- Nome: ${profile.nome ?? "-"}\n- Età: ${profile.eta ?? "-"}\n- Esperienza: ${profile.anni_esperienza ?? 0} anni\n- Sport principale: ${profile.sport_primario ?? "-"}\n- Sport: ${(profile.sport_secondari ?? []).join(", ") || "-"}\n- Obiettivo: ${profile.obiettivo_tipo ?? "-"}${profile.obiettivo_dettaglio ? ` (${profile.obiettivo_dettaglio})` : ""}\n- Giorni allenamento: ${(profile.giorni_disponibili ?? []).join(", ") || "-"}\n${profile.limitazioni_fisiche ? `- Limitazioni: ${profile.limitazioni_fisiche}\n` : ""}`;
    }
    if (attivita && attivita.length > 0) {
      ctx += `\nULTIME 10 ATTIVITÀ:\n`;
      for (const a of attivita) {
        const d = new Date(a.data).toLocaleDateString("it-IT", { day: "numeric", month: "short" });
        ctx += `- ${d} · ${a.sport_type ?? "?"} · ${a.durata_min ?? "?"}min${a.distanza_km ? ` · ${a.distanza_km}km` : ""}${a.rpe ? ` · RPE ${a.rpe}` : ""}\n`;
      }
    } else {
      ctx += `\nNessuna attività registrata ancora.\n`;
    }
    return ctx;
  } catch (e) {
    console.error("[coach] context load failed", e);
    return "";
  }
}

async function persistMessages(token: string, userMsg: UIMessage | null, assistantMsg: UIMessage) {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!SUPABASE_URL || !SUPABASE_KEY) return;
    const { createClient } = await import("@supabase/supabase-js");
    const supa = createClient(SUPABASE_URL, SUPABASE_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: claims } = await supa.auth.getClaims(token);
    const uid = claims?.claims?.sub;
    if (!uid) return;
    const toRow = (m: UIMessage) => ({
      user_id: uid,
      role: m.role,
      content: m.parts.map((p) => (p.type === "text" ? p.text : "")).join(""),
      parts: m.parts as unknown as object,
    });
    const rows = [userMsg, assistantMsg].filter(Boolean).map((m) => toRow(m as UIMessage));
    const { error } = await supa.from("coach_messages").insert(rows);
    if (error) console.error("[coach] persist error", error);
  } catch (e) {
    console.error("[coach] persist failed", e);
  }
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages } = (await request.json()) as ChatRequestBody;
        if (!Array.isArray(messages)) return new Response("Messages are required", { status: 400 });

        const authHeader = request.headers.get("authorization");
        const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
        if (!token) return new Response("Unauthorized", { status: 401 });

        const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        if (!key) return new Response("Missing GOOGLE_GENERATIVE_AI_API_KEY", { status: 500 });

        const uiMessages = messages as UIMessage[];
        const lastUser = [...uiMessages].reverse().find((m) => m.role === "user") ?? null;

        const userContext = await loadUserContext(token);
        const gemini = createGeminiProvider(key);
        const model = gemini("gemini-2.5-flash");

        const result = streamText({
          model,
          system: `${SYSTEM_PROMPT}\n\n${userContext}`,
          messages: await convertToModelMessages(uiMessages),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: uiMessages,
          onFinish: async ({ messages: finalMessages }) => {
            const assistantMsg = finalMessages[finalMessages.length - 1];
            if (assistantMsg?.role === "assistant") {
              await persistMessages(token, lastUser, assistantMsg);
            }
          },
        });
      },
    },
  },
});
