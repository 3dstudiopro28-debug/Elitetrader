import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

// Salva override de saldo/margem para um usuário
export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const { user_id, balance_override, margin_override } = await req.json();
  if (!user_id)
    return NextResponse.json({ error: "user_id obrigatório" }, { status: 400 });

  const { error } = await supabase.from("admin_overrides").upsert({
    user_id,
    balance_override,
    margin_override,
    updated_at: new Date().toISOString(),
  });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// Busca override de saldo/margem para um usuário
export async function GET(req: NextRequest) {
  const supabase = createServerClient();
  const { searchParams } = new URL(req.url);
  const user_id = searchParams.get("user_id");
  if (!user_id)
    return NextResponse.json({ error: "user_id obrigatório" }, { status: 400 });

  const { data, error } = await supabase
    .from("admin_overrides")
    .select("balance_override, margin_override")
    .eq("user_id", user_id)
    .single();

  if (error && error.code !== "PGRST116")
    // not found
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ override: data || null });
}
