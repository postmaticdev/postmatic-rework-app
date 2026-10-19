import { JobType } from "@/models/socket-content";
import { getToastLocale } from "@/helper/api-response-message";

type Translator = (key: string) => string;
type JobTypeLabelKey =
  | "knowledge"
  | "rss"
  | "regenerate"
  | "mask"
  | "mockKnowledge"
  | "mockRegenerate"
  | "mockRss"
  | "mockMask"
  | "unknown";

// Fallback when the caller does not pass a translator (keep in sync with messages `jobType.*`).
const FALLBACK_LABELS: Record<"id" | "en", Record<JobTypeLabelKey, string>> = {
  id: {
    knowledge: "Pembuatan Dasar",
    rss: "Pembuatan RSS",
    regenerate: "Buat Ulang",
    mask: "Buat Ulang dengan Mask",
    mockKnowledge: "Pembuatan Mock",
    mockRegenerate: "Buat Ulang Mock",
    mockRss: "Pembuatan RSS Mock",
    mockMask: "Buat Ulang dengan Mask (Mock)",
    unknown: "Tidak Diketahui",
  },
  en: {
    knowledge: "Basic Generation",
    rss: "RSS Generation",
    regenerate: "Regenerate",
    mask: "Mask Regenerate",
    mockKnowledge: "Mock Generation",
    mockRegenerate: "Mock Regenerate",
    mockRss: "Mock RSS Generation",
    mockMask: "Mock Mask Regenerate",
    unknown: "Unknown",
  },
};

const getLabelKey = (type: JobType): JobTypeLabelKey => {
  switch (type) {
    case "knowledge":
      return "knowledge";
    case "rss":
      return "rss";
    case "regenerate":
      return "regenerate";
    case "mask":
      return "mask";
    case "mock_knowledge":
      return "mockKnowledge";
    case "mock_regenerate":
      return "mockRegenerate";
    case "mock_rss":
      return "mockRss";
    case "mock_mask":
      return "mockMask";
    default:
      return "unknown";
  }
};

/**
 * @param t root translator (`useTranslations()`); resolves `jobType.<key>`.
 *          Without it the label follows the active locale from the URL.
 */
const getLabel = (type: JobType, t?: Translator) => {
  const key = getLabelKey(type);
  if (t) return t(`jobType.${key}`);
  return FALLBACK_LABELS[getToastLocale()][key];
};

export const mapEnumJobType = {
  getLabel,
  getLabelKey,
};
