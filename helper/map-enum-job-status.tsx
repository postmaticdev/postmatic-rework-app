import { JobStatus } from "@/models/socket-content";
import { CheckCircle, Loader2, X } from "lucide-react";
import { getToastLocale } from "@/helper/api-response-message";

type Translator = (key: string) => string;
type JobStatusLabelKey = "waiting" | "done" | "processing" | "failed" | "retrying";

// Fallback when the caller does not pass a translator (keep in sync with messages `jobStatus.*`).
const FALLBACK_LABELS: Record<"id" | "en", Record<JobStatusLabelKey, string>> = {
  id: {
    waiting: "Menunggu",
    done: "Selesai",
    processing: "Dalam Proses",
    failed: "Gagal",
    retrying: "Mencoba Lagi",
  },
  en: {
    waiting: "Waiting",
    done: "Done",
    processing: "In Progress",
    failed: "Failed",
    retrying: "Retrying",
  },
};

const getColor = (status: JobStatus) => {
  switch (status) {
    case "queued":
      return "bg-gray-100 text-gray-800";
    case "done":
      return "bg-green-100 text-green-800";
    case "processing":
      return "bg-yellow-100 text-yellow-800";
    case "error":
      return "bg-red-100 text-red-800";
    case "retrying":
      return "bg-gray-100 text-gray-800";
    case "waiting_before_retry":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getLabelKey = (status: JobStatus): JobStatusLabelKey => {
  switch (status) {
    case "done":
      return "done";
    case "processing":
      return "processing";
    case "error":
      return "failed";
    case "retrying":
      return "retrying";
    case "queued":
    case "waiting_before_retry":
    default:
      return "waiting";
  }
};

/**
 * @param t root translator (`useTranslations()`); resolves `jobStatus.<key>`.
 *          Without it the label follows the active locale from the URL.
 */
const getLabel = (status: JobStatus, t?: Translator) => {
  const key = getLabelKey(status);
  if (t) return t(`jobStatus.${key}`);
  return FALLBACK_LABELS[getToastLocale()][key];
};

const getIcon = (status: JobStatus, className?: string) => {
  switch (status) {
    case "queued":
      return <Loader2 className={className} />;
    case "done":
      return <CheckCircle className={className} />;
    case "processing":
      return <Loader2 className={className} />;
    case "error":
      return <X className={className} />;
    case "retrying":
      return <Loader2 className={className} />;
    case "waiting_before_retry":
      return <Loader2 className={className} />;
    default:
      return <Loader2 className={className} />;
  }
};

export const mapEnumJobStatus = {
  getColor,
  getLabel,
  getLabelKey,
  getIcon,
};
