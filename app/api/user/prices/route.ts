/**
 * GET /api/user/prices
 *
 * Retorna os overrides de preço activos definidos pelo admin.
 * Carrega do Supabase em cold start (persistência cross-deploy).
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient, hasServiceRole } from "@/lib/supabase-server";
import { adminPriceStore } from "@/lib/admin-price-store";

function getAccessToken(req: NextRequest): string | null {
  const cookie = req.cookies.get("sb-access-token")?.value;
  if (cookie) return cookie;
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

/** Carrega overrides do DB para o store em memória (cold-start safe). */
async function hydratePriceStore() {
  if (!hasServiceRole()) return;
  if (Object.keys(adminPriceStore.getAll()).length > 0) return; // já hidratado
  const sb = createServerClient();
  const { data } = await sb.from("platform_prices").select("asset_id, price");
  if (data) {
    for (const row of data) {
      adminPriceStore.set(row.asset_id, Number(row.price));
    }
  }
}

export async function GET(req: NextRequest) {
  const token = getAccessToken(req);
  if (!token) {
    return NextResponse.json({ prices: {} });
  }

  try {
    const sb = createServerClient(token);
    const {
      data: { user },
      error,
    } = await sb.auth.getUser(token);
    if (error || !user) {
      return NextResponse.json({ prices: {} });
    }

    await hydratePriceStore();
    return NextResponse.json({ prices: adminPriceStore.getAll() });
  } catch {
    return NextResponse.json({ prices: {} });
  }
}
