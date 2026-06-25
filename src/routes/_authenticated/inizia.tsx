import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Play, Timer, MapPin } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SPORTS, type SportKey, sportInfo } from "@/lib/sports";

export const Route = createFileRoute("/_authenticated/inizia")({
  ssr: false,
  component: IniziaPage,
});

function IniziaPage() {
  const [sport, setSport] = useState<SportKey>("corsa");
  const info = sportInfo(sport);

  return (
    <AppShell>
      <header className="pt-7 pb-5 animate-fade-up">
        <p className="label-caps" style={{ color: "var(--color-accent)" }}>Nuova sessione</p>
        <h1 className="mt-1 font-display text-4xl tracking-wider uppercase">Inizia</h1>
        <p className="mt-2 text-sm" style={{ color: "#8E8E93" }}>
          Scegli lo sport. Il coach adatterà target e metriche in tempo reale.
        </p>
      </header>

      {/* Sport grid */}
      <div className="grid grid-cols-2 gap-3 pb-6">
        {SPORTS.map((s) => {
          const Icon = s.icon;
          const active = s.key === sport;
          return (
            <button
              key={s.key}
              onClick={() => setSport(s.key)}
              className="flex aspect-square flex-col items-center justify-center gap-3 rounded-2xl p-5 transition-all duration-200"
              style={{
                background: active ? `${s.color}1A` : "#111111",
                border: `1px solid ${active ? s.color : "#2A2A2A"}`,
                boxShadow: active ? `0 0 24px ${s.color}40` : "none",
              }}
            >
              <span
                className="flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{
                  background: active ? s.color : "#1A1A1A",
                }}
              >
                <Icon size={22} strokeWidth={2.5} color="white" />
              </span>
              <span
                className="font-display text-base tracking-widest uppercase"
                style={{ color: active ? "white" : "#8E8E93" }}
              >
                {s.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Preview */}
      <div
        className="rounded-3xl p-6"
        style={{
          background: `linear-gradient(155deg, ${info.color}22 0%, #111111 55%, #0F0F0F 100%)`,
          border: `1px solid ${info.color}40`,
        }}
      >
        <p className="label-caps" style={{ color: info.color }}>Sessione libera</p>
        <h2 className="mt-2 font-display text-3xl tracking-wider uppercase">{info.label}</h2>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <PreviewMetric icon={<Timer size={14} />} label="Tempo" value="LIVE" />
          <PreviewMetric icon={<MapPin size={14} />} label="GPS" value="ON" />
        </div>

        <button
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-white animate-pulse-glow"
          style={{ background: info.color }}
        >
          <Play size={20} strokeWidth={3} fill="white" />
          <span className="font-display text-lg tracking-[0.2em] uppercase">Start</span>
        </button>
      </div>

      <div className="h-10" />
    </AppShell>
  );
}

function PreviewMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: "rgba(0,0,0,0.35)", border: "1px solid #1F1F1F" }}>
      <div className="flex items-center gap-1.5" style={{ color: "#8E8E93" }}>
        {icon}
        <span className="label-caps">{label}</span>
      </div>
      <p className="metric-num mt-2 text-2xl">{value}</p>
    </div>
  );
}
