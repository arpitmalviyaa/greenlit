export class ConfigValidationError extends Error {}

export interface ProductionConfig {
  environment: "development" | "test" | "staging" | "production";
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  jwtSecret: string;
  storageBucket: string;
  emailProvider: "manual" | "api";
  queueName: string;
  publicBaseUrl: string;
  databaseUrl: string;
  rateLimitPerMinute: number;
  requestTimeoutSeconds: number;
  anthropicApiKey?: string;
  openaiApiKey?: string;
  razorpayKeyId?: string;
  razorpayKeySecret?: string;
  razorpayWebhookSecret?: string;
  sentryDsn?: string;
  debug: boolean;
}

export function productionConfigFromEnv(env: NodeJS.ProcessEnv = process.env): ProductionConfig {
  const config: ProductionConfig = {
    environment: env.GREENLIT_ENV as ProductionConfig["environment"] ?? "development",
    supabaseUrl: required(env, "NEXT_PUBLIC_SUPABASE_URL"),
    supabaseAnonKey: required(env, "NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    supabaseServiceRoleKey: required(env, "SUPABASE_SERVICE_ROLE_KEY"),
    jwtSecret: required(env, "GREENLIT_JWT_SECRET"),
    storageBucket: env.GREENLIT_STORAGE_BUCKET ?? "contracts",
    emailProvider: (env.GREENLIT_EMAIL_PROVIDER ?? "manual") as ProductionConfig["emailProvider"],
    queueName: env.GREENLIT_QUEUE_NAME ?? "greenlit-background-jobs",
    publicBaseUrl: required(env, "NEXT_PUBLIC_APP_URL"),
    databaseUrl: required(env, "DATABASE_URL"),
    rateLimitPerMinute: numberEnv(env.GREENLIT_RATE_LIMIT_PER_MINUTE, 120),
    requestTimeoutSeconds: numberEnv(env.GREENLIT_REQUEST_TIMEOUT_SECONDS, 30),
    anthropicApiKey: optional(env, "ANTHROPIC_API_KEY"),
    openaiApiKey: optional(env, "OPENAI_API_KEY"),
    razorpayKeyId: optional(env, "RAZORPAY_KEY_ID"),
    razorpayKeySecret: optional(env, "RAZORPAY_KEY_SECRET"),
    razorpayWebhookSecret: optional(env, "RAZORPAY_WEBHOOK_SECRET"),
    sentryDsn: optional(env, "SENTRY_DSN"),
    debug: env.DEBUG === "true",
  };
  validateProductionConfig(config);
  return config;
}

export function validateProductionConfig(config: ProductionConfig): void {
  if (!["development", "test", "staging", "production"].includes(config.environment)) {
    throw new ConfigValidationError("GREENLIT_ENV must be development, test, staging, or production");
  }
  if (!["manual", "api"].includes(config.emailProvider)) {
    throw new ConfigValidationError("GREENLIT_EMAIL_PROVIDER must be manual or api");
  }
  for (const [name, value] of Object.entries({
    NEXT_PUBLIC_SUPABASE_URL: config.supabaseUrl,
    NEXT_PUBLIC_APP_URL: config.publicBaseUrl,
    DATABASE_URL: config.databaseUrl,
  })) {
    try {
      const url = new URL(value);
      if (!["http:", "https:", "postgres:", "postgresql:"].includes(url.protocol)) throw new Error("bad protocol");
    } catch {
      throw new ConfigValidationError(`${name} must be an absolute URL`);
    }
  }
  if (config.jwtSecret.length < 32) throw new ConfigValidationError("GREENLIT_JWT_SECRET must be at least 32 characters");
  if (config.queueName.length > 120) throw new ConfigValidationError("GREENLIT_QUEUE_NAME must be 120 characters or fewer");
  if (config.rateLimitPerMinute < 1) throw new ConfigValidationError("GREENLIT_RATE_LIMIT_PER_MINUTE must be positive");
  if (config.requestTimeoutSeconds < 1) throw new ConfigValidationError("GREENLIT_REQUEST_TIMEOUT_SECONDS must be positive");
  if (config.environment === "production") {
    if (!config.anthropicApiKey && !config.openaiApiKey) {
      throw new ConfigValidationError("ANTHROPIC_API_KEY or OPENAI_API_KEY is required for production AI review");
    }
    if (config.emailProvider === "manual") {
      throw new ConfigValidationError("GREENLIT_EMAIL_PROVIDER=manual is non-live only");
    }
    if (config.supabaseServiceRoleKey === config.supabaseAnonKey) {
      throw new ConfigValidationError("SUPABASE_SERVICE_ROLE_KEY must not equal NEXT_PUBLIC_SUPABASE_ANON_KEY");
    }
    if (!config.queueName) {
      throw new ConfigValidationError("GREENLIT_QUEUE_NAME is required when email ingestion is provider-backed");
    }
    if ((config.razorpayKeyId || config.razorpayKeySecret || config.razorpayWebhookSecret) &&
      !(config.razorpayKeyId && config.razorpayKeySecret && config.razorpayWebhookSecret)) {
      throw new ConfigValidationError("RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, and RAZORPAY_WEBHOOK_SECRET must be configured together");
    }
  }
}

function required(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key];
  if (!value) throw new ConfigValidationError(`${key} is required`);
  return value;
}

function optional(env: NodeJS.ProcessEnv, key: string): string | undefined {
  const value = env[key];
  return value && value.trim() ? value : undefined;
}

function numberEnv(value: string | undefined, fallback: number): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed)) throw new ConfigValidationError("Numeric environment variable is invalid");
  return parsed;
}
