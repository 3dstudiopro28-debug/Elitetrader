/**
 * POST /api/user/positions/sync
 * Sincroniza contadores de posições locais (localStorage) com o perfil no DB.
 * Chamado pelo dashboard do cliente em background.
 *
 * Body: { openCount: number, closedCount: number, totalPnl: number }
 */

import { NextRequest, NextResponse } from "next/server";
import {
  createServerClient,
  createUserClient,
  hasServiceRole,
} from "@/lib/supabase-server";

function getAccessToken(req: NextRequest): string | null {
  const cookie = req.cookies.get("sb-access-token")?.value;
  if (cookie) return cookie;
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

export async function POST(req: NextRequest) {
  const token = getAccessToken(req);
  if (!token) {
    return NextResponse.json(
      { success: false, error: "Não autenticado" },
      { status: 401 },
    );
  }

  try {
    const authSb = createServerClient();
    const {
      data: { user },
      error: authErr,
    } = await authSb.auth.getUser(token);
    if (authErr || !user) {
      return NextResponse.json(
        { success: false, error: "Token inválido" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const openCount =
      typeof body.openCount === "number"
        ? Math.max(0, Math.floor(body.openCount))
        : 0;
    const closedCount =
      typeof body.closedCount === "number"
        ? Math.max(0, Math.floor(body.closedCount))
        : 0;
    const totalPnl = typeof body.totalPnl === "number" ? body.totalPnl : 0;

    const sb = hasServiceRole() ? authSb : createUserClient(token);

    await sb
      .from("profiles")
      .update({
        open_positions: openCount,
        closed_positions: closedCount,
        total_pnl: totalPnl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[positions/sync]", err);
    // Best-effort — não bloquear o cliente em caso de erro
    return NextResponse.json(
      { success: false, error: "Erro ao sincronizar" },
      { status: 500 },
    );
  }
}
