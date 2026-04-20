"use client";

import { useState } from "react";
import { TextField } from "@/components/forms/text-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Info, Plus } from "lucide-react";
import { useFormNewBusiness } from "@/contexts/form-new-business-context";
import { RoleKnowledgePld } from "@/models/api/knowledge/role.type";
import { useTranslations } from "next-intl";

export function RoleKnowledge() {
  const { formData, setFormData, errors } = useFormNewBusiness();
  const { step3 } = formData;

  const updateField = (
    key: keyof RoleKnowledgePld,
    value: RoleKnowledgePld[keyof RoleKnowledgePld]
  ) => {
    setFormData({ ...formData, step3: { ...formData.step3, [key]: value } });
  };

  const [isComposing, setIsComposing] = useState(false);

  const DELIM_ANY = /[,\s]/; // deteksi ada delimiter
  const SPLIT_DELIMS = /[,\s]+/; // split spasi/koma/newline

  // commit input yang berisi delimiter (mobile-safe + IME-safe)
  const commitDelimitedInput = (val: string) => {
    if (!DELIM_ANY.test(val)) {
      setCurrentHashtag(val);
      return;
    }

    const endsWithDelim = /[,\s]$/.test(val);
    const parts = val.split(SPLIT_DELIMS).filter(Boolean);

    const toCommit = endsWithDelim ? parts : parts.slice(0, -1);
    const leftover = endsWithDelim ? "" : parts[parts.length - 1] ?? "";

    if (toCommit.length) {
      const cleaned = toCommit
        .map((p) => (p.startsWith("#") ? p.slice(1) : p).trim())
        .filter(Boolean);

      // gabung sekaligus biar tidak race
      updateField("hashtags", [...step3.hashtags, ...cleaned]);
    }

    setCurrentHashtag(leftover);
  };

  const [currentHashtag, setCurrentHashtag] = useState("");

  const addHashtag = () => {
    if (currentHashtag.trim()) {
      let hashtag = currentHashtag.trim();
      if (hashtag?.startsWith("#")) {
        hashtag = hashtag.slice(1);
      }
      updateField("hashtags", [...step3.hashtags, hashtag]);
      setCurrentHashtag("");
    }
  };

  const removeHashtag = (index: number) => {
    updateField(
      "hashtags",
      step3.hashtags.filter((_, i) => i !== index)
    );
  };

  const t = useTranslations("roleKnowledge");

  const defaultLabels = {
    targetAudience: t("targetAudience"),
    contentTone: t("contentTone"),
    persona: t("persona"),
    hashtags: t("hashtags"),
    callToAction: t("callToAction"),
    goals: t("goals"),
  };

  const defaultPlaceholders = {
    targetAudience: t("targetAudiencePlaceholder"),
    contentTone: t("contentTonePlaceholder"),
    persona: t("personaPlaceholder"),
    hashtagInput: t("hashtagsPlaceholder"),
    callToAction: t("callToActionPlaceholder"),
    goals: t("goalsPlaceholder"),
  };

  const finalLabels = { ...defaultLabels };
  const finalPlaceholders = { ...defaultPlaceholders };

  return (
    <div className="space-y-4">
      <TextField
        label={finalLabels.targetAudience}
        value={step3.targetAudience}
        onChange={(value) => updateField("targetAudience", value)}
        placeholder={finalPlaceholders.targetAudience}
        error={errors.step3.targetAudience}
      />

      <TextField
        label={finalLabels.contentTone}
        value={step3.tone}
        onChange={(value) => updateField("tone", value)}
        placeholder={finalPlaceholders.contentTone}
        error={errors.step3.tone}
      />

      <TextField
        label={finalLabels.persona}
        value={step3.audiencePersona}
        onChange={(value) => updateField("audiencePersona", value)}
        placeholder={finalPlaceholders.persona}
        error={errors.step3.audiencePersona}
      />

      <div className="">
        <label className="text-sm font-medium text-foreground">
          {finalLabels.hashtags}
        </label>
        <div className="flex gap-2 mt-1">
          <Input
            value={currentHashtag}
            placeholder={finalPlaceholders.hashtagInput}
            className={`flex-1 bg-background-secondary ${
              errors.step3.hashtags ? "border-red-500 focus:border-red-500" : ""
            }`}
            // IME-safe (Gboard/iOS) agar tidak “kepotong” saat masih composing
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={(e) => {
              setIsComposing(false);
              commitDelimitedInput((e.target as HTMLInputElement).value);
            }}
            // MOBILE FIX: parsing delimiter dari nilai input
            onChange={(e) => {
              const val = e.target.value;
              if (isComposing) {
                setCurrentHashtag(val);
                return;
              }
              commitDelimitedInput(val);
            }}
            // paste “tag1, tag2 tag3” langsung jadi beberapa hashtag
            onPaste={(e) => {
              const text = e.clipboardData.getData("text");
              if (!text) return;
              e.preventDefault();
              const cleaned = text
                .split(SPLIT_DELIMS)
                .filter(Boolean)
                .map((p) => (p.startsWith("#") ? p.slice(1) : p).trim());
              if (cleaned.length) {
                updateField("hashtags", [...step3.hashtags, ...cleaned]);
              }
              setCurrentHashtag("");
            }}
            // fallback desktop
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " " || e.key === ",") {
                e.preventDefault();
                if (e.key === "Enter") {
                  if (currentHashtag.trim()) addHashtag();
                } else {
                  // anggap spasi/koma sebagai delimiter
                  commitDelimitedInput(currentHashtag + e.key);
                }
              }
            }}
          />

          <Button type="button" onClick={addHashtag} className="px-3">
            <Plus className="w-4 h-4" color="white" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 ">
          {step3.hashtags.map((hashtag, index) => (
            <span
              key={index}
              className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm flex items-center gap-1"
            >
              #{hashtag}
              <button
                type="button"
                onClick={() => removeHashtag(index)}
                className="text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        {errors.step3.hashtags && (
          <div className="flex items-center mt-1 gap-1">
            <Info className="w-4 h-4 text-red-500" />
            <p className="text-sm text-red-500">{errors.step3.hashtags}</p>
          </div>
        )}
      </div>

      <TextField
        label={finalLabels.callToAction}
        value={step3.callToAction}
        onChange={(value) => updateField("callToAction", value)}
        placeholder={finalPlaceholders.callToAction}
        error={errors.step3.callToAction}
      />

      <TextField
        label={finalLabels.goals}
        value={step3.goals}
        onChange={(value) => updateField("goals", value)}
        placeholder={finalPlaceholders.goals}
        error={errors.step3.goals}
      />
    </div>
  );
}
