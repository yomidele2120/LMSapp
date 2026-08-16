import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/signup", "/reset-password", "/auth/callback"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Every request runs through here — a missing env var used to crash with
  // an opaque MIDDLEWARE_INVOCATION_FAILED and no hint why. Fail loud and
  // specific in the Vercel function logs instead, since the alternative
  // (silently letting requests through unauthenticated) is worse.
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      "[middleware] Missing NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Set both in Vercel → Project Settings → Environment Variables, then redeploy " +
        "(adding env vars does not retroactively apply to an existing deployment)."
    );
    return new NextResponse("Server misconfigured — missing Supabase environment variables.", {
      status: 500,
    });
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refresh the session if expired — required for Server Components to see
  // an up-to-date session, per Supabase's SSR auth pattern.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", path);
    return NextResponse.redirect(url);
  }

  // Role lives in auth user_metadata (set at signup / client invite) so this
  // check costs nothing extra — no DB round trip in the hot path.
  const role = user?.user_metadata?.role as string | undefined;
  const isClient = role === "client";
  const landingPath = isClient ? "/portal" : "/dashboard";

  if (user && (path === "/login" || path === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = landingPath;
    return NextResponse.redirect(url);
  }

  // Keep the two experiences separate: a client shouldn't land in the firm
  // dashboard, and staff shouldn't land in the client-facing portal.
  if (user && isClient && path.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/portal";
    return NextResponse.redirect(url);
  }
  if (user && !isClient && path.startsWith("/portal")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Run on everything except static assets and Next internals.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)",
  ],
};
