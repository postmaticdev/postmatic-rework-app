import {
  BusinessKnowledgePld,
  BusinessKnowledgeRes,
} from "@/models/api/knowledge/business.type";
import {
  RoleKnowledgePld,
  RoleKnowledgeRes,
} from "@/models/api/knowledge/role.type";

export const LEGACY_UNUSED_VALUE = "-";

export const isLegacyUnusedValue = (value?: string | null) =>
  !value || value.trim() === "" || value.trim() === LEGACY_UNUSED_VALUE;

export const normalizeBusinessKnowledge = (
  business?: Partial<BusinessKnowledgePld | BusinessKnowledgeRes>
): BusinessKnowledgePld => ({
  primaryLogo: business?.primaryLogo ?? null,
  name: business?.name ?? "",
  category: business?.category ?? "",
  description: business?.description ?? "",
  visionMission: LEGACY_UNUSED_VALUE,
  website: isLegacyUnusedValue(business?.website) ? "" : business?.website ?? "",
  businessPhone:
    "businessPhone" in (business ?? {}) && business?.businessPhone
      ? business.businessPhone
      : "",
  countryCode:
    "countryCode" in (business ?? {}) && business?.countryCode
      ? business.countryCode.startsWith("+")
        ? business.countryCode
        : `+${business.countryCode}`
      : "+62",
  location: LEGACY_UNUSED_VALUE,
  uniqueSellingPoint: LEGACY_UNUSED_VALUE,
  colorTone: business?.colorTone ?? "",
});

export const normalizeRoleKnowledge = (
  role?: Partial<RoleKnowledgePld | RoleKnowledgeRes>
): RoleKnowledgePld => ({
  targetAudience: role?.targetAudience ?? "",
  tone: role?.tone ?? "",
  audiencePersona: LEGACY_UNUSED_VALUE,
  hashtags: Array.isArray(role?.hashtags)
    ? role.hashtags.map((hashtag) => hashtag.replace(/^#/, ""))
    : [],
  callToAction: LEGACY_UNUSED_VALUE,
  goals: LEGACY_UNUSED_VALUE,
});

export const prepareBusinessKnowledgePayload = (
  business: BusinessKnowledgePld
): BusinessKnowledgePld => ({
  ...business,
  visionMission: LEGACY_UNUSED_VALUE,
  location: LEGACY_UNUSED_VALUE,
  uniqueSellingPoint: LEGACY_UNUSED_VALUE,
});

export const prepareRoleKnowledgePayload = (
  role: RoleKnowledgePld
): RoleKnowledgePld => ({
  ...role,
  audiencePersona: LEGACY_UNUSED_VALUE,
  callToAction: LEGACY_UNUSED_VALUE,
  goals: LEGACY_UNUSED_VALUE,
});
