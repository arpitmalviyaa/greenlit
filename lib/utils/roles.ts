export type UserRole = "agency_admin" | "creator" | "manager" | "brand";

export const ROLE_LABELS: Record<UserRole, string> = {
  agency_admin: "Agency Admin",
  creator: "Creator",
  manager: "Manager",
  brand: "Brand / Client",
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  agency_admin: "Full access. Manage your agency, creators, campaigns, and billing.",
  creator: "View your deals, contracts, and compliance scans.",
  manager: "Manage assigned creators and campaigns.",
  brand: "Access the approval portal and compliance certificates.",
};

export const ROLE_DASHBOARD: Record<UserRole, string> = {
  agency_admin: "/agency",
  creator: "/creator",
  manager: "/manager",
  brand: "/brand",
};

export function canAccessModule(
  role: UserRole,
  module: "billing" | "playbook" | "contracts" | "approvals" | "scans"
): boolean {
  const access: Record<string, UserRole[]> = {
    billing: ["agency_admin"],
    playbook: ["agency_admin"],
    contracts: ["agency_admin", "manager", "creator"],
    approvals: ["agency_admin", "manager", "brand"],
    scans: ["agency_admin", "manager", "creator"],
  };
  return access[module]?.includes(role) ?? false;
}
