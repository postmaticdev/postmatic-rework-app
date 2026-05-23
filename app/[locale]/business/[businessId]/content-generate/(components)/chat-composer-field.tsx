"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ImagePlus, Plus, Send } from "lucide-react";

type ModelOption = {
  name: string;
  label?: string;
  description?: string;
};

type ChatComposerFieldProps = {
  value: string;
  placeholder: string;
  disabled?: boolean;
  isUploadingAttachment?: boolean;
  isLoadingModels?: boolean;
  models: ModelOption[];
  selectedModel: string;
  canSubmit: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onSelectModel: (modelName: string) => void;
  onAttachGallery: () => void;
  onAttachKnowledge: () => void;
};

export function ChatComposerField({
  value,
  placeholder,
  disabled = false,
  isUploadingAttachment = false,
  isLoadingModels = false,
  models,
  selectedModel,
  canSubmit,
  onChange,
  onSubmit,
  onSelectModel,
  onAttachGallery,
  onAttachKnowledge,
}: ChatComposerFieldProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const syncTextareaLayout = () => {
    const el = textareaRef.current;
    if (!el) return;

    el.style.height = "0px";
    const nextHeight = Math.max(40, Math.min(el.scrollHeight, 180));
    el.style.height = `${nextHeight}px`;

    const computed = window.getComputedStyle(el);
    const lineHeight = Number.parseFloat(computed.lineHeight || "20");
    setIsExpanded(nextHeight > lineHeight * 1.8);
  };

  useEffect(() => {
    syncTextareaLayout();
  }, [value]);

  return (
    <div className="rounded-xl">
      <div
        className={`flex gap-2 ${isExpanded ? "flex-col" : "items-center"
          }`}
      >
        {!isExpanded ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 rounded-md border border-border bg-card hover:bg-card/80"
                disabled={disabled || isUploadingAttachment}
              >
                {isUploadingAttachment ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top">
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  onAttachGallery();
                }}
              >
                <ImagePlus className="h-4 w-4" />
                Import Gallery
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  onAttachKnowledge();
                }}
              >
                Import from Knowledge
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}

        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="min-h-10 flex-1 resize-none overflow-y-auto border-0 bg-transparent dark:bg-transparent py-2 shadow-none focus-visible:ring-0 max-h-[50px] "
        />

        {!isExpanded ? (
          <div className="flex items-center gap-2">
            <select
              className="h-8 w-[180px] shrink-0 rounded-md border border-input bg-background-secondary px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={disabled || isLoadingModels}
              value={selectedModel}
              onChange={(event) => onSelectModel(event.target.value)}
            >
              {isLoadingModels ? (
                <option value="">Loading models...</option>
              ) : null}
              {!isLoadingModels && models.length === 0 ? (
                <option value="">No model available</option>
              ) : null}
              {models.map((model) => (
                <option key={model.name} value={model.name}>
                  {model.label || model.description || model.name}
                </option>
              ))}
            </select>
            <Button
              type="button"
              onClick={onSubmit}
              disabled={disabled || !canSubmit}
              className="h-8 w-8 shrink-0 rounded-full p-0"
            >
              {disabled ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        ) : null}
      </div>

      {isExpanded ? (
        <div className="mt-2 flex items-center justify-between gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 rounded-md border border-border bg-card hover:bg-card/80"
                disabled={disabled || isUploadingAttachment}
              >
                {isUploadingAttachment ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top">
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  onAttachGallery();
                }}
              >
                <ImagePlus className="h-4 w-4" />
                Import Gallery
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  onAttachKnowledge();
                }}
              >
                Import from Knowledge
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center gap-2">
            <select
              className="h-8 w-[180px] shrink-0 rounded-md border border-input bg-background-secondary px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={disabled || isLoadingModels}
              value={selectedModel}
              onChange={(event) => onSelectModel(event.target.value)}
            >
              {isLoadingModels ? (
                <option value="">Loading models...</option>
              ) : null}
              {!isLoadingModels && models.length === 0 ? (
                <option value="">No model available</option>
              ) : null}
              {models.map((model) => (
                <option key={model.name} value={model.name}>
                  {model.label || model.description || model.name}
                </option>
              ))}
            </select>
            <Button
              type="button"
              onClick={onSubmit}
              disabled={disabled || !canSubmit}
              className="h-8 w-8 shrink-0 rounded-full p-0"
            >
              {disabled ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
