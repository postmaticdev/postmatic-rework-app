"use client";

import { useState } from "react";
import { TextField } from "@/components/forms/text-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { RoleKnowledgePld } from "@/models/api/knowledge/role.type";
import { useManageKnowledge } from "@/contexts/manage-knowledge-context";
import { useTranslations } from "next-intl";

export function RoleKnowledgeForm() {
  const { formKnowledge, setFormKnowledge, errors } = useManageKnowledge();

  const updateField = (
    key: keyof RoleKnowledgePld,
    value: RoleKnowledgePld[keyof RoleKnowledgePld]
  ) => {
    setFormKnowledge((prev) => ({
      ...prev,
      role: { ...prev.role, [key]: value },
    }));
  };

  const [currentHashtag, setCurrentHashtag] = useState("");

  // Accepts pasted lists like "#a, #b c" and skips duplicates.
  const addHashtag = () => {
    const existing = new Set(
      formKnowledge.role.hashtags.map((hashtag) => hashtag.toLowerCase())
    );
    const newHashtags: string[] = [];
    currentHashtag
      .split(/[s,]+/)
      .map((hashtag) => hashtag.replace(/^#+/, "").trim())
      .filter(Boolean)
      .forEach((hashtag) => {
        if (existing.has(hashtag.toLowerCase())) return;
        existing.add(hashtag.toLowerCase());
        newHashtags.push(hashtag);
      });
    if (newHashtags.length) {
      updateField("hashtags", [...formKnowledge.role.hashtags, ...newHashtags]);
    }
    setCurrentHashtag("");
  };

  const removeHashtag = (index: number) => {
    updateField(
      "hashtags",
      formKnowledge.role.hashtags.filter((_, i) => i !== index)
    );
  };
  const r = useTranslations("roleKnowledge");

  const defaultLabels = {
    targetAudience: r("targetAudience"),
    contentTone: r("contentTone"),
    hashtags: r("hashtags"),
  };

  const defaultPlaceholders = {
    targetAudience: r("targetAudiencePlaceholder"),
    contentTone: r("contentTonePlaceholder"),
    hashtagInput: r("hashtagsPlaceholder"),
  };

  const finalLabels = { ...defaultLabels };
  const finalPlaceholders = { ...defaultPlaceholders };

  return (
    <div className="space-y-4 sm:space-y-6">
      <TextField
        label={finalLabels.targetAudience}
        value={formKnowledge.role.targetAudience}
        onChange={(value) => updateField("targetAudience", value)}
        placeholder={finalPlaceholders.targetAudience}
        error={errors.role.targetAudience}
      />

      <TextField
        label={finalLabels.contentTone}
        value={formKnowledge.role.tone}
        onChange={(value) => updateField("tone", value)}
        placeholder={finalPlaceholders.contentTone}
        error={errors.role.tone}
      />

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          {finalLabels.hashtags}
        </label>
        <div className="flex gap-2">
          <Input
            value={currentHashtag}
            onChange={(e) => setCurrentHashtag(e.target.value)}
            placeholder={finalPlaceholders.hashtagInput}
            className={`flex-1 bg-background-secondary ${
              errors.role.hashtags ? "border-red-500" : ""
            }`}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " " || e.key === ",") {
                e.preventDefault();
                addHashtag();
              }
            }}
          />
          <Button type="button" onClick={addHashtag} size="icon" aria-label={r("addHashtag")}>
            <Plus className="w-4 h-4" color="white" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formKnowledge.role.hashtags.map((hashtag, index) => (
            <span
              key={`${hashtag}-${index}`}
              className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm flex items-center gap-1"
            >
              #{hashtag}
              <button
                type="button"
                onClick={() => removeHashtag(index)}
                aria-label={r("removeHashtag", { hashtag })}
                className="text-blue-600 hover:text-blue-800 max-sm:-my-1 max-sm:px-1.5 max-sm:py-1 max-sm:text-base max-sm:leading-none"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        {errors.role.hashtags && (
          <p className="text-sm text-red-500">{errors.role.hashtags}</p>
        )}
      </div>

    </div>
  );
}
