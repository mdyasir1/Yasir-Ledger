/**
 * Responsive layout check.
 *
 *   npm run visual -- http://localhost:3000
 *
 * Drives the installed Chrome through every screen at a phone size and a
 * desktop size, and fails if:
 *   * a page overflows horizontally (the classic responsive bug);
 *   * a required element is missing;
 *   * the page logs a console error.
 *
 * Screenshots are written to `screenshots/` so the layouts can be inspected.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHmac } from "node:crypto";
import { config as loadEnv } from "dotenv";
import { chromium } from "playwright";

loadEnv({ path: ".env.local", quiet: true });
loadEnv({ path: ".env", quiet: true });

const baseUrl = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const outputDir = path.resolve(process.cwd(), "screenshots");

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844, isMobile: true },
  { name: "tablet", width: 768, height: 1024, isMobile: false },
  { name: "desktop", width: 1280, height: 900, isMobile: false },
];

const PAGES = [
  { path: "/dashboard", expects: ["Expected", "Collected", "Outstanding"] },
  { path: "/collections", expects: ["Fatima", "Zeenata Badeami", "Expected"] },
  { path: "/members", expects: ["Fatima", "Zeenata Badeami"] },
  { path: "/timeline", expects: ["October 2026", "July 2027", "Recipients"] },
  { path: "/transactions", expects: ["Transactions", "Export CSV"] },
  { path: "/settings", expects: ["Scheme", "Monthly rounds"] },
];

const results = [];
let failures = 0;

function check(name, passed, detail = "") {
  results.push({ name, passed, detail });
  if (!passed) failures += 1;
}

function sessionCookie() {
  const secret = process.env.SESSION_SECRET;
  const email = process.env.ADMIN_EMAIL;
  const now = Date.now();

  const body = Buffer.from(
    JSON.stringify({ email, issuedAt: now, expiresAt: now + 3600000 }),
    "utf8",
  ).toString("base64url");

  const signature = createHmac("sha256", secret).update(body).digest("base64url");

  return {
    name: "yasir_ledger_session",
    value: `${body}.${signature}`,
    domain: "localhost",
    path: "/",
  };
}

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ channel: "chrome" });

try {
  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.isMobile,
      hasTouch: viewport.isMobile,
      deviceScaleFactor: 1,
    });

    await context.addCookies([sessionCookie()]);

    const page = await context.newPage();
    const consoleErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => consoleErrors.push(error.message));

    for (const target of PAGES) {
      consoleErrors.length = 0;

      await page.goto(`${baseUrl}${target.path}`, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      const metrics = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        bodyText: document.body.innerText,
      }));

      const overflow = metrics.scrollWidth - metrics.clientWidth;
      check(
        `${viewport.name} ${target.path} does not overflow horizontally`,
        overflow <= 1,
        `content ${metrics.scrollWidth}px vs viewport ${metrics.clientWidth}px`,
      );

      // innerText reflects CSS text-transform, so the comparison is
      // case-insensitive: a label rendered in capitals is still present.
      const haystack = metrics.bodyText.toLowerCase();
      const missing = target.expects.filter(
        (needle) => !haystack.includes(needle.toLowerCase()),
      );
      check(
        `${viewport.name} ${target.path} shows the expected content`,
        missing.length === 0,
        missing.length === 0 ? "all present" : `missing: ${missing.join(", ")}`,
      );

      check(
        `${viewport.name} ${target.path} logs no console errors`,
        consoleErrors.length === 0,
        consoleErrors.length === 0 ? "none" : consoleErrors[0],
      );

      const file = path.join(
        outputDir,
        `${viewport.name}${target.path.replace(/\//g, "-")}.png`,
      );
      await page.screenshot({ path: file, fullPage: false });
    }

    await context.close();
  }
} finally {
  await browser.close();
}

await writeFile(
  path.join(outputDir, "report.json"),
  JSON.stringify(results, null, 2),
  "utf8",
);

console.log("\nYasir Ledger: responsive layout check\n");
for (const result of results) {
  console.log(
    `  [${result.passed ? "PASS" : "FAIL"}] ${result.name}\n         ${result.detail}`,
  );
}
console.log(
  failures === 0
    ? `\n  All ${results.length} layout checks passed. Screenshots in screenshots/\n`
    : `\n  ${failures} layout check(s) failed.\n`,
);

process.exit(failures === 0 ? 0 : 1);
