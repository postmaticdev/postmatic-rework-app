export interface AiModelRes {
  id?: string;
  name: string;
  label?: string;
  description: string;
  provider?: string;
  image?: string | null;
  isActive?: boolean;
  validRatios: string[];
  imageSizes?: string[] | null;
}

const AI_MODEL_DISPLAY_NAMES: Record<string, string> = {
  "gpt-image-1": "Postmatic Vision",
  "GPT Image 1": "Postmatic Vision",
  "gemini-2.5-flash-image": "Postmatic Vision Pro",
  "gemini-2.5-flash-image-preview": "Postmatic Vision Pro",
  "Gemini 2.5 Flash Image": "Postmatic Vision Pro",
  "gemini-3-pro-image-preview": "Postmatic Vision Max",
  "Gemini 3 Pro Image Preview": "Postmatic Vision Max",
};

type AiModelDisplaySource =
  | string
  | {
      name: string;
      label?: string;
      description?: string;
    }
  | null
  | undefined;

export const getAiModelDisplayName = (model: AiModelDisplaySource) => {
  if (!model) return "";

  if (typeof model === "string") {
    return AI_MODEL_DISPLAY_NAMES[model] || model;
  }

  return (
    AI_MODEL_DISPLAY_NAMES[model.name] ||
    (model.label && (AI_MODEL_DISPLAY_NAMES[model.label] || model.label)) ||
    (model.description &&
      (AI_MODEL_DISPLAY_NAMES[model.description] || model.description)) ||
    model.name
  );
};
