"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, ChevronDown, CreditCard, Plus, Users, Zap } from "lucide-react";
import { ProfileDropdown } from "./profile-dropdown";
import { NotificationDropdown } from "./notification-dropdown";
import { MobileMenu } from "../mobile-menu";
import Image from "next/image";
import {
  BUSINESS_SWITCHER_FILTER,
  businessService,
  useBusinessGetAll,
  useBusinessGetById,
} from "@/services/business.api";
import { isAxiosError } from "axios";
import { useBusinessKnowledgeGetById } from "@/services/knowledge.api";
import { useRouter, usePathname, Link } from "@/i18n/navigation";
import {
  useParams,
  useSearchParams,
} from "next/navigation";
import { useTokenGetTokenUsage } from "@/services/tier/token.api";
import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { LanguageToggle } from "../language-toggle";
import { useLocale, useTranslations } from "next-intl";
import { DEFAULT_BUSINESS_IMAGE } from "@/constants";
import { BusinessRes } from "@/models/api/business/index.type";
import { useRole } from "@/contexts/role-context";

function BusinessDropdownLogo({
  business,
  size,
  className,
  overrideImage,
}: {
  business: BusinessRes;
  size: string;
  className?: string;
  overrideImage?: string;
}) {
  const t = useTranslations("header");
  const knownLogo = overrideImage || business.logo;
  // GET /business/information (list) does not return the logo, so resolve it from the
  // business detail endpoint (primaryLogoUrl). Only runs while the dropdown is open
  // (this component is mounted inside the dropdown content) and is cached.
  const { data: detailData } = useQuery({
    queryKey: ["business", business.id],
    queryFn: () => businessService.getById(business.id),
    enabled: !knownLogo && Boolean(business.id),
    staleTime: 5 * 60_000,
  });
  const resolvedLogo = knownLogo || detailData?.data?.data?.logo;
  const businessImage = resolvedLogo || DEFAULT_BUSINESS_IMAGE;

  return (
    <Image
      src={businessImage}
      alt={t("businessLogoAlt", { name: business.name })}
      fill
      sizes={size}
      className={resolvedLogo ? className || "object-contain" : "object-cover"}
    />
  );
}

