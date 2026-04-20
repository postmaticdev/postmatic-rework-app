// middleware.ts
import createMiddleware from "next-intl/middleware";

export default createMiddleware({
  locales: ["id", "en", "jp"],
  defaultLocale: "id",
});

export const config = {
  // "/" untuk auto-redirect, lainnya semua path ber-locale,
  // skip file statis & API agar tidak ikut diproses di Edge
  matcher: ["/", "/(id|en|jp)/((?!_next|.*\\..*|api|_vercel).*)"],
};
