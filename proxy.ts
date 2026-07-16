import { NextResponse } from "next/server";
import { auth } from "@/auth";

const PROTECTED_PREFIXES = ["/consultor", "/admin"];
const AUTH_ONLY_ROUTES = ["/login", "/cadastro"];

// Checagem OTIMISTA apenas: só olha se existe uma sessão válida no cookie.
// Não decide papel (admin/consultor) nem status (aguardando/aprovado/suspenso)
// aqui de propósito — isso fica só no DAL (src/modules/auth/dal.ts), pra não
// duplicar regra de autorização em dois lugares que podem divergir com o tempo.
// Ver node_modules/next/dist/docs/01-app/02-guides/authentication.md#authorization.
export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthenticated = Boolean(req.auth);

  const isProtectedRoute = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );
  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthenticated && AUTH_ONLY_ROUTES.includes(pathname)) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
