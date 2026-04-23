/**
 * GET /api/positions?status=open|closed|all  (default: all)
 * Retorna todas as posições do utilizador autenticado.
 * Útil para sincronização cross-device no arranque do dashboard.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

function getAccessToken(req: NextRequest): string | null {
  const cookie = req.cookies.get("sb-access-token")?.value;
  if (cookie) return cookie;
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

export async function GET(req: NextRequest) {
  console.log("PASSO A: [BACKEND] A API GET /api/positions foi chamada.");
  const token = getAccessToken(req);
  if (!token) return NextResponse.json({ success: true, data: [] });

  try {
    const sb = createServerClient(token);
    const {
      data: { user },
      error: authErr,
    } = await sb.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ success: true, data: [] });

    const status = req.nextUrl.searchParams.get("status") ?? "all";

    let query = sb
      .from("positions")
      .select("*")
      .eq("user_id", user.id)
      .order("opened_at", { ascending: false });

    if (status === "open") {
      query = query.eq("status", "open");
    } else if (status === "closed") {
      query = query.eq("status", "closed").limit(500);
    }

    const { data: positions, error } = await query;
    if (error) {
      console.error("[GET /api/positions] DB error:", error.message);
      return NextResponse.json({ success: true, data: [] });
    }

    console.log(
      `PASSO B: [BACKEND] A consulta à base de dados encontrou ${positions?.length ?? 0} posições.`,
    );
    return NextResponse.json({ success: true, data: positions ?? [] });
  } catch {
    return NextResponse.json({ success: true, data: [] });
  }
}
