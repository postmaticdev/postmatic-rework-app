"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { BusinessKnowledgeSection } from "@/app/[locale]/business/[businessId]/knowledge-base/(components)/business-knowledge-section";
import { MediaSocialSection } from "@/app/[locale]/business/[businessId]/knowledge-base/(components)/media-social-section";
import { RoleKnowledgeSection } from "@/app/[locale]/business/[businessId]/knowledge-base/(components)/role-knowledge-section";
import { ProductSection } from "@/app/[locale]/business/[businessId]/knowledge-base/(components)/product-section";
import { RSSTrendSection } from "@/app/[locale]/business/[businessId]/knowledge-base/(components)/rss-trend-section";
import { WelcomeSection } from "@/components/base/welcome-section";
import { useTranslations } from "next-intl";

export default function KnowledgeBase() {
  const searchParams = useSearchParams();
  const openRssModal = searchParams.get("openRssModal") === "true";

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    if (hash) {
      const elementId = hash.replace("#", "");
      const target = document.getElementById(elementId);
      if (target) {
        setTimeout(() => {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 0);
      }
    }
  }, []);

  const w = useTranslations("welcomeSection");

  return (
    <main className="flex-1 space-y-4 p-4 sm:space-y-6 sm:p-6 md:ml-0">
      <WelcomeSection
        title={w("basicKnowledge")}
        message={w("manageSocialMedia")}
      />

      <div className="grid items-stretch gap-6 lg:grid-cols-2">
        <div className="h-full">
          <BusinessKnowledgeSection />
        </div>
        <div className="grid auto-rows-fr gap-6">
          <RoleKnowledgeSection />
          <MediaSocialSection />
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="lg:w-2/3">
          <ProductSection />
        </div>
        <div className="lg:w-1/3" id="rss-trend-section">
          <RSSTrendSection openRssModal={openRssModal} />
        </div>
      </div>
    </main>
  );
}
