const groups = [
  {
    name: "frontend",
    required: ["NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
  },
  {
    name: "backend",
    required: ["DATABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "GREENLIT_JWT_SECRET"],
  },
  {
    name: "email",
    required: ["GREENLIT_EMAIL_PROVIDER"],
  },
  {
    name: "queue",
    required: ["GREENLIT_QUEUE_NAME"],
  },
  {
    name: "storage",
    required: ["GREENLIT_STORAGE_BUCKET"],
  },
  {
    name: "supabase",
    required: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"],
  },
  {
    name: "ai",
    atLeastOne: ["ANTHROPIC_API_KEY", "OPENAI_API_KEY"],
  },
  {
    name: "authentication",
    required: ["GREENLIT_JWT_SECRET"],
  },
  {
    name: "billing",
    allOrNone: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET"],
  },
  {
    name: "error-monitoring",
    optional: ["SENTRY_DSN"],
  },
];

const defaults = {
  GREENLIT_QUEUE_NAME: "greenlit-background-jobs",
  GREENLIT_EMAIL_PROVIDER: "manual",
  GREENLIT_STORAGE_BUCKET: "contracts",
};

const allowMissing = process.argv.includes("--allow-missing") || process.env.CI === "true";
const issues = [];
const notices = [];

for (const [key, value] of Object.entries(defaults)) {
  if (!process.env[key]) notices.push(`${key} defaulting to ${value}`);
}

for (const group of groups) {
  for (const key of group.required ?? []) {
    if (!hasEnv(key)) issues.push(`[${group.name}] ${key} is required`);
  }
  if (group.atLeastOne?.length && !group.atLeastOne.some(hasEnv)) {
    issues.push(`[${group.name}] one of ${group.atLeastOne.join(", ")} is required for production AI review`);
  }
  if (group.allOrNone?.length) {
    const present = group.allOrNone.filter(hasEnv);
    if (present.length > 0 && present.length < group.allOrNone.length) {
      issues.push(`[${group.name}] configure ${group.allOrNone.join(", ")} together`);
    }
  }
}

checkUrl("NEXT_PUBLIC_SUPABASE_URL", ["https:"]);
checkUrl("NEXT_PUBLIC_APP_URL", ["http:", "https:"]);
checkUrl("DATABASE_URL", ["postgres:", "postgresql:"]);
checkUrl("SENTRY_DSN", ["http:", "https:"]);
checkEnum("GREENLIT_ENV", ["development", "test", "staging", "production"]);
checkEnum("GREENLIT_EMAIL_PROVIDER", ["manual", "api"]);
checkPositiveNumber("GREENLIT_RATE_LIMIT_PER_MINUTE");
checkPositiveNumber("GREENLIT_REQUEST_TIMEOUT_SECONDS");
checkLength("GREENLIT_JWT_SECRET", 32);
checkNotEqual("SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY");

for (const plan of ["FREE", "PRO", "AGENCY", "ENTERPRISE"]) {
  if (hasEnv("RAZORPAY_KEY_ID") && !hasEnv(`RAZORPAY_PLAN_ID_${plan}`)) {
    issues.push(`[billing] RAZORPAY_PLAN_ID_${plan} is required when Razorpay subscriptions are enabled`);
  }
}

if (process.env.GREENLIT_ENV === "production" && process.env.GREENLIT_EMAIL_PROVIDER === "manual") {
  issues.push("[email] GREENLIT_EMAIL_PROVIDER=manual is non-live only; use api after connecting an authenticated upstream email adapter");
}

if (issues.length && !allowMissing) {
  console.error("Environment validation failed:");
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

if (issues.length) {
  console.log("Environment validation skipped missing deployment secrets in CI/local audit mode.");
  for (const issue of issues) console.log(`- ${issue}`);
} else {
  console.log("Environment validation passed.");
}
for (const notice of notices) console.log(`- ${notice}`);

function valueFor(key) {
  return process.env[key] || defaults[key] || "";
}

function hasEnv(key) {
  return Boolean(process.env[key]);
}

function checkUrl(key, protocols) {
  const value = valueFor(key);
  if (!value) return;
  try {
    const url = new URL(value);
    if (!protocols.includes(url.protocol)) issues.push(`${key} must use ${protocols.join(" or ")}`);
  } catch {
    issues.push(`${key} must be an absolute URL`);
  }
}

function checkEnum(key, allowed) {
  const value = valueFor(key);
  if (value && !allowed.includes(value)) issues.push(`${key} must be one of: ${allowed.join(", ")}`);
}

function checkPositiveNumber(key) {
  const value = process.env[key];
  if (value && (!Number.isFinite(Number(value)) || Number(value) < 1)) issues.push(`${key} must be a positive number`);
}

function checkLength(key, min) {
  const value = valueFor(key);
  if (value && value.length < min) issues.push(`${key} must be at least ${min} characters`);
}

function checkNotEqual(leftKey, rightKey) {
  const left = valueFor(leftKey);
  const right = valueFor(rightKey);
  if (left && right && left === right) issues.push(`${leftKey} must not equal ${rightKey}`);
}
