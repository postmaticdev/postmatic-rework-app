"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useParams } from "next/navigation";

import { useTheme } from "next-themes";
import {
  BookOpen,
  Send,
  Settings,
  Menu,
  X,
  User,
  LogOut,
  Plus,
  AlertTriangle,
  Sun,
  Moon,
  Zap,
  Bell,
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
      icon: Send,
    },
    {
      name: tSideBar("settings"),
      href: "settings",
      icon: Settings,
    },
    {
      name: tSideBar("profile"),
      href: "profile",
      icon: User,
    },
  ];
  
  // Get subscription data
  const { data: subscriptionData } = useSubscribtionGetSubscription(
    businessId ?? ""
  );
  const subscription = subscriptionData?.data?.data ?? null;
  
  // Get token usage data
  const { data: tokenUsageData } = useTokenGetTokenUsage(businessId ?? "");
  const credits = tokenUsageData?.data?.data?.availableToken ?? 0;
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
  const getFilteredNavigationItems = () => {
    if (isInBusinessContext()) {
      // Show all navigation items when in business context
      return navigationItems;
    } else {
      // Show only profile when not in business context
      return navigationItems.filter((item) => item.href === "profile");
    }
  };

  const handleNavigation = (href: string) => {
    // Handle profile differently - don't go through businessId
    if (href === "profile") {
      router.push(`/${href}`);
    } else {
      const fullPath = `/business/${businessId}/${href}`;
      router.push(fullPath);
    }

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
        aria-label="Buka menu"
      >
        <Menu className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-card" />
        )}
      </Button>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu Panel */}
          <div className="fixed right-0 top-0 h-dvh w-80 max-w-[85vw] bg-card border-l border-border shadow-xl animate-in slide-in-from-right duration-300">
            <div className="flex flex-col h-full overflow-y-auto overscroll-contain">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="text-lg font-semibold">Menu</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Profile Section */}
              <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="w-12 h-12 shrink-0">
                      <AvatarImage
                        src={profile?.image || DEFAULT_USER_AVATAR}
                        alt={profile?.name || "U"}
                      />
                      <AvatarFallback className="bg-muted text-muted-foreground">
                        {profile?.name?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium">
                        {profile?.name || "Pengguna"}
                      </span>
                      {userRole && (
                        <span className="text-xs text-muted-foreground">
                          {userRole || "Pengguna"}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Theme Toggle Button */}
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => handleThemeToggle(!isDarkMode)}
                    className="border-border hover:bg-muted transition-all duration-200"
                    aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
                  >
                    {isDarkMode ? (
                      <Sun className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <Moon className="h-4 w-4 text-slate-600" />
                    )}
                  </Button>
                </div>
              </div>

               {/* Subscription Info Section */}
               {businessId && (
                 <div className="p-4 border-b border-border">
                   <div className="flex items-center justify-between gap-3">
                     <div className="flex min-w-0 flex-col gap-1">
                       <span className="text-sm text-muted-foreground">
                         {subscription?.subscription?.productName || "Paket Gratis"}
                       </span>
                       {subscription?.expiredAt && (
                         <span className="text-xs text-muted-foreground">
                           {tSideBar("validUntil")}{" "}
                           {formatDate(new Date(subscription.expiredAt))}
                         </span>
                       )}
                       <div className="flex items-center gap-2">
                         <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{credits.toLocaleString(locale)}</span>
                         <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" strokeWidth={1.5} />
                         <span className="text-xs text-muted-foreground">{tSideBar("token")}</span>
                       </div>
                     </div>
                     {access.purchase.write && (
                     <Button
                       type="button"
                       size="icon-sm"
                       onClick={() => {
                         router.push(
                           `/business/${businessId}/settings?tab=billing&topUp=token`
                         );
                         setIsOpen(false);
                       }}
                       className="bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
                     >
                       <Plus className="w-4 h-4 text-white" />
                     </Button>
                     )}
                   </div>
                 </div>
               )}

              

              {/* Navigation Menu */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-2">
                  <h3 className="text-sm font-medium text-muted-foreground px-3 py-2">
                    Navigasi
                  </h3>
                  <div className="space-y-1">
                    <button
                      onClick={handleNotificationClick}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all duration-200 group",
                        isNotificationActive
                          ? "bg-blue-600 text-white shadow-md"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted hover:shadow-sm"
                      )}
                    >
                      <Bell
                        className={cn(
                          "w-5 h-5 transition-transform duration-200",
                          isNotificationActive ? "" : "group-hover:scale-110"
                        )}
                      />
                      <span className="flex-1 text-sm font-medium">
                        {tSideBar("notifications")}
                      </span>
                      {unreadCount > 0 && (
                        <span className="flex h-5 min-w-5 px-1.5 items-center justify-center rounded-full bg-red-500 text-[11px] leading-none font-bold text-white">
                          {unreadCount}
                        </span>
                      )}
                    </button>
                    {getFilteredNavigationItems().map((item) => {
                      const isActive = pathname.endsWith(`/${item.href}`);
                      const Icon = item.icon;

                      return (
                        <button
                          key={item.name}
                          onClick={() => handleNavigation(item.href)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all duration-200 group",
                            isActive
                              ? "bg-blue-600 text-white shadow-md"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted hover:shadow-sm"
                          )}
                        >
                          <Icon
                            className={cn(
                              "w-5 h-5 transition-transform duration-200",
                              isActive ? "" : "group-hover:scale-110"
                            )}
                          />
                          <span className="text-sm font-medium">
                            {item.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Footer Section */}
              <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-border space-y-3">
                {/* Report Problem Button */}
                <Button
                  variant="ghost"
                  onClick={() => {
                    setIsOpen(false);
                    setIsReportModalOpen(true);
                  }}
                  className="w-full justify-start text-orange-600 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-colors duration-200"
                >
                  <AlertTriangle className="h-4 w-4" />
                  <span>{tSideBar("reportIssue")}</span>
                </Button>

                {/* Logout Button */}
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className="w-full justify-start text-red-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors duration-200"
                >
                  <LogOut className="h-4 w-4" />
                  <span>{tSideBar("logout")}</span>
                </Button>
              </div>
            </div>
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
