"use client";

import { Fragment } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEP_KEYS = ["flowStepBrief", "flowStepStoryboard", "flowStepVideo"] as const;

export type VideoFlowStep = 1 | 2 | 3;

// Where the user is in the AI path: brief sent, storyboard under review, video
// made. Steps before `current` are done.
export function VideoFlowSteps({
  current,
  className,
}: {
  current: VideoFlowStep;
  className?: string;
}) {
  const t = useTranslations("videoGenerator");

  return (
    <ol className={cn("flex items-center gap-1.5 sm:gap-2", className)}>
      {STEP_KEYS.map((key, index) => {
        const step = index + 1;
        const isDone = step < current;
        const isCurrent = step === current;
        return (
          <Fragment key={key}>
            {index > 0 && (
              <li
                aria-hidden
                className={cn("h-px w-4 shrink-0 sm:w-6", isDone || isCurrent ? "bg-primary/40" : "bg-border")}
              />
            )}
            <li
              className="flex shrink-0 items-center gap-1.5"
              aria-current={isCurrent ? "step" : undefined}
            >
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold",
                  isCurrent && "bg-primary text-primary-foreground",
                  isDone && "bg-primary/10 text-primary",
                  !isCurrent && !isDone && "bg-muted text-muted-foreground"
                )}
              >
                {isDone ? <Check className="h-3 w-3" /> : step}
              </span>
              <span
                className={cn(
                  "text-xs",
                  isCurrent ? "font-semibold text-foreground" : "text-muted-foreground"
                )}
              >
                {t(key)}
              </span>
            </li>
          </Fragment>
        );
      })}
    </ol>
  );
}
