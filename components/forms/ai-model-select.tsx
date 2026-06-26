"use client";

import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { getAiModelDisplayName } from "@/models/api/content/ai-model";

export type AiModelSelectOption = {
  name: string;
  label?: string;
  description?: string;
};

type AiModelSelectProps = {
  models: AiModelSelectOption[];
  selectedModel: string;
  disabled?: boolean;
  isLoading?: boolean;
  onSelectModel: (modelName: string) => void;
  className?: string;
  contentClassName?: string;
  size?: "default" | "sm";
  side?: "top" | "right" | "bottom" | "left";
};

function AiModelLogo({ size = "default" }: { size?: "default" | "sm" }) {
  const isSmall = size === "sm";

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5",
        isSmall ? "h-5 w-5" : "h-6 w-6"
      )}
    >
      <Image
        src="/logoblue.png"
        alt=""
        width={isSmall ? 14 : 16}
        height={isSmall ? 14 : 16}
        className={cn(
          "object-contain",
          isSmall ? "h-3.5 w-3.5" : "h-4 w-4"
        )}
      />
    </span>
  );
}

function AiModelLabel({
  label,
  size = "default",
}: {
  label: string;
  size?: "default" | "sm";
}) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <AiModelLogo size={size} />
      <span className="truncate">{label}</span>
    </span>
  );
}

export function AiModelSelect({
  models,
  selectedModel,
  disabled = false,
  isLoading = false,
  onSelectModel,
  className,
  contentClassName,
  size = "default",
  side = "bottom",
}: AiModelSelectProps) {
  const selectedOption = models.find((model) => model.name === selectedModel);
  const selectedLabel = selectedOption
    ? getAiModelDisplayName(selectedOption)
    : isLoading
      ? "Loading models..."
      : "No model available";
  const isSmall = size === "sm";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-between border-input bg-background-secondary px-2 font-normal text-foreground focus-visible:ring-ring",
            isSmall ? "h-8 text-xs" : "h-10 text-sm",
            className
          )}
          disabled={disabled || isLoading || models.length === 0}
        >
          {selectedOption ? (
            <AiModelLabel label={selectedLabel} size={size} />
          ) : (
            <span className="truncate text-muted-foreground">
              {selectedLabel}
            </span>
          )}
          <ChevronDown className="h-4 w-4 shrink-0 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side={side}
        className={cn(
          "w-[var(--radix-dropdown-menu-trigger-width)] min-w-[var(--radix-dropdown-menu-trigger-width)]",
          contentClassName
        )}
      >
        {models.map((model) => {
          const label = getAiModelDisplayName(model);

          return (
            <DropdownMenuItem
              key={model.name}
              textValue={label}
              className={cn(
                "gap-2",
                isSmall ? "text-xs" : "text-sm",
                selectedModel === model.name &&
                  "bg-accent text-accent-foreground"
              )}
              onSelect={() => onSelectModel(model.name)}
            >
              <AiModelLabel label={label} size={size} />
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
