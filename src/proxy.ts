import { NextResponse, type NextRequest } from "next/server";
import { appConfig } from "@/config/app";
import { verifySessionToken } from "@/lib/session";

/**
 * Route protection.
 *
 * Next.js 16 renamed the `middleware` convention to `proxy`. This runs on the
 * Node.js runtime before a request is rendered.
 *
 * The proxy is an early filter, not the security boundary: every server action
 * re-verifies the session itself, because a Server Function is a POST to the
 * route it belongs to and must never rely on this file alone.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const token = request.cookies.get(appConfig.sessionCookieName)?.value;
  const session = verifySessionToken(
    token,
    process.env.SESSION_SECRET ?? "",
  );

  const isLoginRoute = pathname === "/login";

  if (!session && !isLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(`${pathname}${search}`)}`;
    return NextResponse.redirect(url);
  }

  if (session && isLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Everything except Next.js internals and static files.
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|webmanifest)$).*)",
  ],
};
