"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { BarChart3, ChevronDown, Plus, Users, Zap } from "lucide-react";
import { ProfileDropdown } from "./profile-dropdown";
import { MobileMenu } from "../mobile-menu";
import Image from "next/image";
import { useBusinessGetAll } from "@/services/business.api";
import { useRouter, usePathname, Link } from "@/i18n/navigation";
import {
  useParams,
  useSearchParams,
} from "next/navigation";
import { useTokenGetTokenUsage } from "@/services/tier/token.api";
import { useEffect, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LanguageToggle } from "../language-toggle";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { businessId } = useParams() as { businessId?: string };

  const { data: businessesData, isLoading: isLoadingBusinesses } =
    useBusinessGetAll({
      limit: 40,
      sort: "asc",
      sortBy: "name",
    });

  // Panggil usage hanya kalau ada businessId (kalau hook-mu dukung options)
  const { data: tokenUsageData } = useTokenGetTokenUsage(businessId ?? "");

  const credits = tokenUsageData?.data?.data?.availableToken ?? 0;

  const businesses = useMemo(
    () => businessesData?.data?.data ?? [],
    [businessesData?.data?.data]
  );

  const currentBusiness = useMemo(
    () => businesses.find((b) => b.id === businessId) ?? null,
    [businesses, businessId]
  );

  const otherBusinesses = useMemo(
    () => businesses.filter((business) => business.id !== currentBusiness?.id),
    [businesses, currentBusiness?.id]
  );

  // Bangun path yang robust
  const buildBusinessPath = (targetId: string) => {
    const segments = pathname.split("?")[0].split("/").filter(Boolean);
    const i = segments.indexOf("business");

    if (i === -1) {
      return `/business/${targetId}`;
    }
    if (segments[i + 1]) {
      segments[i + 1] = targetId;
    } else {
      segments.splice(i + 1, 0, targetId);
    }

    const base = `/${segments.join("/")}`;
    const q = searchParams.toString();
    return q ? `${base}?${q}` : base;
  };

  const onBusinessChange = (targetBusinessId: string) => {
    queryClient.clear(); // bersihkan cache TanStack
    router.push(buildBusinessPath(targetBusinessId));
    router.refresh(); // <- aktifkan kalau perlu refetch RSC
  };

  const buildSettingsPath = (
    targetBusinessId: string,
    tab: "overview" | "workspace" | "billing"
  ) => `/business/${targetBusinessId}/settings?tab=${tab}`;

  // Cegah redirect otomatis saat di "/business" (tanpa id)
  // Redirect hanya ketika: path "/business/[id]" TAPI id tidak valid, atau tidak ada bisnis sama sekali.
  const redirectedRef = useRef(false);
  useEffect(() => {
    if (redirectedRef.current) return;
    if (isLoadingBusinesses) return;

    const hasBusinesses = businesses.length > 0;

    // Check if isNewBusiness=true is in the URL
    const isNewBusiness = searchParams.get("isNewBusiness") === "true";

    // Skip redirect if isNewBusiness=true
    if (isNewBusiness) return;

    // Kalau bukan halaman ber-scope bisnis, tidak usah apa-apa
    if (!pathname.startsWith("/business")) return;

    // Jika tepat di "/business" (tanpa id) -> JANGAN auto-redirect
    if (pathname === "/business") {
      // Kalau tidak ada bisnis sama sekali, tetap biarkan di halaman ini.
      return;
    }

    // Sampai sini: path dimulai "/business/..." (ada segmen setelah "business")
    // Jika tidak ada bisnis sama sekali -> arahkan ke halaman pilih bisnis
    if (!hasBusinesses) {
      redirectedRef.current = true;
      router.replace("/business");
      return;
    }

    // Jika ada businessId tapi tidak valid -> arahkan ke halaman pilih bisnis
    if (businessId && !businesses.some((b) => b.id === businessId)) {
      redirectedRef.current = true;
      router.replace("/business");
      return;
    }
    // Kalau valid, tidak melakukan apa-apa
  }, [
    isLoadingBusinesses,
    pathname,
    businessId,
    businesses,
    router,
    searchParams,
  ]);

  const locale = useLocale();

  return (
    <header className="flex items-center justify-between w-full px-4 sm:px-6 py-4 bg-card border-b border-border fixed top-0 left-0 right-0 z-50">
      {/* Logo Section */}
      <div className="flex items-center gap-2 sm:gap-3">
        <Link href="/" className="cursor-pointer">
          <Image
            src="/logoblue.png"
            alt="logol"
            width={200}
            height={200}
            className="w-12 h-12"
          />
        </Link>
        <div className="flex items-center gap-1">
          {currentBusiness && businesses.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-auto p-0 text-base sm:text-lg font-bold text-foreground hover:text-foreground"
                >
                  {currentBusiness.name}
                  <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <div className="w-64 p-2">
                  <div className="flex items-start gap-3 px-2 pb-2">
                    <div className="relative mt-0.5 h-9 w-9 shrink-0 overflow-hidden rounded-sm bg-muted">
                      <Image
                        src={currentBusiness.logo || "/logoblue.png"}
                        alt={`${currentBusiness.name} logo`}
                        fill
                        sizes="36px"
                        className="object-contain"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xl font-medium leading-6 text-foreground">
                        {currentBusiness.name}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            buildSettingsPath(currentBusiness.id, "billing")
                          )
                        }
                        className="block text-sm leading-4 text-blue-600 hover:text-blue-700"
                      >
                        Pay as you go
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        router.push(
                          buildSettingsPath(currentBusiness.id, "overview")
                        )
                      }
                     
                    >
                      <BarChart3 className="h-4 w-4 text-foreground" />
                      Overview
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        router.push(
                          buildSettingsPath(currentBusiness.id, "workspace")
                        )
                      }
                    >
                      <Users className="h-4 w-4 text-foreground" />
                      People
                    </Button>
                  </div>

                  {otherBusinesses.length > 0 && (
                    <div className="-mx-2 mt-3 border-t border-border">
                      {otherBusinesses.map((business) => (
                        <button
                          type="button"
                          key={business.id}
                          onClick={() => onBusinessChange(business.id)}
                          className={cn(
                            "flex w-full border-b items-center  gap-3 p-2 text-left font-normal text-foreground outline-none transition-colors hover:bg-accent focus:bg-accent",
                            currentBusiness.id === business.id && "bg-accent"
                          )}
                        >
                          <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-sm bg-muted">
                            <Image
                              src={business.logo || "/logoblue.png"}
                              alt={`${business.name} logo`}
                              fill
                              sizes="28px"
                              className="object-contain"
                            />
                          </span>
                          <span className="min-w-0 truncate">
                            {business.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  <Button
                    onClick={() => router.push("/business/new-business")}
                    className="mt-2 h-9 w-full justify-center rounded-md bg-blue-600 font-normal text-white hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4" />
                    Create Workspace
                  </Button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <span className="text-base sm:text-lg font-bold text-foreground">
              Postmatic
            </span>
          )}
        </div>
        <LanguageToggle />
      </div>

      {/* User Section */}
      <div className="flex items-center gap-2">
        {businessId && (
          <div className="hidden md:flex items-center gap-2">
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1">
                <span className="text-sm font-bold">{credits.toLocaleString(locale)}</span>
                <Zap className="w-4 h-4 text-blue-500" strokeWidth={1.5} />
              </div>
            </div>
            <Link
              href={`/business/${businessId}/pricing?tab=extraToken`}
              className="w-8 h-8 bg-primary rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4 text-white" />
            </Link>
          </div>
        )}
        <div className="flex items-center gap-2">
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
