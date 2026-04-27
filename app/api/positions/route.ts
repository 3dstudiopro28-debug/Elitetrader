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

function isMissingModeColumn(err: unknown): boolean {
  const msg =
    typeof err === "object" && err && "message" in err
      ? String((err as { message?: unknown }).message ?? "")
      : "";
  const code =
    typeof err === "object" && err && "code" in err
      ? String((err as { code?: unknown }).code ?? "")
      : "";
  return code === "42703" || /column .*mode|mode does not exist/i.test(msg);
}

export async function GET(req: NextRequest) {
  console.log("API GET /api/positions: Pedido recebido.");

  const token = getAccessToken(req);
  if (!token) {
    console.error(
      "API GET /api/positions: Token não encontrado nos cookies nem no header Authorization.",
    );
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  console.log(
    "API GET /api/positions: Token encontrado, a validar utilizador...",
  );

  try {
    const sb = createServerClient(token);
    const {
      data: { user },
      error: authErr,
    } = await sb.auth.getUser(token);

    if (authErr || !user) {
      console.error(
        "API GET /api/positions: Erro ao obter utilizador ou utilizador não autenticado.",
        authErr,
      );
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    console.log(
      `API GET /api/positions: A procurar posições para o user_id: ${user.id}`,
    );

    const status = req.nextUrl.searchParams.get("status") ?? "all";
    const mode = req.nextUrl.searchParams.get("mode");
    console.log(
      `API GET /api/positions: Parâmetro status recebido: "${status}"`,
    );
    if (mode) {
      console.log(`API GET /api/positions: Parâmetro mode recebido: "${mode}"`);
    }

    const buildBaseQuery = () => {
      let query = sb
        .from("positions")
        .select("*")
        .eq("user_id", user.id)
        .order("opened_at", { ascending: false });

      if (status === "open") {
        query = query.eq("status", "open");
        console.log("API GET /api/positions: A aplicar filtro status = 'open'");
      } else if (status === "closed") {
        query = query.eq("status", "closed").limit(500);
        console.log(
          "API GET /api/positions: A aplicar filtro status = 'closed'",
        );
      } else {
        console.log(
          "API GET /api/positions: Sem filtro de status (retorna todas).",
        );
      }

      return query;
    };

    let query = buildBaseQuery();

    if (mode === "demo" || mode === "real") {
      query = query.eq("mode", mode);
      console.log(`API GET /api/positions: A aplicar filtro mode = '${mode}'`);
    }

    let { data: positions, error } = await query;

    if (
      error &&
      (mode === "demo" || mode === "real") &&
      isMissingModeColumn(error)
    ) {
      console.warn(
        "API GET /api/positions: coluna mode ausente em positions, a usar fallback sem filtro de modo.",
      );
      const fallback = await buildBaseQuery();
      positions = fallback.data;
      error = fallback.error;
    }

    if (error) {
      console.error(
        "API GET /api/positions: Erro na consulta à base de dados:",
        error,
      );
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(
      `API GET /api/positions: A consulta retornou ${positions?.length ?? 0} linhas.`,
    );
    console.log("API GET /api/positions: Dados retornados:", positions);

    return NextResponse.json({ success: true, data: positions ?? [] });
  } catch (err) {
    console.error("API GET /api/positions: Erro inesperado:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
