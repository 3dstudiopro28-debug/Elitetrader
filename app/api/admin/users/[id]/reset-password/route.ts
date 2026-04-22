/**
 * POST /api/admin/users/[id]/reset-password
 * Define uma senha temporária para o utilizador e activa o flag force_password_change.
 * Apenas admin autorizado (x-admin-token).
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient, hasServiceRole } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/admin-auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauth = requireAdmin(req)
  if (unauth) return unauth

  const { id } = await params;

  if (!hasServiceRole()) {
    return NextResponse.json(
      {
        error: "Service role não configurado. Não é possível redefinir senhas.",
      },
      { status: 503 },
    );
  }

  try {
    const body = await req.json();
    const { password } = body as { password: string };

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "A senha deve ter pelo menos 6 caracteres." },
        { status: 400 },
      );
    }

    const sb = createServerClient();

    // Definir nova senha via Supabase Admin API
    const { error: authErr } = await sb.auth.admin.updateUserById(id, {
      password,
    });
    if (authErr) {
      return NextResponse.json({ error: authErr.message }, { status: 400 });
    }

    // Marcar perfil para forçar mudança de senha no próximo login
    await sb
      .from("profiles")
      .update({
        force_password_change: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/reset-password]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
