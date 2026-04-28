/**
 * GET    /api/admin/prices   — lista todos os overrides de preço activos
 * POST   /api/admin/prices   — define/actualiza um override de preço
 * DELETE /api/admin/prices   — remove um override de preço
 *
 * Persistência: Supabase tabela `platform_prices` (cold-start safe).
 */

import { NextRequest, NextResponse } from "next/server";
import { adminPriceStore } from "@/lib/admin-price-store";
import { requireAdmin } from "@/lib/admin-auth";
import { createServerClient, hasServiceRole } from "@/lib/supabase-server";

/** Carrega overrides do DB para o store em memória (uma só vez por processo). */
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
  const unauth = await requireAdmin(req);
  if (unauth) return unauth;

  await hydratePriceStore();
  return NextResponse.json({ success: true, prices: adminPriceStore.getAll() });
}

export async function POST(req: NextRequest) {
  const unauth = await requireAdmin(req);
  if (unauth) return unauth;

  try {
    const body = await req
      .json()
      .catch(() => ({}) as { assetId?: string; price?: number | string });
    const assetId = (body.assetId ?? "").toString().trim().toLowerCase();
    const rawPrice = body.price;
    const numericPrice =
      typeof rawPrice === "number"
        ? rawPrice
        : Number(String(rawPrice ?? "").replace(",", "."));

    if (!assetId || !Number.isFinite(numericPrice) || numericPrice <= 0) {
      return NextResponse.json(
        { error: "assetId e price válido são obrigatórios" },
        { status: 400 },
      );
    }
    adminPriceStore.set(assetId, numericPrice);

    // Persistir no Supabase (upsert)
    if (hasServiceRole()) {
      const sb = createServerClient();
      await sb
        .from("platform_prices")
        .upsert(
          {
            asset_id: assetId,
            price: numericPrice,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "asset_id" },
        );
    }

    return NextResponse.json({ success: true, assetId, price: numericPrice });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const unauth = await requireAdmin(req);
  if (unauth) return unauth;

  try {
    const { assetId } = await req.json();
    if (!assetId) {
      return NextResponse.json(
        { error: "assetId é obrigatório" },
        { status: 400 },
      );
    }
    adminPriceStore.delete(assetId);

    // Remover do Supabase
    if (hasServiceRole()) {
      const sb = createServerClient();
      await sb.from("platform_prices").delete().eq("asset_id", assetId);
    }

    return NextResponse.json({ success: true, assetId });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
