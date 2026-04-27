"use client";

import { useState, useEffect } from "react";
import { priceStore } from "@/lib/price-store";

interface AssetInfo {
  id: string;
  marketSymbol?: string;
  basePrice: number;
}

export interface UseAlphaVantagePricesResult {
  prices: Record<string, number>;
  liveAssets: Set<string>;
}

/**
 * Hook central de preços — combina:
 *  1. Preços de simulação via priceStore (actualizado pelo header a cada ~2s)
 *  2. Preços reais da Alpha Vantage via /api/alpha-vantage-prices (uma vez por minuto)
 *
 * Nota: o plano free da Alpha Vantage permite apenas 25 req/dia.
 * O hook envia os assets em lotes de 5, com intervalo entre lotes.
 * A simulação é o feed principal; AV ancora os preços base.
 */
export function useAlphaVantagePrices(
  assets: AssetInfo[],
): UseAlphaVantagePricesResult {
  // Inicializar com priceStore (pode já ter preços da simulação) ou com basePrice
  const [prices, setPrices] = useState<Record<string, number>>(() => {
    const stored = priceStore.get();
    return Object.fromEntries(
      assets.map((a) => [a.id, stored[a.id] ?? a.basePrice]),
    );
  });

  const [liveAssets, setLiveAssets] = useState<Set<string>>(new Set());

  // ── 1. Subscrever ao priceStore (simulação + overrides admin) ──────────────
  useEffect(() => {
    const unsub = priceStore.subscribe((storePrices) => {
      setPrices((prev) => {
        const next = { ...prev };
        let changed = false;
        for (const [id, price] of Object.entries(storePrices)) {
          if (typeof price === "number" && price > 0 && next[id] !== price) {
            next[id] = price;
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    });
    return unsub;
  }, []);

  // ── 2. Buscar preços reais da Alpha Vantage em background ─────────────────
  useEffect(() => {
    const assetsWithSym = assets.filter((a) => !!a.marketSymbol);
    if (!assetsWithSym.length) return;

    // Mapa: marketSymbol → asset id
    const symToId: Record<string, string> = {};
    for (const a of assetsWithSym) {
      if (a.marketSymbol) symToId[a.marketSymbol] = a.id;
    }

    const allSyms = Object.keys(symToId);
    let cancelled = false;
    const BATCH_SIZE = 5;

    async function fetchBatch(syms: string[]): Promise<void> {
      try {
        const res = await fetch(
          `/api/alpha-vantage-prices?symbols=${encodeURIComponent(syms.join(","))}`,
          { cache: "no-store" },
        );
        if (!res.ok || cancelled) return;

        const data = await res.json();
        const newPrices: Record<string, number> = {};
        const newLiveIds: string[] = [];

        for (const [sym, price] of Object.entries(
          (data.prices ?? {}) as Record<string, unknown>,
        )) {
          if (typeof price === "number" && price > 0 && symToId[sym]) {
            const id = symToId[sym];
            newPrices[id] = price;
            newLiveIds.push(id);
          }
        }

        if (!cancelled && Object.keys(newPrices).length) {
          priceStore.set(newPrices);
          setLiveAssets((prev) => new Set([...prev, ...newLiveIds]));
        }
      } catch {
        // Silencioso — a simulação toma conta
      }
    }

    async function runAll(): Promise<void> {
      for (let i = 0; i < allSyms.length && !cancelled; i += BATCH_SIZE) {
        await fetchBatch(allSyms.slice(i, i + BATCH_SIZE));
        // Aguardar entre lotes para não exceder o rate limit
        if (i + BATCH_SIZE < allSyms.length && !cancelled) {
          await new Promise<void>((r) => setTimeout(r, 2000));
        }
      }
    }

    // Fetch inicial e polling a cada 60s
    runAll();
    const interval = setInterval(runAll, 60_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { prices, liveAssets };
}
