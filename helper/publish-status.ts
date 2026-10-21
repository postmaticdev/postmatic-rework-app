import { PostedImageContent } from "@/models/api/content/image.type";

export type PublishJobState = "success" | "failed" | "processing";
export type PublishOutcome = "published" | "partial" | "failed" | "processing";

type PublishJob = Pick<PostedImageContent, "jobStatus"> &
  Partial<Pick<PostedImageContent, "updatedAt" | "errorMessage">>;

/* Refetch interval while a publish is still running on the server */
export const PUBLISH_POLL_INTERVAL_MS = 30_000;

/* A PENDING/PROCESSING job not updated for this long was interrupted (e.g. the
   API restarted mid-publish): stop polling it and let it be retried. */
export const STALE_PUBLISH_JOB_MS = 15 * 60 * 1000;

/* Set by the worker when an earlier run stopped mid-publish */
export const PUBLISH_INTERRUPTED_ERROR = "PUBLISH_INTERRUPTED_RESULT_UNKNOWN";

export const isStalePublishJob = (
  jobStatus?: string | null,
  updatedAt?: string | null
) => {
  const status = jobStatus?.toLowerCase();
  if (status !== "pending" && status !== "processing") return false;
  const updatedAtMs = updatedAt ? new Date(updatedAt).getTime() : Number.NaN;
  return !Number.isNaN(updatedAtMs) && Date.now() - updatedAtMs > STALE_PUBLISH_JOB_MS;
};

export const getPublishJobState = (
  jobStatus?: string | null,
  updatedAt?: string | null
): PublishJobState => {
  const status = jobStatus?.toLowerCase();
  if (status === "success") return "success";
  if (status === "pending" || status === "processing") {
    return isStalePublishJob(jobStatus, updatedAt) ? "failed" : "processing";
  }
  return "failed";
};

/* The post may already be live: the user must check the account before resending */
export const isPublishResultUnknown = (job: PublishJob) =>
  job.errorMessage === PUBLISH_INTERRUPTED_ERROR ||
  isStalePublishJob(job.jobStatus, job.updatedAt);

/* Overall outcome of a post from the latest job of each platform */
export const getPublishOutcome = (
  contents: PublishJob[]
): PublishOutcome | null => {
  if (!contents.length) return null;

  const states = contents.map((content) =>
    getPublishJobState(content.jobStatus, content.updatedAt)
  );
  if (states.includes("processing")) return "processing";

  const succeeded = states.filter((state) => state === "success").length;
  if (succeeded === states.length) return "published";
  if (succeeded === 0) return "failed";
  return "partial";
};

export const hasProcessingPublishJob = (contents: PublishJob[]) =>
  contents.some(
    (content) => getPublishJobState(content.jobStatus, content.updatedAt) === "processing"
  );

/* Provider errors that are fixed by reconnecting the account */
export const isReconnectRequiredError = (message?: string | null) =>
  Boolean(message && /RECONNECT_REQUIRED|TOKEN_EXPIRED|ACCESS_TOKEN_MISSING/i.test(message));
