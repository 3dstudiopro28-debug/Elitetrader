/**
 * GET    /api/admin/prices   — lista todos os overrides de preço activos
 * POST   /api/admin/prices   — define/actualiza um override de preço
 * DELETE /api/admin/prices   — remove um override de preço
 *
 * Actualmente suporta apenas XAUUSD.
 * Autenticação: x-admin-token (igual aos outros endpoints admin).
 */

import { NextRequest, NextResponse } from "next/server";
import { adminPriceStore } from "@/lib/admin-price-store";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  const unauth = requireAdmin(req);
  if (unauth) return unauth;

  return NextResponse.json({ success: true, prices: adminPriceStore.getAll() });
}

export async function POST(req: NextRequest) {
  const unauth = requireAdmin(req);
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
    return NextResponse.json({ success: true, assetId, price: numericPrice });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const unauth = requireAdmin(req);
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
    return NextResponse.json({ success: true, assetId });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
