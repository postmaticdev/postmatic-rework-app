"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useContentGenerate } from "@/contexts/content-generate-context";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { isProblemGenerationJob } from "./failed-generation-history";

interface TabNavigationProps {
  activeTab: "scheduler" | "history";
  onTabChange: (tab: "scheduler" | "history") => void;
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const t = useTranslations("contentScheduler");
  const { histories } = useContentGenerate();
  const failedJobCount = histories
    .flatMap((group) => group.jobs)
    .filter(isProblemGenerationJob).length;
  const tabs: {
    id: "scheduler" | "history";
    label: string;
  }[] = [
    { id: "scheduler", label: t("contentSchedulerTab") },
    { id: "history", label: t("history") },
  ];
  return (
    <div className="flex flex-row bg-card p-1 rounded-lg justify-between overflow-x-auto">
      {tabs.map((tab) => (
        <Button
          key={tab.id}
          variant={activeTab === tab.id ? "default" : "ghost"}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            " p-6 flex-1",
            activeTab === tab.id
              ? "bg-primary text-white"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {tab.label}
          {tab.id === "history" && failedJobCount > 0 ? (
            <Badge
              variant="destructive"
              className="ml-2 min-w-5 justify-center px-1.5"
            >
              {failedJobCount}
            </Badge>
          ) : null}
        </Button>
      ))}
    </div>
  );
}
