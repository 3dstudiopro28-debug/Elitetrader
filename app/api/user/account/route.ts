/**
 * DELETE /api/user/account
 * O utilizador elimina a sua própria conta.
 * Requer autenticação — remove o utilizador do Supabase Auth (cascade apaga profiles + accounts).
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient, hasServiceRole } from "@/lib/supabase-server";

function getAccessToken(req: NextRequest): string | null {
  const cookie = req.cookies.get("sb-access-token")?.value;
  if (cookie) return cookie;
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

export async function DELETE(req: NextRequest) {
  const token = getAccessToken(req);
  if (!token) {
    return NextResponse.json(
      { success: false, error: "Não autenticado" },
      { status: 401 },
    );
  }

  try {
    const sb = createServerClient();
    const {
      data: { user },
      error: authErr,
    } = await sb.auth.getUser(token);
    if (authErr || !user) {
      return NextResponse.json(
        { success: false, error: "Token inválido" },
        { status: 401 },
      );
    }

    if (!hasServiceRole()) {
      // Sem service role: apenas apagar o perfil (sem apagar da Auth)
      await sb.from("profiles").delete().eq("id", user.id);
      return NextResponse.json({ success: true, partial: true });
    }

    // Com service role: apagar completamente da Auth (cascade apaga profiles + accounts)
    const { error } = await sb.auth.admin.deleteUser(user.id);
    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[user/account DELETE]", err);
    return NextResponse.json(
      { success: false, error: "Erro interno" },
      { status: 500 },
    );
  }
}
