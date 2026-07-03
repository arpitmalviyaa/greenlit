import { chromium } from "playwright";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const baseURL = process.env.GREENLIT_BASE_URL ?? "https://app.getgreenlit.in";
const blockSupabase = process.env.GREENLIT_BLOCK_SUPABASE === "1";
const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "");
const email = process.env.GREENLIT_AUDIT_EMAIL ?? `greenlit.audit.${stamp}@gmail.com`;
const password = process.env.GREENLIT_AUDIT_PASSWORD ?? `GreenlitAudit${stamp}!`;
const name = "Greenlit Audit";

const events = [];
const pagesTested = new Set();
const buttonsTested = [];
const broken = [];

function record(type, data) {
  events.push({ ts: new Date().toISOString(), type, ...data });
}

async function attachPage(page) {
  page.on("console", (msg) => {
    if (["error", "warning"].includes(msg.type())) {
      record("console", { level: msg.type(), text: msg.text(), url: page.url() });
    }
  });
  page.on("pageerror", (error) => {
    record("pageerror", { message: error.message, url: page.url() });
  });
  page.on("response", (response) => {
    const status = response.status();
    if (status >= 400) {
      record("bad-response", { status, method: response.request().method(), url: response.url(), page: page.url() });
    }
  });
  page.on("requestfailed", (request) => {
    record("requestfailed", {
      method: request.method(),
      url: request.url(),
      failure: request.failure()?.errorText ?? "unknown",
      page: page.url(),
    });
  });
}

async function goto(page, path) {
  const target = path.startsWith("http") ? path : `${baseURL}${path}`;
  const response = await page.goto(target, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  pagesTested.add(new URL(page.url()).pathname);
  record("goto", { path, finalUrl: page.url(), status: response?.status() ?? null });
}

async function clickByRole(page, namePattern, label, options = {}) {
  const locator = page.getByRole(options.role ?? "button", { name: namePattern }).first();
  const count = await locator.count();
  if (!count) {
    broken.push({ label, reason: "not found", url: page.url() });
    return false;
  }
  const disabled = await locator.isDisabled().catch(() => false);
  if (disabled && !options.allowDisabled) {
    broken.push({ label, reason: "disabled without expected disabled state", url: page.url() });
    return false;
  }
  buttonsTested.push({ label, url: page.url() });
  await locator.click({ timeout: 10_000 });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  return true;
}

async function fillIfPresent(page, selector, value) {
  const locator = page.locator(selector).first();
  if (await locator.count()) await locator.fill(value);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  if (blockSupabase) {
    await context.route("https://*.supabase.co/**", (route) => route.abort("failed"));
  }
  const page = await context.newPage();
  await attachPage(page);

  await goto(page, "/");
  const rootLinks = await page.getByRole("link").evaluateAll((els) => els.map((el) => el.textContent?.trim()).filter(Boolean));
  record("root-links", { links: rootLinks });

  await goto(page, "/signup");
  await fillIfPresent(page, "#name", name);
  await fillIfPresent(page, "#email", email);
  await fillIfPresent(page, "#password", password);
  await clickByRole(page, /create account/i, "signup:create account");
  await page.waitForTimeout(2_000);
  record("signup-state", { url: page.url(), text: (await page.locator("body").innerText()).slice(0, 1200) });

  await clickByRole(page, /continue/i, "signup:jurisdiction continue").catch((error) => {
    broken.push({ label: "signup:jurisdiction continue", reason: error.message, url: page.url() });
  });
  await page.waitForTimeout(1_000);

  await goto(page, "/login");
  await fillIfPresent(page, "#email", email);
  await fillIfPresent(page, "#password", password);
  await clickByRole(page, /sign in/i, "login:sign in");
  await page.waitForTimeout(3_000);
  record("login-state", { url: page.url(), text: (await page.locator("body").innerText()).slice(0, 1200) });

  await goto(page, "/agency/onboarding");
  await fillIfPresent(page, "#agencyName", `Greenlit Audit ${stamp}`);
  await clickByRole(page, /create workspace/i, "onboarding:create workspace").catch((error) => {
    broken.push({ label: "onboarding:create workspace", reason: error.message, url: page.url() });
  });
  await page.waitForTimeout(2_000);
  record("onboarding-state", { url: page.url(), text: (await page.locator("body").innerText()).slice(0, 1200) });

  await goto(page, "/agency");
  const quickLinks = await page.getByRole("link").evaluateAll((els) => els.map((el) => ({
    text: el.textContent?.trim(),
    href: el.href,
  })).filter((x) => x.text));
  record("agency-links", { links: quickLinks });
  for (const label of ["Upload Contract", "Deal Room", "Review Approvals", "Legal Playbook"]) {
    const link = page.getByRole("link", { name: new RegExp(label, "i") }).first();
    if (await link.count()) {
      buttonsTested.push({ label: `agency:${label}`, url: page.url() });
      await link.click();
      await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
      record("agency-click", { label, url: page.url(), text: (await page.locator("body").innerText()).slice(0, 600) });
      await goto(page, "/agency");
    } else {
      broken.push({ label: `agency:${label}`, reason: "not found", url: page.url() });
    }
  }

  await goto(page, "/agency/counsel");
  const tmp = await mkdtemp(join(tmpdir(), "greenlit-audit-"));
  const pdfPath = join(tmp, "audit-contract.pdf");
  await writeFile(pdfPath, "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");
  const chooserPromise = page.waitForEvent("filechooser", { timeout: 10_000 }).catch((error) => {
    broken.push({ label: "counsel:file chooser", reason: error.message, url: page.url() });
    return null;
  });
  await page.locator("text=/Drop a contract here/i").click({ timeout: 10_000 }).catch((error) => {
    broken.push({ label: "counsel:drop zone click", reason: error.message, url: page.url() });
  });
  const chooser = await chooserPromise;
  if (chooser) {
    await chooser.setFiles(pdfPath);
    await fillIfPresent(page, "input[type='text']", `Audit Contract ${stamp}`);
    await clickByRole(page, /upload and analyse/i, "counsel:upload and analyse").catch((error) => {
      broken.push({ label: "counsel:upload and analyse", reason: error.message, url: page.url() });
    });
    await page.waitForTimeout(8_000);
    record("counsel-upload-state", { url: page.url(), text: (await page.locator("body").innerText()).slice(0, 1600) });
  }

  await goto(page, "/api/email/ingest");
  record("email-ingest-get", { url: page.url(), text: (await page.locator("body").innerText()).slice(0, 600) });

  await goto(page, "/api/billing/status");
  record("billing-status-get", { url: page.url(), text: (await page.locator("body").innerText()).slice(0, 600) });

  await browser.close();
  const report = {
    baseURL,
    blockSupabase,
    email,
    pagesTested: Array.from(pagesTested),
    buttonsTested,
    broken,
    events,
  };
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
