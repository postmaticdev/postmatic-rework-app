import { MemberRole, MemberStatus } from "@/models/api/member/index.type";

type SettingsTranslator = (key: string) => string;

export const ROLE_OPTIONS: Array<{
  value: Exclude<MemberRole, "Owner">;
  translationKey: string;
}> = [
  { value: "Admin", translationKey: "admin" },
  { value: "Member", translationKey: "member" },
];

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
