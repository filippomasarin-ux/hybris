import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ArrowUp, Sparkles, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/coach")({
  ssr: false,
  component: CoachPage,
});

const SUGGESTIONS = [
  "Crea un piano per la prossima settimana",
  "Come gestisco il recupero dopo una sessione intensa?",
  "Cosa mangiare prima di un allenamento di corsa?",
  "Sto migliorando? Analizza le mie ultime attività",
];

function CoachPage() {
  const [token, setToken] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<UIMessage[] | null>(null);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const t = data.session?.access_token ?? null;
      setToken(t);

      const { data: rows } = await supabase
        .from("coach_messages")
        .select("id, role, content, parts, created_at")
        .order("created_at", { ascending: true });

      const msgs: UIMessage[] = (rows ?? []).map((r) => ({
        id: r.id,
        role: r.role as "user" | "assistant",
        parts: Array.isArray(r.parts)
          ? (r.parts as UIMessage["parts"])
          : [{ type: "text", text: r.content ?? "" }],
      }));
      setInitialMessages(msgs);
    })();
  }, []);

  const transport = useMemo(
    () =>
      token
        ? new DefaultChatTransport({
            api: "/api/chat",
            headers: { Authorization: `Bearer ${token}` },
          })
        : null,
    [token],
  );

  if (!transport || initialMessages === null) {
    return (
      <AppShell>
        <div className="px-5 pt-8">
          <div className="h-8 w-32 animate-pulse rounded bg-muted" />
        </div>
      </AppShell>
    );
  }

  return (
    <CoachChat
      transport={transport}
      initialMessages={initialMessages}
      input={input}
      setInput={setInput}
      scrollRef={scrollRef}
      inputRef={inputRef}
    />
  );
}

function CoachChat({
  transport,
  initialMessages,
  input,
  setInput,
  scrollRef,
  inputRef,
}: {
  transport: DefaultChatTransport<UIMessage>;
  initialMessages: UIMessage[];
  input: string;
  setInput: (v: string) => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const { messages, sendMessage, status, setMessages } = useChat({
    transport,
    messages: initialMessages,
    onError: (err) => {
      console.error(err);
      toast.error("Errore di connessione con il Coach");
    },
  });

  const loading = status === "submitted" || status === "streaming";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, scrollRef]);

  useEffect(() => {
    if (!loading) inputRef.current?.focus();
  }, [loading, inputRef]);

  const submit = (text?: string) => {
    const value = (text ?? input).trim();
    if (!value || loading) return;
    setInput("");
    void sendMessage({ text: value });
  };

  const handleClear = async () => {
    if (!confirm("Cancellare l'intera conversazione con il Coach?")) return;
    const { error } = await supabase.from("coach_messages").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) {
      toast.error("Errore");
      return;
    }
    setMessages([]);
    toast.success("Conversazione cancellata");
  };

  const isEmpty = messages.length === 0;

  return (
    <AppShell>
      <div className="flex h-[100dvh] flex-col md:h-screen">
        <header className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div>
            <h1 className="text-base font-semibold leading-tight">Coach AI</h1>
            <p className="text-xs text-muted-foreground">Conosce i tuoi dati di allenamento</p>
          </div>
          {!isEmpty && (
            <button
              onClick={handleClear}
              className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Cancella conversazione"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-6 pb-32 md:pb-6">
          {isEmpty ? (
            <EmptyState onPick={submit} />
          ) : (
            <div className="mx-auto max-w-2xl space-y-6">
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}
              {loading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                  <span>Il Coach sta pensando…</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="fixed inset-x-0 bottom-16 z-10 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:static md:bottom-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="mx-auto flex max-w-2xl items-end gap-2 rounded-2xl border border-border bg-surface p-2 shadow-card focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="Chiedi al Coach…"
              rows={1}
              className="max-h-40 flex-1 resize-none bg-transparent px-3 py-2 text-[15px] outline-none placeholder:text-muted-foreground"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
              aria-label="Invia"
            >
              <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const text = message.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-[15px] text-primary-foreground">
          {text}
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-3">
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-accent-foreground"
        style={{ backgroundColor: "var(--color-accent)" }}
      >
        <Sparkles className="h-3.5 w-3.5" />
      </div>
      <div className="prose prose-sm prose-neutral min-w-0 max-w-none flex-1 text-[15px] leading-relaxed
        prose-p:my-2 prose-headings:mt-4 prose-headings:mb-2 prose-headings:font-semibold
        prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5
        prose-strong:text-foreground prose-strong:font-semibold
        prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:text-[13px] prose-code:font-medium prose-code:before:content-none prose-code:after:content-none">
        <ReactMarkdown>{text}</ReactMarkdown>
      </div>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (s: string) => void }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center pt-10 text-center">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl text-accent-foreground"
        style={{ backgroundColor: "var(--color-accent)" }}
      >
        <Sparkles className="h-6 w-6" />
      </div>
      <h2 className="mt-5 text-xl font-semibold tracking-tight">Il tuo Coach personale</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Pianifica, analizza e ricevi consigli su misura. Il Coach conosce le tue ultime attività e il tuo obiettivo.
      </p>

      <div className="mt-8 grid w-full gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="rounded-xl border border-border bg-surface px-4 py-3 text-left text-sm transition-all hover:border-ring hover:shadow-card"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
