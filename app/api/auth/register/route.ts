/**
 * POST /api/auth/register
 * Cria utilizador no Supabase Auth e insere manualmente profile + conta.
 * (Sem trigger - plano gratuito do Supabase nao suporta Auth Hooks)
 *
 * Schema real da BD:
 *   profiles:  id, name, email, country, phone, kyc_status, status, mode
 *   accounts:  id, user_id, balance, leverage, currency, total_deposited, total_withdrawn
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

async function ensureDefaultAccounts(
  sb: ReturnType<typeof createServerClient>,
  userId: string,
) {
  const { data: accounts } = await sb
    .from("accounts")
    .select("id, mode")
    .eq("user_id", userId);

  const rows = (accounts as { id: string; mode: string }[] | null) ?? [];
  const demo = rows.find((acc) => acc.mode === "demo");
  const real = rows.find((acc) => acc.mode === "real");

  if (demo) {
    await sb
      .from("accounts")
      .update({ balance: 100_000, leverage: 200 })
      .eq("id", demo.id);
  } else {
    await sb.from("accounts").insert({
      user_id: userId,
      mode: "demo",
      balance: 100_000,
      leverage: 200,
      currency: "USD",
    });
  }

  // Nunca sobrescrever conta real existente!
  if (!real) {
    await sb.from("accounts").insert({
      user_id: userId,
      mode: "real",
      balance: 0,
      leverage: 200,
      currency: "USD",
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, firstName, lastName, phone } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email e senha sao obrigatorios" },
        { status: 400 },
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Senha deve ter pelo menos 6 caracteres" },
        { status: 400 },
      );
    }

    const sb = createServerClient();

    // 1 - Criar utilizador no Supabase Auth
    const { data, error: authError } = await sb.auth.admin.createUser({
      email,
      password,
      user_metadata: { first_name: firstName ?? "", last_name: lastName ?? "" },
      email_confirm: true,
    });

    if (authError) {
      // Email já existe em auth.users mas pode ter sido removido da tabela profiles
      // (ex: admin apagou dados da BD mas não apagou o utilizador do Auth)
      const isEmailTaken = /already|email.*exist|user.*exist/i.test(
        authError.message,
      );
      if (isEmailTaken) {
        const { data: listData } = await sb.auth.admin.listUsers({
          perPage: 1000,
        });
        const existing = listData?.users?.find(
          (u) => u.email?.toLowerCase() === email.toLowerCase(),
        );
        if (existing) {
          const isUnconfirmed = !existing.email_confirmed_at;
          const { data: existingProfile } = await sb
            .from("profiles")
            .select("id")
            .eq("id", existing.id)
            .maybeSingle();

          if (isUnconfirmed || !existingProfile) {
            // Utilizador foi criado sem confirmação (pelo SDK supabase.auth.signUp())
            // OU o profile foi apagado — confirmar email e actualizar password
            await sb.auth.admin.updateUserById(existing.id, {
              password,
              email_confirm: true,
              user_metadata: {
                first_name: firstName ?? "",
                last_name: lastName ?? "",
              },
            });
            await sb.from("profiles").upsert(
              {
                id: existing.id,
                email,
                first_name: firstName ?? "",
                last_name: lastName ?? "",
                phone: phone ?? "",
                mode: "real",
              },
              { onConflict: "id" },
            );
            await ensureDefaultAccounts(sb, existing.id);
            return NextResponse.json({
              success: true,
              data: {
                userId: existing.id,
                email,
                firstName: firstName ?? "",
                lastName: lastName ?? "",
                accountType: "real",
                demoBalance: 100_000,
                realBalance: 0,
              },
            });
          }
        }
        return NextResponse.json(
          { success: false, error: "Este email já está em uso" },
          { status: 400 },
        );
      }
      return NextResponse.json(
        { success: false, error: authError.message },
        { status: 400 },
      );
    }

    const userId = data.user!.id;
    const fullName = [firstName, lastName].filter(Boolean).join(" ");

    // 2 - Inserir/actualizar profile com colunas correctas do schema
    const { error: profileError } = await sb.from("profiles").upsert(
      {
        id: userId,
        email,
        first_name: firstName ?? "",
        last_name: lastName ?? "",
        phone: phone ?? "",
        mode: "real",
      },
      { onConflict: "id" },
    );
    if (profileError)
      console.error("[register] profile:", profileError.message);

    // 3 - Criar/actualizar conta demo e garantir também conta real
    await ensureDefaultAccounts(sb, userId);

    // 4 - Fazer sign-in para obter sessão e devolver tokens ao cliente
    const { data: signInData } = await sb.auth.signInWithPassword({
      email,
      password,
    });

    const response = NextResponse.json({
      success: true,
      data: {
        userId,
        email,
        firstName: firstName ?? "",
        lastName: lastName ?? "",
        accountType: "real",
        demoBalance: 100_000,
        realBalance: 0,
        accessToken: signInData?.session?.access_token ?? null,
        refreshToken: signInData?.session?.refresh_token ?? null,
      },
    });

    // Cookie de sessão para API routes server-side
    if (signInData?.session?.access_token) {
      response.cookies.set("sb-access-token", signInData.session.access_token, {
        httpOnly: true,
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    }

    return response;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[register]", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
