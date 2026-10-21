"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const TYPE_INTERVAL_MS = 28;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Status line of a running generation. Each new step types itself out, then shimmers with animated
 * dots while the model works, so the bubble reads as something being made rather than a static label.
 */
export function GenerationStatusText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  // The dots are animated here, so a trailing ellipsis in the copy is dropped.
  const label = text.replace(/(\.{3}|…)\s*$/, "");
  const [typed, setTyped] = useState(() => (prefersReducedMotion() ? label.length : 0));

  useEffect(() => {
    if (prefersReducedMotion()) {
      setTyped(label.length);
      return;
    }

    setTyped(0);
    const intervalId = window.setInterval(() => {
      setTyped((count) => {
        if (count >= label.length) {
          window.clearInterval(intervalId);
          return count;
        }
        return count + 1;
      });
    }, TYPE_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [label]);

  const isTyping = typed < label.length;

  return (
    <p className={cn("text-sm font-medium text-foreground", className)}>
      {/* Screen readers get the whole step at once instead of every typed character. */}
      <span className="sr-only" aria-live="polite">
        {text}
      </span>
      <span aria-hidden>
        <span className={cn(!isTyping && "gen-status-shimmer")}>
          {label.slice(0, typed)}
        </span>
        {isTyping ? (
          <span className="gen-status-caret" />
        ) : (
          <span className="ml-1 inline-flex items-end gap-[3px] opacity-70">
            <span className="gen-status-dot" />
            <span className="gen-status-dot [animation-delay:0.15s]" />
            <span className="gen-status-dot [animation-delay:0.3s]" />
          </span>
        )}
      </span>
    </p>
  );
}
