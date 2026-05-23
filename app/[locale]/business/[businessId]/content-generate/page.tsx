"use client";

import { ReferencePanel } from "@/app/[locale]/business/[businessId]/content-generate/(components)/reference-panel";
import { GenerationPanel } from "@/app/[locale]/business/[businessId]/content-generate/(components)/generation-panel";
import { PreviewPanel } from "@/app/[locale]/business/[businessId]/content-generate/(components)/preview-panel";
import { useContentGenerate } from "@/contexts/content-generate-context";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

export default function ContentGenerate() {
  const { mode, isLoading, onSelectHistory } = useContentGenerate();
  const onSelectHistoryRef = useRef(onSelectHistory);

  useEffect(() => {
    onSelectHistoryRef.current = onSelectHistory;
  }, [onSelectHistory]);

  useEffect(() => {
    document.body.style.pointerEvents = "";
    return () => {
      document.body.style.pointerEvents = "";
      onSelectHistoryRef.current(null);
    };
  }, []);

  return (
    <main className="relative flex flex-col md:ml-0 lg:h-[calc(100vh-5.5rem)] lg:overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div
          className={cn(
            "relative w-full overflow-y-auto border-r bg-card lg:min-h-0 lg:w-1/3 lg:overflow-hidden",
            mode === "regenerate" ? "hidden" : "w-full lg:w-1/3"
          )}
        >
          <ReferencePanel />
          {isLoading && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] z-10 pointer-events-auto" />
          )}
        </div>

        <div
          className={cn(
            "relative w-full border-r bg-card lg:min-h-0 lg:overflow-hidden",
            mode === "regenerate" ? "w-full lg:w-2/3" : "w-full lg:w-1/3"
          )}
        >
          <GenerationPanel />
        </div>

        <div className="w-full bg-card lg:min-h-0 lg:w-1/3 lg:overflow-hidden">
          <PreviewPanel />
        </div>
      </div>
    </main>
  );
}
