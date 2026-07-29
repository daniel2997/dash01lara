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

interface LaunchCtx {
  lancamento: string;
  setLancamento: (l: string) => void;
  lancamentos: string[];
  loading: boolean;
}

const Ctx = createContext<LaunchCtx>({
  lancamento: LANCAMENTO_PADRAO,
  setLancamento: () => {},
  lancamentos: [],
  loading: true,
});

export function LaunchProvider({ children }: { children: ReactNode }) {
  const [lancamento, setLancamentoState] = useState(LANCAMENTO_PADRAO);
  const [lancamentos, setLancamentos] = useState<string[]>([]);
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

  const setLancamento = useCallback((l: string) => {
    setLancamentoState(l);
    localStorage.setItem("tl_lancamento", l);
  }, []);

  return (
    <Ctx.Provider value={{ lancamento, setLancamento, lancamentos, loading }}>
      {children}
    </Ctx.Provider>
  );
}

export const useLaunch = () => useContext(Ctx);
