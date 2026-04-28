"use client";

import { useEffect, useState } from "react";
import { SettingsTabNavigation } from "@/app/[locale]/business/[businessId]/settings/(components)/settings-tab-navigation";
import { MembersTable } from "@/app/[locale]/business/[businessId]/settings/(components)/members-table";
import { OverviewContent } from "@/app/[locale]/business/[businessId]/settings/(components)/overview-content";
import { BillingInvoices } from "@/app/[locale]/business/[businessId]/settings/(components)/billing-invoices";
import { WelcomeSection } from "@/components/base/welcome-section";
import { useTranslations } from "next-intl";
import { useAuthProfileGetProfile } from "@/services/auth.api";
import { useSearchParams } from "next/navigation";

const settingsTabs = ["overview", "workspace", "billing"] as const;
type SettingsTab = (typeof settingsTabs)[number];

function isSettingsTab(tab: string | null): tab is SettingsTab {
  return settingsTabs.includes(tab as SettingsTab);
}

export default function Settings() {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<SettingsTab>(
    isSettingsTab(requestedTab) ? requestedTab : "overview"
  );
  const w = useTranslations("welcomeSection");
  const { data: profile } = useAuthProfileGetProfile();
  const userName = profile?.data?.data?.name;
  const greeting = `${w("welcome")} ${userName || ""}`.trim();

  useEffect(() => {
    if (isSettingsTab(requestedTab)) {
      setActiveTab(requestedTab);
    }
  }, [requestedTab]);

  const handleTabChange = (tab: string) => {
    if (isSettingsTab(tab)) {
      setActiveTab(tab);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return <OverviewContent />;
      case "workspace":
        return <MembersTable />;
      case "billing":
        return <BillingInvoices />;
      default:
        return null;
    }
  };

  return (
    <main className="max-w-screen p-4 sm:p-6 space-y-4 sm:space-y-6 md:ml-0">
      {/* Banner Header */}

      <WelcomeSection
        title={greeting}
        message={w("manageSocialMedia")}
      />

      {/* Content Area */}
      <div className="flex-1 min-h-0">
        {/* Tab Navigation */}
        <div className="mb-4 sm:mb-6">
          <SettingsTabNavigation
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
        </div>

        {/* Tab Content */}
        <div className="min-h-0">{renderTabContent()}</div>
      </div>
      {/* Member Management Modal */}
    </main>
  );
}
