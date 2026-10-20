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
  /** Set by the admin per tuned model; free users may only use models where this is false. */
  premiumModel?: boolean;
}

/** Grid models return gridSize x gridSize variations per generation and are not allowed for repetition. */
export const isGridAiModel = (model?: Pick<AiModelRes, "gridSize"> | null) =>
  (model?.gridSize ?? 1) > 1;

/** Free users may only generate with models the admin marked as non-premium. */
export const isFreeUserAllowedAiModel = (
  model?: Pick<AiModelRes, "premiumModel"> | null
) => model?.premiumModel === false;

/** True when a free user picked a model they may not use: a premium model, or one no longer listed. */
export const isAiModelRestrictedForFreeUser = (
  models: AiModelRes[],
  modelName?: string | null
) =>
  Boolean(modelName) &&
  !isFreeUserAllowedAiModel(models.find((model) => model.name === modelName));

const byAiModelIdAsc = (a: AiModelRes, b: AiModelRes) =>
  (Number(a.id) || 0) - (Number(b.id) || 0);

/**
 * The model free users default to: the oldest non-premium single-image model (grid models only when
 * no single-image one is free). Oldest first, so adding another free model does not move the default.
 */
export const pickFreeUserAiModel = (models: AiModelRes[]) => {
  const allowedModels = models.filter(isFreeUserAllowedAiModel).sort(byAiModelIdAsc);

  return (
    allowedModels.find((model) => !isGridAiModel(model)) ||
    allowedModels[0] ||
    null
  );
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
    return model;
  }

  return model.label || model.description || model.name;
};

/** Display name for a model known only by name (e.g. history): the label of the listed model with that name. */
export const getAiModelDisplayNameByName = (
  models: AiModelRes[],
  modelName?: string | null
) =>
  getAiModelDisplayName(
    models.find((model) => model.name === modelName) || modelName
  );

/**
 * The model paid users default to: the first premium single-image model in API order (newest first), then the
 * first single-image model. Grid models are only picked when nothing else is listed.
 */
export const pickDefaultAiModel = (models: AiModelRes[]) => {
  const singleImageModels = models.filter((model) => !isGridAiModel(model));

  return (
    singleImageModels.find((model) => model.premiumModel === true) ||
    singleImageModels[0] ||
    models[0] ||
    null
  );
};

/** Display names of every model free users may use, for the restriction copy. */
export const getFreeUserAiModelDisplayNames = (models: AiModelRes[]) =>
  models
    .filter(isFreeUserAllowedAiModel)
    .sort(byAiModelIdAsc)
    .map((model) => getAiModelDisplayName(model))
    .join(", ");
