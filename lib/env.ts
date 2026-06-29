export class StartupConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StartupConfigError";
  }
}

export function requiredEnv(key: string, env: NodeJS.ProcessEnv = process.env): string {
  const value = env[key];
  if (!value) throw new StartupConfigError(`${key} is required`);
  return value;
}

export function publicSupabaseEnv(env: NodeJS.ProcessEnv = process.env) {
  return {
    url: requiredEnv("NEXT_PUBLIC_SUPABASE_URL", env),
    anonKey: requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", env),
  };
}

export function serviceSupabaseEnv(env: NodeJS.ProcessEnv = process.env) {
  return {
    ...publicSupabaseEnv(env),
    serviceRoleKey: requiredEnv("SUPABASE_SERVICE_ROLE_KEY", env),
  };
}

export function startupErrorResponse(error: unknown): Response {
  if (error instanceof StartupConfigError) {
    return Response.json({ error: "Service is not configured", code: "CONFIGURATION_ERROR" }, { status: 503 });
  }
  throw error;
}
