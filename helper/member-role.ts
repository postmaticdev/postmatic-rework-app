const KNOWN_ROLES: Record<string, "owner" | "admin" | "member"> = {
  owner: "owner",
  admin: "admin",
  member: "member",
};

/**
 * Translated label for a business member role coming from the API ("Owner" | "Admin" | "Member").
 * @param t translator scoped to the `memberRole` namespace
 */
export const getMemberRoleLabel = (
  role: string | null | undefined,
  t: (key: "owner" | "admin" | "member") => string
) => {
  if (!role) return "";
  const key = KNOWN_ROLES[role.toLowerCase()];
  return key ? t(key) : role;
};
