"use client";

type ModelRestrictionCopy = {
  title: string;
  description: string;
  topUp: string;
  useDefault: string;
};

const MODEL_RESTRICTION_COPY: Record<string, ModelRestrictionCopy> = {
  id: {
    title: "Model terbatas untuk pengguna gratis",
    description:
      "Pengguna gratis hanya bisa menggunakan model {modelName}, Top up sekarang untuk mencoba model lainnya",
    topUp: "Top up sekarang",
    useDefault: "Gunakan model biasanya",
  },
  en: {
    title: "Model restricted for free users",
    description:
      "Free users can only use the {modelName} model. Top up now to try other models.",
    topUp: "Top up now",
    useDefault: "Use the default model",
  },
  jp: {
    title: "無料ユーザー向けのモデル制限",
    description:
      "無料ユーザーは {modelName} モデルのみ使用できます。他のモデルを試すには今すぐトップアップしてください。",
    topUp: "今すぐトップアップ",
    useDefault: "通常モデルを使う",
  },
};

export const getModelRestrictionCopy = (
  locale: string,
  modelName: string
): ModelRestrictionCopy => {
  const copy = MODEL_RESTRICTION_COPY[locale] || MODEL_RESTRICTION_COPY.en;

  return {
    ...copy,
    description: copy.description.replace("{modelName}", modelName),
  };
};
