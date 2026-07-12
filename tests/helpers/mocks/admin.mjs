// Test double for @/lib/corpus/admin. Toggle via globalThis.__mockAdminUser.
export async function requireAdmin() {
  const u = globalThis.__mockAdminUser;
  return u === undefined ? { id: "test-admin" } : u; // null = "not an admin"
}
