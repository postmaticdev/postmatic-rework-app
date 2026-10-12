"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"

interface TabNavigationProps {
  activeTab: string
  onTabChange: (tab: string) => void
}


export function SettingsTabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const t = useTranslations("settings")
  const tabs = [
    { id: "overview", label: t("overview") },
    { id: "workspace", label: t("workspaceSettings") },
    { id: "billing", label: t("billingInvoices") }
  ]
  return (
    <div className="grid grid-cols-3 gap-1 sm:gap-0 bg-card p-1 rounded-lg">
        {tabs.map((tab) => (
          <Button
          key={tab.id}
          variant={activeTab === tab.id ? "default" : "ghost"}
          onClick={() => onTabChange(tab.id)}
          aria-pressed={activeTab === tab.id}
          className={cn(
              // Equal-width cells that always fit; labels wrap on narrow screens
              "h-auto min-h-(--control-h) min-w-0 whitespace-normal px-2 py-1.5 text-center text-[13px] leading-tight sm:whitespace-nowrap sm:px-4 sm:text-sm",
              activeTab === tab.id
                ? "bg-primary text-white"
                : "text-muted-foreground hover:text-foreground"
              )}
              >
            {tab.label}
          </Button>
        ))}
      </div>
  )
}
