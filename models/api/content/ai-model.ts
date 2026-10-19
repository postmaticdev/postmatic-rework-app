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
  /** Tiles per side of one generation: 1 = single image, 2 = 2x2, 3 = 3x3. */
  gridSize?: number;
}

/** Grid models return gridSize x gridSize variations per generation and are not allowed for repetition. */
export const isGridAiModel = (model?: Pick<AiModelRes, "gridSize"> | null) =>
  (model?.gridSize ?? 1) > 1;

export const GPT_IMAGE_1_MODEL_NAME = "gpt-image-1";

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
    return model;
  }

  return model.label || model.description || model.name;
};

export const isGptImageOneModel = (modelName?: string | null) =>
  modelName === GPT_IMAGE_1_MODEL_NAME || modelName === "GPT Image 1";

export const pickGptImageOneModel = (models: AiModelRes[]) =>
  models.find((model) => isGptImageOneModel(model.name)) || null;
