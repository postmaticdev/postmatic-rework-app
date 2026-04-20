"use client";

import { createContext, useContext, useState } from "react";
import { ContentLibrary } from "@/app/[locale]/business/[businessId]/content-scheduler/(components)/content-library";
import { SchedulePost } from "@/app/[locale]/business/[businessId]/content-scheduler/(components)/schedule-post";
import { AutoPosting } from "@/app/[locale]/business/[businessId]/content-scheduler/(components)/auto-posting";
import { TabNavigation } from "@/app/[locale]/business/[businessId]/content-scheduler/(components)/tab-navigation";
import { WelcomeSection } from "@/components/base/welcome-section";
import { PlatformModal } from "../knowledge-base/(components)/platform-modal";
import { useTranslations } from "next-intl";

function ContentSchedulerInner() {
  const { activeTab, setActiveTab } = useContentSchedulerTab();

  const [isPlatformModalOpen, setIsPlatformModalOpen] = useState(false);
  const handleIfNoPlatformConnected = () => {
    setIsPlatformModalOpen(true);
  };

  const t = useTranslations("welcomeSection");

  const renderTabContent = () => {
    switch (activeTab) {
      case "manual":
        return (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 h-full">
            <div className="xl:col-span-2">
              <ContentLibrary showAddtoQueue={false} type="draft" />
            </div>
            <div className="order-first xl:order-last">
              <SchedulePost />
            </div>
          </div>
        );
      case "auto":
        return (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 h-full">
            <div className="xl:col-span-2">
              <ContentLibrary
                showPostingNow={false}
                showScheduling={false}
                type="draft"
              />
            </div>
            <div className="order-first xl:order-last">
              <AutoPosting
                handleIfNoPlatformConnected={handleIfNoPlatformConnected}
              />
            </div>
          </div>
        );
      case "history":
        return (
          <div className="h-full">
            <div className="grid grid-cols-1 gap-4 sm:gap-6 h-full">
              <div className="h-full">
                <ContentLibrary
                  showAddtoQueue={false}
                  showPostingNow={false}
                  showScheduling={false}
                  type="posted"
                />
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <main className=" max-w-screen p-4 sm:p-6 space-y-4 sm:space-y-6 md:ml-0">
      {/* Header Section */}
      <WelcomeSection
        title= {t("contentScheduler")}
        message={t("manageSocialMedia")}
      />

      {/* Tab Navigation */}
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      <div className=" h-full">{renderTabContent()}</div>
      <PlatformModal
        isOpen={isPlatformModalOpen}
        onClose={() => setIsPlatformModalOpen(false)}
      />
    </main>
  );
}

export default function ContentScheduler() {
  const [activeTab, setActiveTab] = useState<"manual" | "auto" | "history">(
    "manual"
  );
  return (
    <ContentSchedulerTabContext.Provider value={{ activeTab, setActiveTab }}>
      <ContentSchedulerInner />
    </ContentSchedulerTabContext.Provider>
  );
}

interface ContentSchedulerTabContext {
  activeTab: "manual" | "auto" | "history";
  setActiveTab: (tab: "manual" | "auto" | "history") => void;
}

const ContentSchedulerTabContext = createContext<
  ContentSchedulerTabContext | undefined
>(undefined);

export function useContentSchedulerTab() {
  const context = useContext(ContentSchedulerTabContext);
  if (!context) {
    throw new Error(
      "useContentSchedulerTab must be used within a ContentSchedulerTabProvider"
    );
  }
  return context;
}
