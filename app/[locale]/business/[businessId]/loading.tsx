import { useTranslations } from "next-intl";
import { LogoLoader } from "@/components/base/logo-loader";

// Tampil seketika saat pindah menu bisnis (header & sidebar tetap di tempat).
// Batas loading ini juga membuat Next.js bisa prefetch route dinamis
// /business/[businessId]/... dari Link sidebar.
export default function BusinessLoading() {
  const t = useTranslations("welcomeSection");

  return (
    <div
      className="flex min-h-[60dvh] items-center justify-center"
      role="status"
      aria-live="polite"
    >
      <LogoLoader size={56} strokeWidth={28} label={t("loading")} />
    </div>
  );
}
