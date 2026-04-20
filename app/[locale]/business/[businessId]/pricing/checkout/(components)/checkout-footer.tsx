import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";


export function CheckoutFooter() {
  const  t  = useTranslations("checkout.footer");
  return (
    <div className="hidden lg:flex justify-center gap-x-2 mt-8 text-sm">
      <Link href="/kebijakan-cookie" className="text-gray-800 dark:text-gray-300 hover:underline">
        {t("cookie")}
      </Link>
      <span className="text-gray-800 dark:text-gray-300">·</span>
      <Link href="/penghapusan-data" className="text-gray-800 dark:text-gray-300 hover:underline">
        {t("dataDeletion")}
      </Link>
      <span className="text-gray-800 dark:text-gray-300">·</span>
      <Link href="/kebijakan-privasi" className="text-gray-800 dark:text-gray-300 hover:underline">
        {t("privacyPolicy")}
      </Link>
      <span className="text-gray-800 dark:text-gray-300">·</span>
      <Link href="/syarat-layanan" className="text-gray-800 dark:text-gray-300 hover:underline">
        {t("termsOfService")}
      </Link>
    </div>
  );
}
