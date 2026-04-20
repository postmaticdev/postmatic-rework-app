"use client";

import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { useTranslations } from "next-intl";
import { TimezoneSelector } from "../../content-scheduler/(components)/timezone-selector";

export function ZoneTime() {
  const t = useTranslations("settings");

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card>
        <CardContent className="p-4">
          <CardTitle className="text-xl sm:text-2xl font-bold mb-4">
            {t("timezone")}
          </CardTitle>
          <TimezoneSelector />
        </CardContent>
      </Card>
    </div>
  );
}
