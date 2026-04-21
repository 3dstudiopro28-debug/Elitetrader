import { NextRequest, NextResponse } from "next/server";
import {
  createServerClient,
  createUserClient,
  hasServiceRole,
} from "@/lib/supabase-server";
import { userPresenceStore } from "@/lib/user-presence-store";

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
      { success: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  try {
    const sb = createServerClient(token);
    const {
      data: { user },
      error,
    } = await sb.auth.getUser(token);

    if (error || !user) {
      return NextResponse.json(
        { success: false, error: "unauthorized" },
        { status: 401 },
      );
    }

    const body = (await req.json().catch(() => ({}))) as { action?: string };
    const action = body.action ?? "ping";
    const writeSb = hasServiceRole() ? createServerClient() : createUserClient(token);

    if (action === "offline") {
      userPresenceStore.markOffline(user.id);
      // Persistir "offline" no DB para refletir no CRM mesmo entre instâncias.
      await writeSb
        .from("profiles")
        .update({ updated_at: new Date(0).toISOString() })
        .eq("id", user.id);
      return NextResponse.json({ success: true, status: "offline" });
    }

    userPresenceStore.ping(user.id, user.email ?? undefined);
    // Persistir heartbeat online no DB.
    await writeSb
      .from("profiles")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", user.id);
    return NextResponse.json({ success: true, status: "online" });
  } catch {
    return NextResponse.json(
      { success: false, error: "internal" },
      { status: 500 },
    );
  }
}
