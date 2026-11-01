import { useLocale, useTranslations } from "next-intl";
import { LANDING_PAGE_URL } from "@/constants";

// Halaman legal ada di landing page (postmatic.id), bukan di workspace.
const LEGAL_LINKS = [
  { path: "cookie-policy", key: "cookie" },
  { path: "data-deletion", key: "dataDeletion" },
  { path: "privacy-policy", key: "privacyPolicy" },
  { path: "terms-of-service", key: "termsOfService" },
] as const;

export function CheckoutFooter() {
  const t = useTranslations("checkout.footer");
  const locale = useLocale();
  const landingUrl = LANDING_PAGE_URL.replace(/\/$/, "");

  return (
    <div className="hidden lg:flex justify-center gap-x-2 mt-8 text-sm">
      {LEGAL_LINKS.map((link, index) => (
        <span key={link.path} className="flex gap-x-2">
          {index > 0 && (
            <span className="text-gray-800 dark:text-gray-300">·</span>
          )}
          <a
            href={`${landingUrl}/${locale}/${link.path}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-800 dark:text-gray-300 hover:underline"
          >
            {t(link.key)}
          </a>
        </span>
      ))}
    </div>
  );
}