export function Header() {
  const t = useTranslations("header");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { businessId } = useParams() as { businessId?: string };
  const { access } = useRole();

  const { data: businessesData, isSuccess: isBusinessListLoaded } =
    useBusinessGetAll(BUSINESS_SWITCHER_FILTER);

  const { data: tokenUsageData, isLoading: isLoadingTokenUsage } =
    useTokenGetTokenUsage(businessId ?? "");

  const { data: businessKnowledgeData } = useBusinessKnowledgeGetById(businessId ?? "");
  const businessKnowledgeDetail = businessKnowledgeData?.data?.data;
  const currentBusinessImage = businessKnowledgeDetail?.primaryLogo || businessKnowledgeDetail?.secondaryLogo;

  // Tampilan token minimal 0 walaupun saldo sebenarnya minus (sama dengan menu mobile).
  const credits = Math.max(0, tokenUsageData?.data?.data?.availableToken ?? 0);

  const businesses = useMemo(
    () => businessesData?.data?.data ?? [],
    [businessesData?.data?.data]
  );

  // The dropdown list is limited, so validate/resolve the current business by id.
  const { data: currentBusinessDetailData, error: currentBusinessError } =
    useBusinessGetById(businessId ?? "");
  const currentBusinessDetail = currentBusinessDetailData?.data?.data;

  const currentBusiness = useMemo<BusinessRes | null>(
    () =>
      businesses.find((b) => b.id === businessId) ??
      (currentBusinessDetail && currentBusinessDetail.id === businessId
        ? currentBusinessDetail
        : null),
    [businesses, businessId, currentBusinessDetail]
  );

  const currentBusinessInvalid = useMemo(() => {
    if (!currentBusinessError || !isAxiosError(currentBusinessError)) {
      return false;
    }
    const status = currentBusinessError.response?.status;
    return status === 400 || status === 403 || status === 404;
  }, [currentBusinessError]);

  const otherBusinesses = useMemo(
    () => businesses.filter((business) => business.id !== currentBusiness?.id),
    [businesses, currentBusiness?.id]
  );

  // Pindah bisnis tetap di menu yang sama (settings, content-scheduler, ...),
  // tetapi segmen lebih dalam dan query dibuang karena menunjuk data bisnis
  // sebelumnya (id order, id post, flag OAuth). Hanya tab settings yang dibawa.
  const buildBusinessPath = (targetId: string) => {
    const segments = pathname.split("/").filter(Boolean);
    const section =
      segments[0] === "business" && businessId ? segments[2] : undefined;
    if (!section) return `/business/${targetId}`;

    const base = `/business/${targetId}/${section}`;
    const tab = section === "settings" ? searchParams.get("tab") : null;
    return tab ? `${base}?tab=${encodeURIComponent(tab)}` : base;
  };

  const buildSettingsPath = (
    targetBusinessId: string,
    tab: "overview" | "workspace" | "billing"
  ) => `/business/${targetBusinessId}/settings?tab=${tab}`;

  // Halaman ber-scope bisnis dengan id yang tidak valid (400/403/404), atau user
  // tidak punya bisnis sama sekali -> kembali ke halaman pilih bisnis. Daftar
  // yang gagal dimuat (jaringan/server) tidak dianggap "tidak punya bisnis".
  // Penanda per path supaya id tidak valid berikutnya tetap diarahkan.
  const redirectedPathRef = useRef<string | null>(null);
  useEffect(() => {
    if (!businessId) {
      redirectedPathRef.current = null;
      return;
    }
    if (redirectedPathRef.current === pathname) return;

    const hasNoBusiness = isBusinessListLoaded && businesses.length === 0;
    if (hasNoBusiness || currentBusinessInvalid) {
      redirectedPathRef.current = pathname;
      router.replace("/business");
    }
  }, [
    businessId,
    pathname,
    isBusinessListLoaded,
    businesses.length,
    currentBusinessInvalid,
    router,
  ]);

  const locale = useLocale();

  return (
    <header className="flex items-center justify-between w-full px-4 sm:px-6 py-2 bg-card border-b border-border fixed top-0 left-0 right-0 z-50">
      {/* Logo Section */}
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <Link href="/business" className="shrink-0 cursor-pointer">
          <Image
            src="/logoblue.png"
            alt="Postmatic"
            width={200}
            height={200}
            className="w-12 h-12"
          />
        </Link>
        <div className="flex min-w-0 items-center gap-1">
          {currentBusiness ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-auto min-h-10 md:min-h-0 min-w-0 max-w-full shrink justify-start p-0 text-base sm:text-lg font-bold text-foreground hover:text-foreground"
                >
                  <span className="truncate">{currentBusiness.name}</span>
                  <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <div className="w-64 p-2">
                  <div className="flex items-start gap-3 px-2 pb-2">
                    <div className="relative mt-0.5 h-9 w-9 shrink-0 overflow-hidden rounded-sm bg-muted">
                      <BusinessDropdownLogo
                        business={currentBusiness}
                        size="36px"
                        overrideImage={currentBusinessImage}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xl font-medium leading-6 text-foreground">
                        {currentBusiness.name}
                      </div>
                      <Link
                        href={buildSettingsPath(currentBusiness.id, "billing")}
                        className="block text-sm leading-4 text-blue-600 hover:text-blue-700"
                      >
                        {t("payAsYouGo")}
                      </Link>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <Link href={buildSettingsPath(currentBusiness.id, "overview")}>
                        <BarChart3 className="h-4 w-4 text-foreground" />
                        {t("overview")}
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <Link href={buildSettingsPath(currentBusiness.id, "workspace")}>
                        <Users className="h-4 w-4 text-foreground" />
                        {t("people")}
                      </Link>
                    </Button>
                  </div>

                  {otherBusinesses.length > 0 && (
                    <div className="-mx-2 mt-3 border-t border-border">
                      {otherBusinesses.map((business) => (
                        <Link
                          key={business.id}
                          href={buildBusinessPath(business.id)}
                          className="flex w-full border-b items-center  gap-3 p-2 text-left font-normal text-foreground outline-none transition-colors hover:bg-accent focus:bg-accent"
                          >
                          <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-sm bg-muted">
                            <BusinessDropdownLogo
                              business={business}
                              size="28px"
                            />
                          </span>
                          <span className="min-w-0 truncate">
                            {business.name}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}

                  <Button
                    asChild
                    size="sm"
                    className="mt-2 w-full justify-center bg-blue-600 font-normal text-white hover:bg-blue-700"
                  >
                    <Link href="/business/new-business">
                      <Plus className="h-4 w-4" />
                      {t("createWorkspace")}
                    </Link>
                  </Button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <span className="truncate text-base sm:text-lg font-bold text-foreground">
              Postmatic
            </span>
          )}
        </div>
        <div className="hidden md:block">
          <LanguageToggle />
        </div>
      </div>

      {/* User Section */}
      <div className="flex shrink-0 items-center gap-2">
        {businessId && (
          <div className="hidden md:flex items-center gap-2">
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1">
                {isLoadingTokenUsage ? (
                  <Skeleton className="h-4 w-12" />
                ) : (
                  <span className="text-sm font-bold">{credits.toLocaleString(locale)}</span>
                )}
                <Zap className="w-4 h-4 text-blue-500" strokeWidth={1.5} />
              </div>
            </div>
            {access.purchase.write && (
              <Link
                href={`/business/${businessId}/settings?tab=billing&topUp=token`}
                aria-label={t("topUpToken")}
                className="w-8 h-8 bg-primary rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors"
              >
                <CreditCard className="w-4 h-4 text-white" />
              </Link>
            )}
          </div>
        )}
        <div className="flex items-center gap-2">
          {/* Mobile Language Toggle (kanan, dekat burger) */}
          <div className="md:hidden">
            <LanguageToggle />
          </div>

          {/* Notifikasi desktop — di mobile dipindah ke dalam sidebar */}
          <NotificationDropdown
            businessId={businessId || currentBusiness?.id || businesses[0]?.id}
          />

          {/* Mobile Menu */}
          <MobileMenu />

          {/* Desktop Profile Dropdown */}
          <div className="hidden md:block">
            <ProfileDropdown />
          </div>
        </div>
      </div>
    </header>
  );
}
