import { NextResponse, type NextRequest } from "next/server";

const AUTH_COOKIE = "cv_auth";

function isAuthPath(pathname: string) {
  // Auth-only pages where logged-in users should be redirected away
  return (
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/verify-email") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password")
  );
}

export function middleware(request: NextRequest) {
  const { nextUrl, cookies } = request;
  const pathname = nextUrl.pathname;

  const hasSession = Boolean(cookies.get(AUTH_COOKIE)?.value);

  // Protect all non-auth pages (including "/")
  if (!hasSession && !isAuthPath(pathname)) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  if (isAuthPath(pathname) && hasSession) {
    return NextResponse.redirect(new URL("/me", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // run on all app routes except static files and api
  matcher: ["/((?!_next/static|_next/image|favicon.ico|assets|public|api).*)"],
};
