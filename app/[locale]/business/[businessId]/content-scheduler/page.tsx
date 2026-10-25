"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePendingPlatformConnection } from "@/hooks/use-pending-platform-connection";
import { ContentLibrary } from "@/app/[locale]/business/[businessId]/content-scheduler/(components)/content-library";
import { TabNavigation } from "@/app/[locale]/business/[businessId]/content-scheduler/(components)/tab-navigation";
import { ContentSchedulerBoard } from "@/app/[locale]/business/[businessId]/content-scheduler/(components)/content-scheduler-board";
import { WelcomeSection } from "@/components/base/welcome-section";
import { PlatformModal } from "../knowledge-base/(components)/platform-modal";
import { useTranslations } from "next-intl";

function ContentSchedulerInner() {
  const { activeTab, setActiveTab } = useContentSchedulerTab();

  // Back from the auth site, the modal reopens so the account can be picked.
  const { hasPendingPlatform, clearPlatformFlags } = usePendingPlatformConnection();
  const [isPlatformModalOpen, setIsPlatformModalOpen] = useState(hasPendingPlatform);
  const handleIfNoPlatformConnected = () => {
    setIsPlatformModalOpen(true);
  };

  useEffect(() => {
    if (hasPendingPlatform) setIsPlatformModalOpen(true);
  }, [hasPendingPlatform]);

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
            <ContentLibrary
              showAddtoQueue={false}
              showPostingNow={false}
              showScheduling={false}
              type="posted"
            />
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
        onClose={() => {
          setIsPlatformModalOpen(false);
          clearPlatformFlags();
        }}
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
