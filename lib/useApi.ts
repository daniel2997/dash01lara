"use client";

import { useEffect, useState } from "react";
import { useLaunch } from "@/components/LaunchContext";

/** Busca uma rota /api passando o lançamento selecionado como query. */
export function useApi<T>(path: string) {
  const { lancamento, dia } = useLaunch();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let ativo = true;
    setLoading(true);
    setError(false);

    let url = `${path}${path.includes("?") ? "&" : "?"}lancamento=${encodeURIComponent(
      lancamento
    )}`;
    if (dia) url += `&dia=${encodeURIComponent(dia)}`;

    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((d) => ativo && setData(d))
      .catch(() => ativo && setError(true))
      .finally(() => ativo && setLoading(false));

    return () => {
      ativo = false;
    };
  }, [path, lancamento, dia]);

  return { data, loading, error };
}
