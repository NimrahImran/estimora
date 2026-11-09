"use client";
import { useCallback, useEffect, useState } from "react";
export function useApi<T>(url: string) {
  const [state, set] = useState<{ data: T | null; error: string | null; loading: boolean }>({ data: null, error: null, loading: true });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    set((s) => ({ ...s, loading: true, error: null }));
    fetch(url, { signal: c.signal }).then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error ?? "Request failed"); set({ data: j, error: null, loading: false }); })
      .catch((e) => { if (e.name !== "AbortError") set({ data: null, error: e.message || "Couldn't load the data.", loading: false }); });
    return () => c.abort();
  }, [url, tick]);
  return { ...state, retry: useCallback(() => setTick((t) => t + 1), []) };
}
