import { useMemo, useState } from "react";
import { SPORTS } from "@/lib/sports";

export function useActiveSports(attivitaSports: string[]) {
  const sportPraticati = useMemo(() => {
    const presenti = new Set(attivitaSports.filter(Boolean));
    return SPORTS.filter((s) => presenti.has(s.key)).map((s) => s.key);
  }, [attivitaSports]);

  const [attivi, setAttivi] = useState<string[]>([]);

  const filtroAttivo = attivi.length > 0 ? attivi : sportPraticati;
  const tuttiSelezionati = attivi.length === 0;

  function toggleSport(key: string) {
    setAttivi((prev) => {
      if (prev.includes(key)) {
        const next = prev.filter((k) => k !== key);
        return next.length === 0 ? [] : next;
      }
      return [...prev, key];
    });
  }

  function selezionaTutti() {
    setAttivi([]);
  }

  return { sportPraticati, filtroAttivo, attivi, tuttiSelezionati, toggleSport, selezionaTutti };
}
