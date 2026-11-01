import { AxiosError } from "axios";
import { MemberRole, MemberStatus } from "@/models/api/member/index.type";

type SettingsTranslator = (key: string) => string;

// API error codes from the member endpoints that get a dedicated message (settings.memberErrors.*).
const MEMBER_ERROR_KEYS: Record<string, string> = {
  ONLY_OWNER_CAN_ACCESS: "memberErrors.onlyOwner",
  ONLY_OWNER_OR_ADMIN_CAN_ACCESS: "memberErrors.onlyOwnerOrAdmin",
  INVALID_ROLE: "memberErrors.invalidRole",
  OWNER_ALREADY_EXISTS: "memberErrors.invalidRole",
  MEMBER_NOT_FOUND: "memberErrors.memberNotFound",
};

export function isMemberForbiddenError(error: unknown) {
  return error instanceof AxiosError && error.response?.status === 403;
}

/**
 * Friendly message for a failed invite / edit / resend / remove request, or the raw error so
 * showToast can fall back to its generic API code translation.
 */
export function getMemberActionErrorMessage(
  error: unknown,
  t: SettingsTranslator
): unknown {
  if (!(error instanceof AxiosError)) return error;
  const code = error.response?.data?.responseMessage;
  const key = typeof code === "string" ? MEMBER_ERROR_KEYS[code] : undefined;
  if (key) return t(key);
  if (isMemberForbiddenError(error)) return t("memberErrors.forbidden");
  return error;
}

export const ROLE_OPTIONS: Array<{
  value: Exclude<MemberRole, "Owner">;
  translationKey: string;
}> = [
  { value: "Admin", translationKey: "admin" },
  { value: "Member", translationKey: "member" },
];

// A pending invitee can have an empty profile name; fall back to the email.
export function getMemberInitial(profile: { name?: string; email?: string }) {
  return (profile.name?.trim() || profile.email || "?").charAt(0).toUpperCase();
}

export function getMemberRoleLabel(
  role: MemberRole,
  t: SettingsTranslator
) {
  switch (role) {
    case "Owner":
      return t("owner");
    case "Admin":
      return t("admin");
    case "Member":
      return t("member");
    default:
      return role;
  }
}

export function getMemberStatusLabel(
  status: MemberStatus,
  t: SettingsTranslator
) {
  switch (status) {
    case "Accepted":
      return t("accepted");
    case "Pending":
      return t("pending");
    case "Rejected":
      return t("rejected");
    case "Left":
      return t("left");
    case "Kicked":
      return t("kicked");
    default:
      return status;
  }
}
