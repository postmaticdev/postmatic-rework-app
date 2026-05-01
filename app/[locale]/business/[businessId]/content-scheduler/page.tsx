"use client";

import { createContext, useContext, useState } from "react";
import { ContentLibrary } from "@/app/[locale]/business/[businessId]/content-scheduler/(components)/content-library";
import { TabNavigation } from "@/app/[locale]/business/[businessId]/content-scheduler/(components)/tab-navigation";
import { ContentSchedulerBoard } from "@/app/[locale]/business/[businessId]/content-scheduler/(components)/content-scheduler-board";
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
      case "scheduler":
        return (
          <ContentSchedulerBoard
            handleIfNoPlatformConnected={handleIfNoPlatformConnected}
          />
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
  const [activeTab, setActiveTab] = useState<"scheduler" | "history">(
    "scheduler"
  );
  return (
    <ContentSchedulerTabContext.Provider value={{ activeTab, setActiveTab }}>
      <ContentSchedulerInner />
    </ContentSchedulerTabContext.Provider>
  );
}

interface ContentSchedulerTabContext {
  activeTab: "scheduler" | "history";
  setActiveTab: (tab: "scheduler" | "history") => void;
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
