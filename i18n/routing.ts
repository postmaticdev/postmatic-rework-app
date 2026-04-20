// i18n/routing.ts
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["id", "en", "jp"],
  defaultLocale: "id",
});

export type Locale = (typeof routing.locales)[number];
