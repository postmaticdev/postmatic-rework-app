export interface SchedulerDraftMarker {
  draftId: string;
  jobId: string;
  date: string;
  image: string;
  caption: string;
  createdAt: string;
}

const STORAGE_PREFIX = "postmatic:scheduler-draft-markers:";
export const SCHEDULER_DRAFT_MARKERS_CHANGED =
  "postmatic:scheduler-draft-markers-changed";

function getStorageKey(businessId: string) {
  return `${STORAGE_PREFIX}${businessId}`;
}

export function getSchedulerDraftMarkers(businessId: string) {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(getStorageKey(businessId));
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (item): item is SchedulerDraftMarker =>
        typeof item?.draftId === "string" &&
        typeof item?.jobId === "string" &&
        typeof item?.date === "string" &&
        typeof item?.image === "string" &&
        typeof item?.caption === "string" &&
        typeof item?.createdAt === "string"
    );
  } catch {
    return [];
  }
}

export function upsertSchedulerDraftMarker(
  businessId: string,
  marker: SchedulerDraftMarker
) {
  if (typeof window === "undefined") {
    return;
  }

  const existing = getSchedulerDraftMarkers(businessId);
  const next = [
    marker,
    ...existing.filter(
      (item) => item.draftId !== marker.draftId && item.jobId !== marker.jobId
    ),
  ];

  window.localStorage.setItem(getStorageKey(businessId), JSON.stringify(next));
  window.dispatchEvent(
    new CustomEvent(SCHEDULER_DRAFT_MARKERS_CHANGED, {
      detail: { businessId },
    })
  );
}

export function removeSchedulerDraftMarker(
  businessId: string,
  draftId: string
) {
  if (typeof window === "undefined") {
    return;
  }

  const next = getSchedulerDraftMarkers(businessId).filter(
    (item) => item.draftId !== draftId
  );

  window.localStorage.setItem(getStorageKey(businessId), JSON.stringify(next));
  window.dispatchEvent(
    new CustomEvent(SCHEDULER_DRAFT_MARKERS_CHANGED, {
      detail: { businessId },
    })
  );
}
