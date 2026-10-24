"use client";

import { Header } from "@/components/base/header";
import { Sidebar } from "@/components/sidebar";
import { EnterToNextField } from "@/components/enter-to-next-field";
import { cn } from "@/lib/utils";
import { useParams } from "next/navigation";
import { usePathname } from "@/i18n/navigation";

const SKIP_HEADER_PATHS = [
  "/",
  "/business/[businessId]/pricing/checkout",
  "/business/new-business",
  "/business/new-business/manual",
  "/business/new-business/website",
];

const CHECKOUT_PATTERN = "/business/[businessId]/pricing/checkout";

// hapus prefix locale seperti /id atau /en
function stripLocalePrefix(p: string) {
  return p.replace(/^\/(id|en)(?=\/|$)/, "");
}

export default function BusinessClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const rawPathname = usePathname();
  const pathname = stripLocalePrefix(rawPathname || "");
  const params = useParams() as { businessId?: string };
  const businessId = params?.businessId;

  const matchPattern = (pattern: string) => {
    if (pattern.includes("[businessId]")) {
      const re = new RegExp("^" + pattern.replace("[businessId]", "[^/]+") + "$");
      return re.test(pathname);
    }
    return pathname === pattern;
  };

  const applyBusinessId = (pattern: string) =>
    pattern.replace("[businessId]", businessId ?? "");

  const pathEquals = (pattern: string) =>
    businessId ? pathname === applyBusinessId(pattern) : matchPattern(pattern);




  const isCheckoutPath = (() => {
    const base = businessId
      ? CHECKOUT_PATTERN.replace("[businessId]", businessId)
      : "/business/[^/]+/pricing/checkout";
    const re = businessId
      ? new RegExp("^" + base + "(?:/[^/]+)?$") // checkout atau checkout/<something>
      : new RegExp("^" + base + "(?:/[^/]+)?$");
    return re.test(pathname);
  })();

  const isSkipHeader = SKIP_HEADER_PATHS.some(pathEquals);
  // Menu sidebar selalu menuju /business/{id}/..., jadi hanya tampil di halaman
  // yang punya businessId (bukan /, /business, /profile/*, new-business).
  const isSkipSidebar = isCheckoutPath || !businessId;
  // Header:
  // - Checkout: tampilkan di mobile saja (md:hidden)
  // - Selain checkout: tampilkan normal jika tidak di-skip
  const headerNode = isCheckoutPath ? (
    <div className="md:hidden">
      <Header />
    </div>
  ) : !isSkipHeader ? (
    <Header />
  ) : null;

  // Margin konten:
  // - Checkout: header hanya di mobile -> beri mt-22 di mobile, hilangkan di md+
  // - Selain itu: jika header tampil, mt-22; kalau tidak, tanpa margin
  const headerMarginClass = isCheckoutPath
    ? "mt-18 md:mt-0"
    : isSkipHeader
      ? ""
      : "mt-18";

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <EnterToNextField />
      {headerNode}
      <div
        className={cn(
          "flex flex-1",
          headerMarginClass,
          isSkipSidebar ? "" : "md:ml-16"
        )}
      >
        {!isSkipSidebar && <Sidebar />}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
