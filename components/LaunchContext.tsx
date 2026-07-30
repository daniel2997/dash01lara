"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { LANCAMENTO_PADRAO } from "@/lib/config";

interface DiaOp {
  dia: string;
  leads: number;
  compras: number;
}

interface LaunchCtx {
  lancamento: string;
  setLancamento: (l: string) => void;
  lancamentos: string[];
  dia: string | null;
  setDia: (d: string | null) => void;
  dias: DiaOp[];
  loading: boolean;
}

const Ctx = createContext<LaunchCtx>({
  lancamento: LANCAMENTO_PADRAO,
  setLancamento: () => {},
  lancamentos: [],
  dia: null,
  setDia: () => {},
  dias: [],
  loading: true,
});

export function LaunchProvider({ children }: { children: ReactNode }) {
  const [lancamento, setLancamentoState] = useState(LANCAMENTO_PADRAO);
  const [lancamentos, setLancamentos] = useState<string[]>([]);
  const [dia, setDiaState] = useState<string | null>(null);
  const [dias, setDias] = useState<DiaOp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("tl_lancamento");
    if (saved) setLancamentoState(saved);

    fetch("/api/lancamentos")
      .then((r) => r.json())
      .then((d) => setLancamentos(d.lancamentos || []))
      .catch(() => setLancamentos([]))
      .finally(() => setLoading(false));
  }, []);

  // Busca dias operacionais quando muda o lançamento
  useEffect(() => {
    fetch(`/api/dias?lancamento=${encodeURIComponent(lancamento)}`)
      .then((r) => r.json())
      .then((d) => setDias(d.dias || []))
      .catch(() => setDias([]));
  }, [lancamento]);

  const setLancamento = useCallback((l: string) => {
    setLancamentoState(l);
    setDiaState(null);
    localStorage.setItem("tl_lancamento", l);
  }, []);

  const setDia = useCallback((d: string | null) => {
    setDiaState(d);
  }, []);

  return (
    <Ctx.Provider value={{ lancamento, setLancamento, lancamentos, dia, setDia, dias, loading }}>
      {children}
    </Ctx.Provider>
  );
}

export const useLaunch = () => useContext(Ctx);
