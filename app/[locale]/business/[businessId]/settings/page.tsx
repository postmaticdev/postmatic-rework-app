"use client";

import { useState } from "react";
import { SettingsTabNavigation } from "@/app/[locale]/business/[businessId]/settings/(components)/settings-tab-navigation";
import { MembersTable } from "@/app/[locale]/business/[businessId]/settings/(components)/members-table";
import { OverviewContent } from "@/app/[locale]/business/[businessId]/settings/(components)/overview-content";
import { BillingInvoices } from "@/app/[locale]/business/[businessId]/settings/(components)/billing-invoices";
import { WelcomeSection } from "@/components/base/welcome-section";
import { useTranslations } from "next-intl";
import { useAuthProfileGetProfile } from "@/services/auth.api";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("overview");
  const w = useTranslations("welcomeSection");
  const { data: profile } = useAuthProfileGetProfile();
  const userName = profile?.data?.data?.name;
  const greeting = `${w("welcome")} ${userName || ""}`.trim();

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
            onTabChange={setActiveTab}
          />
        </div>

        {/* Tab Content */}
        <div className="min-h-0">{renderTabContent()}</div>
      </div>
      {/* Member Management Modal */}
    </main>
  );
}
