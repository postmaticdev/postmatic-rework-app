"use client";

import { getMemberRoleLabel } from "@/helper/member-role";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useParams } from "next/navigation";

import { useTheme } from "next-themes";
import {
  BookOpen,
  CalendarClock,
  Settings,
  Menu,
  X,
  LogOut,
  CreditCard,
  AlertTriangle,
  Sun,
  Moon,
  Zap,
  Bell,
  ChevronRight,
} from "lucide-react";
import { useNotification } from "@/contexts/notification-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useAuthProfileGetProfile,
  useAuthProfileLogout,
  useAuthProfileGetCurrentSession,
} from "@/services/auth.api";
import { DEFAULT_USER_AVATAR } from "@/constants";
import { logoutAndRedirect } from "@/config/api";
import { showLogoutOverlay } from "@/lib/logout-overlay";
import { useBusinessGetAll } from "@/services/business.api";
import { showToast } from "@/helper/show-toast";
import { useLocale, useTranslations } from "next-intl";
import { useTokenGetTokenUsage } from "@/services/tier/token.api";
import { useSubscribtionGetSubscription } from "@/services/tier/subscribtion.api";
import { useDateFormat } from "@/hooks/use-date-format";
import { ReportIssueModal } from "@/components/report-issue-modal";
import { useRole } from "@/contexts/role-context";

