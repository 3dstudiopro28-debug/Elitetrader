import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options) {
          req.cookies.set({ name, value, ...options });
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options) {
          req.cookies.set({ name, value: "", ...options });
          res.cookies.set({ name, value: "", ...options });
        },
      },
    },
  );

  // Refresca o token de acesso automaticamente se estiver expirado.
  // O @supabase/ssr gere os seus próprios cookies internos (sb-<ref>-auth-token).
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Propagar o access_token (possivelmente renovado) para o cookie customizado
  // que todas as nossas API routes leem: sb-access-token
  if (session?.access_token) {
    const currentCustomCookie = req.cookies.get("sb-access-token")?.value;
    if (currentCustomCookie !== session.access_token) {
      res.cookies.set("sb-access-token", session.access_token, {
        httpOnly: true,
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    }
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
