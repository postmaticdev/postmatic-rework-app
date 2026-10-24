"use client";

import { getMemberRoleLabel } from "@/helper/member-role";
import { useRouter } from "@/i18n/navigation";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";
import { Moon, Sun, LogOut, User } from "lucide-react";
import { useAuthProfileGetProfile } from "@/services/auth.api";
import { useTranslations } from "next-intl";
import { DEFAULT_USER_AVATAR } from "@/constants";
import { useRole } from "@/contexts/role-context";
import { useLogout } from "@/hooks/use-logout";

export function ProfileDropdown() {
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const { data: profileData } = useAuthProfileGetProfile();
  // Role bisnis aktif dari RoleProvider (detail bisnis), bukan dari daftar
  // bisnis yang dibatasi per halaman.
  const { role: userRole } = useRole();
  const profile = profileData?.data?.data;
  const tSideBar = useTranslations("sideBar");
  const tRole = useTranslations("memberRole");
  const handleLogout = useLogout();

  const isDarkMode = resolvedTheme === "dark";

  const handleThemeToggle = (checked: boolean) => {
    setTheme(checked ? "dark" : "light");
  };

  const handleProfile = () => {
    router.push("/profile");
  };

  return (
    <div className="flex items-center gap-2 sm:gap-4">
      {/* Profile Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-2 sm:gap-3 h-auto p-2"
          >
            <Avatar className="w-8 h-8 sm:w-10 sm:h-10">
              <AvatarImage
                src={profile?.image || DEFAULT_USER_AVATAR}
                alt={profile?.name || "U"}
              />
              <AvatarFallback className="bg-muted text-muted-foreground text-xs sm:text-sm">
                {profile?.name?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-sm font-medium text-foreground">
                {profile?.name || tSideBar("user")}
              </span>
              {userRole && (
                <span className="text-xs text-muted-foreground">
                  {getMemberRoleLabel(userRole, tRole)}
                </span>
              )}
            </div>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-64 p-0">
          {/* Profile Section */}
          <div className="flex items-center gap-3 p-4">
            <Avatar className="w-10 h-10">
              <AvatarImage
                src={profile?.image || DEFAULT_USER_AVATAR}
                alt={profile?.name || "U"}
              />
              <AvatarFallback className="bg-muted text-muted-foreground">
                {profile?.name?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium">
                {profile?.name || tSideBar("user")}
              </span>
              {userRole && (
                <span className="text-xs text-muted-foreground">
                  {getMemberRoleLabel(userRole, tRole)}
                </span>
              )}
            </div>
          </div>

          <DropdownMenuSeparator />

          {/* Menu Items */}
          <DropdownMenuItem
            onClick={handleProfile}
            className="cursor-pointer px-4 py-2"
          >
            <User className="text-foreground mr-2 h-4 w-4" />
            <span>{tSideBar("profile")}</span>
          </DropdownMenuItem>

          {/* Dark Mode Toggle */}
          <div
            className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-accent rounded-sm transition-colors"
            onClick={() => handleThemeToggle(!isDarkMode)}
          >
            <div className="flex items-center">
              {isDarkMode ? (
                <Moon className="text-foreground mr-4 h-4 w-4" />
              ) : (
                <Sun className="text-foreground mr-4 h-4 w-4" />
              )}
              <span className="text-sm select-none">{tSideBar("darkMode")}</span>
            </div>
            <Switch
              checked={isDarkMode}
              onCheckedChange={handleThemeToggle}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={handleLogout}
            className="cursor-pointer text-red-600 focus:text-red-600 px-4 py-2"
          >
            <LogOut className="text-foreground mr-2 h-4 w-4" />
            <span>{tSideBar("logout")}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
