import { PostedImageContent } from "@/models/api/content/image.type";

export type PublishJobState = "success" | "failed" | "processing";
export type PublishOutcome = "published" | "partial" | "failed" | "processing";

/* Refetch interval while a publish is still running on the server */
export const PUBLISH_POLL_INTERVAL_MS = 30_000;

export const getPublishJobState = (jobStatus?: string | null): PublishJobState => {
  const status = jobStatus?.toLowerCase();
  if (status === "success") return "success";
  if (status === "pending" || status === "processing") return "processing";
  return "failed";
};

/* Overall outcome of a post from the latest job of each platform */
export const getPublishOutcome = (
  contents: Pick<PostedImageContent, "jobStatus">[]
): PublishOutcome | null => {
  if (!contents.length) return null;

  const states = contents.map((content) => getPublishJobState(content.jobStatus));
  if (states.includes("processing")) return "processing";

  const succeeded = states.filter((state) => state === "success").length;
  if (succeeded === states.length) return "published";
  if (succeeded === 0) return "failed";
  return "partial";
};

export const hasProcessingPublishJob = (
  contents: Pick<PostedImageContent, "jobStatus">[]
) => contents.some((content) => getPublishJobState(content.jobStatus) === "processing");

/* Provider errors that are fixed by reconnecting the account */
export const isReconnectRequiredError = (message?: string | null) =>
  Boolean(message && /RECONNECT_REQUIRED|TOKEN_EXPIRED|ACCESS_TOKEN_MISSING/i.test(message));
