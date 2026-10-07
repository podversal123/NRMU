import { NextResponse, type NextRequest } from "next/server";

const locales = ["en", "hi"];

/**
 * - Paths already under /en or /hi pass through.
 * - "/" goes to the visitor's language.
 * - Any other path (old WordPress addresses such as /2016/06/26/post-name/, /category/..., /delhi-division/,
 *   or an address typed without a language) is sent to the legacy resolver, which redirects to the new address.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`))) return;

  const saved = request.cookies.get("nrmu-lang")?.value;
  const lang = saved && locales.includes(saved) ? saved : "en";

  if (pathname === "/") {
    request.nextUrl.pathname = `/${lang}`;
    return NextResponse.redirect(request.nextUrl);
  }
  const url = request.nextUrl.clone();
  url.pathname = `/legacy${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next|api|admin|legacy|.*\\..*).*)"],
};
