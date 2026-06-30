export type Role = "creator" | "manager" | "lawyer" | "admin";

const permissions: Record<Role, Set<string>> = {
  creator: new Set(["contract:read", "comment:create", "export:read"]),
  manager: new Set(["contract:read", "contract:write", "comment:create", "review:create", "export:create", "export:read", "job:read"]),
  lawyer: new Set(["contract:read", "contract:write", "comment:create", "review:create", "revision:create", "export:create", "export:read", "job:read"]),
  admin: new Set(["*"]),
};

export function isAllowed(role: Role, permission: string): boolean {
  const allowed = permissions[role];
  return allowed.has("*") || allowed.has(permission);
}

export function assertAllowed(role: Role, permission: string): void {
  if (!isAllowed(role, permission)) throw new Error(`${role} is not allowed to perform ${permission}`);
}