export function MobileMenu() {
  const router = useRouter();
  const { access } = useRole();
  const pathname = usePathname();
  const { formatDate } = useDateFormat();
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(theme === "dark");
  const { data: profileData } = useAuthProfileGetProfile();
  const profile = profileData?.data?.data;
  const { data: businessesData } = useBusinessGetAll();
  const businesses = businessesData?.data?.data || [];
  const { businessId } = useParams() as { businessId?: string };
  const currentBusiness =
  businesses.find((business) => business.id === businessId) || null;
  const userRole = currentBusiness?.userPosition?.role;
  const tSideBar = useTranslations("sideBar");
  const tRole = useTranslations("memberRole");
  const { unreadCount } = useNotification();
  const notificationBusinessId = businessId || businesses[0]?.id;
  const isNotificationActive = pathname.endsWith("/notifications");

  const handleNotificationClick = () => {
    router.push(
      notificationBusinessId
        ? `/business/${notificationBusinessId}/notifications`
        : "/notifications"
    );
    setIsOpen(false);
  };
  const navigationItems = [
    {
      name: tSideBar("basicKnowledge"),
      href: "knowledge-base",
      icon: BookOpen,
    },
    {
      name: tSideBar("contentScheduler"),
      href: "content-scheduler",
      icon: CalendarClock,
    },
    {
      name: tSideBar("settings"),
      href: "settings",
      icon: Settings,
    },
  ];
  
  // Get subscription data
  const { data: subscriptionData } = useSubscribtionGetSubscription(
    businessId ?? ""
  );
  const subscription = subscriptionData?.data?.data ?? null;
  
  // Get token usage data
  const { data: tokenUsageData } = useTokenGetTokenUsage(businessId ?? "");
  // Tampilan token minimal 0 walaupun saldo sebenarnya minus
  const credits = Math.max(0, tokenUsageData?.data?.data?.availableToken ?? 0);
  const locale = useLocale();
  // Handle escape key to close menu
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      // Prevent body scroll when menu is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleThemeToggle = (checked: boolean) => {
    setIsDarkMode(checked);
    setTheme(checked ? "dark" : "light");
  };

  const mLogout = useAuthProfileLogout();
  const { data: currentSessionData } = useAuthProfileGetCurrentSession();
  const currentSessionId = currentSessionData?.data?.data?.session?.id;
  const tToast = useTranslations();
  
  const handleLogout = async () => {
    // Layar loading langsung tampil, tidak menunggu request logout selesai.
    showLogoutOverlay();
    try {
      if (currentSessionId) {
        await mLogout.mutateAsync(currentSessionId);
      } else {
        await mLogout.mutateAsync(undefined);
      }
    } catch {
    } finally {
      showToast("success", tToast("toast.auth.logoutSuccess"), tToast);
      await logoutAndRedirect();
    }
  };

  // Check if we're currently inside a business context
  const isInBusinessContext = () => {
    const pathSegments = pathname.split("/").filter(Boolean);
    // We're in business context if we have at least 2 segments and first one is not a known root page
    return (
      pathSegments.length >= 2 &&
      !["profile", "pricing", "checkout", "newbusiness"].includes(
        pathSegments[0]
      )
    );
  };

  // Get filtered navigation items based on context
  // Profile diakses lewat foto profil di kartu atas, bukan item navigasi
  const filteredNavigationItems = isInBusinessContext() ? navigationItems : [];

  const handleNavigation = (href: string) => {
    router.push(`/business/${businessId}/${href}`);
    setIsOpen(false);
  };

  const handleProfileClick = () => {
    router.push("/profile");
    setIsOpen(false);
  };

  return (
    <>
      {/* Burger Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="relative md:hidden hover:bg-muted"
        aria-label={tSideBar("openMenu")}
      >
        <Menu className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-card" />
        )}
      </Button>

      {/* Mobile Menu — layar penuh */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={tSideBar("menu")}
          className="fixed inset-0 z-50 flex h-dvh flex-col bg-background md:hidden animate-in fade-in slide-in-from-right-8 duration-200"
        >
          {/* Header */}
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-4">
            <h2 className="text-lg font-semibold">{tSideBar("menu")}</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              aria-label={tSideBar("closeMenu")}
              className="-mr-2 size-12 rounded-full"
            >
              <X className="size-7" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
            <div className="space-y-3">
              {/* Profile Card */}
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
                <button
                  type="button"
                  onClick={handleProfileClick}
                  className="flex min-w-0 items-center gap-3 rounded-xl text-left"
                  aria-label={tSideBar("profile")}
                >
                  <Avatar className="h-12 w-12 shrink-0">
                    <AvatarImage
                      src={profile?.image || DEFAULT_USER_AVATAR}
                      alt={profile?.name || "U"}
                    />
                    <AvatarFallback className="bg-muted text-muted-foreground">
                      {profile?.name?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-base font-semibold">
                      {profile?.name || tSideBar("user")}
                    </span>
                    {userRole && (
                      <span className="text-xs text-muted-foreground">
                        {getMemberRoleLabel(userRole, tRole) || tSideBar("user")}
                      </span>
                    )}
                  </div>
                </button>

                <div className="flex shrink-0 items-center gap-2">
                  {/* Theme Toggle Button */}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleThemeToggle(!isDarkMode)}
                    className="shrink-0 rounded-full"
                    aria-label={isDarkMode ? tSideBar("switchToLightMode") : tSideBar("switchToDarkMode")}
                  >
                    {isDarkMode ? (
                      <Sun className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <Moon className="h-4 w-4" />
                    )}
                  </Button>

                  {/* Notification Button */}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleNotificationClick}
                    className={cn(
                      "relative shrink-0 rounded-full",
                      isNotificationActive && "border-primary/40 bg-primary/10 text-primary"
                    )}
                    aria-label={tSideBar("notifications")}
                  >
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-card">
                        {unreadCount}
                      </span>
                    )}
                  </Button>
                </div>
              </div>

              {/* Subscription / Token Card */}
              {businessId && (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-primary/15 bg-primary/5 p-4">
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="truncate text-xs font-medium text-muted-foreground">
                      {subscription?.subscription?.productName || tSideBar("freePlan")}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xl font-bold text-primary">
                        {credits.toLocaleString(locale)}
                      </span>
                      <Zap className="h-4 w-4 text-primary" strokeWidth={1.5} />
                      <span className="text-xs text-muted-foreground">{tSideBar("token")}</span>
                    </div>
                    {subscription?.expiredAt && (
                      <span className="text-xs text-muted-foreground">
                        {tSideBar("validUntilDate", {
                          date: formatDate(new Date(subscription.expiredAt)),
                        })}
                      </span>
                    )}
                  </div>
                  {access.purchase.write && (
                    <Button
                      type="button"
                      size="icon"
                      onClick={() => {
                        router.push(
                          `/business/${businessId}/settings?tab=billing&topUp=token`
                        );
                        setIsOpen(false);
                      }}
                      className="shrink-0 rounded-full"
                      aria-label={tSideBar("topUpToken")}
                    >
                      <CreditCard className="h-5 w-5 text-white" />
                    </Button>
                  )}
                </div>
              )}

              {/* Navigation Menu */}
              {filteredNavigationItems.length > 0 && (
                <nav className="pt-3">
                  <h3 className="px-1 pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {tSideBar("navigation")}
                  </h3>
                  <div className="overflow-hidden rounded-2xl border border-border bg-card p-1.5">
                    {filteredNavigationItems.map((item) => {
                      const isActive = pathname.endsWith(`/${item.href}`);
                      const Icon = item.icon;

                      return (
                        <button
                          key={item.name}
                          onClick={() => handleNavigation(item.href)}
                          className={cn(
                            "flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left transition-colors",
                            isActive
                              ? "bg-primary/10 text-primary"
                              : "text-foreground hover:bg-muted"
                          )}
                        >
                          <Icon
                            className={cn(
                              "h-5 w-5 shrink-0",
                              isActive ? "text-primary" : "text-muted-foreground"
                            )}
                          />
                          <span className={cn("flex-1 text-sm", isActive ? "font-semibold" : "font-medium")}>
                            {item.name}
                          </span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                        </button>
                      );
                    })}
                  </div>
                </nav>
              )}
            </div>
          </div>

          {/* Footer Section */}
          <div className="flex shrink-0 flex-col gap-3 border-t border-border bg-card px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {/* Report Problem Button */}
            <Button
              variant="outline"
              onClick={() => {
                setIsOpen(false);
                setIsReportModalOpen(true);
              }}
              className="w-full text-orange-600 hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-950/20"
            >
              <AlertTriangle className="h-4 w-4" />
              <span className="truncate">{tSideBar("reportIssue")}</span>
            </Button>

            {/* Logout Button */}
            <Button
              variant="outline"
              onClick={handleLogout}
              className="w-full text-red-600 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20"
            >
              <LogOut className="h-4 w-4" />
              <span className="truncate">{tSideBar("logout")}</span>
            </Button>
          </div>
        </div>
      )}

      <ReportIssueModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />
    </>
  );
}
