// Test double for @/lib/supabase/server. Routes call
//   service.from(table).select(...).eq(...).order(...).limit(1).maybeSingle()
// The chain is a self-returning proxy; terminal methods read fixtures from
// globalThis.__mockRows[table].
function chain(table) {
  const rows = () => (globalThis.__mockRows ?? {})[table] ?? [];
  const c = {};
  for (const m of ["select", "eq", "is", "in", "not", "order", "limit", "update", "insert", "delete", "textSearch"]) {
    c[m] = () => c;
  }
  c.maybeSingle = async () => ({ data: rows()[0] ?? null, error: null });
  c.single = async () => ({ data: rows()[0] ?? null, error: rows()[0] ? null : { message: "not found" } });
  c.then = (res) => res({ data: rows(), error: null }); // awaited chain = list
  return c;
}
export async function createClient() {
  return { from: chain, auth: { getUser: async () => ({ data: { user: { id: "test-admin" } } }) } };
}
export async function createServiceClient() {
  return { from: chain, rpc: async () => ({ data: [], error: null }), storage: { from: () => ({}) } };
}
