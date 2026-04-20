"use client";

import { GenerateFormAdvanced } from "../../content-generate/(components)/generate-form-advanced";
import { GenerateFormBasic } from "../../content-generate/(components)/generate-form-basic";
import { ReferencePanel } from "../../content-generate/(components)/reference-panel";
import { AutoGenerateReferencePanel } from "./auto-generate-reference-panel";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslations } from "next-intl";

export function AutoGenerateFormBase() {
  const t = useTranslations("autoGenerate");

  return (
    <>
      <GenerateFormBasic />
      <GenerateFormAdvanced />
      
      {/* Reference Images - Manual Only */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-lg font-semibold mb-4">
            {t("referenceImages")}
          </h3>
          <ReferencePanel />
        </CardContent>
      </Card>

    </>
  );
}
