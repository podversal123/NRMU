import { NextResponse, type NextRequest } from "next/server";

const locales = ["en", "hi"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`))) return;

  const saved = request.cookies.get("nrmu-lang")?.value;
  const lang = saved && locales.includes(saved) ? saved : "en";
  request.nextUrl.pathname = `/${lang}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
