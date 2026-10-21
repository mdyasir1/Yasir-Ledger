/**
 * Responsive layout check.
 *
 *   npm run visual -- http://localhost:3000
 *
 * Drives the installed Chrome through every screen, in both the light and the
 * dark theme, at a phone, a tablet and a desktop width. It fails if:
 *   * a page overflows horizontally (the classic responsive bug);
 *   * a required element is missing;
 *   * the page logs a console error;
 *   * a page is unreadable in its theme, which is checked by confirming that
 *     the text and the surface behind it are different colours.
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

const THEMES = [
  { name: "light", colorScheme: "light" },
  { name: "dark", colorScheme: "dark" },
];

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

/** Pages that are reachable without a session. */
const PUBLIC_PAGES = [
  { path: "/login", expects: ["Sign in", "Email", "Password"] },
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

/**
 * Confirms the page is readable in its theme by checking that the text colour
 * and the surface behind it are different. A white heading on a white panel
 * passes a content check but fails this one.
 */
async function contrastIsSane(page) {
  return page.evaluate(() => {
    const parse = (value) => {
      const match = value.match(/rgba?\(([^)]+)\)/);
      if (!match) return null;
      const parts = match[1].split(",").map((part) => parseFloat(part));
      if (parts.length < 3) return null;
      return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 };
    };

    const luminance = ({ r, g, b }) => {
      const channel = (value) => {
        const scaled = value / 255;
        return scaled <= 0.03928
          ? scaled / 12.92
          : ((scaled + 0.055) / 1.055) ** 2.4;
      };
      return (
        0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
      );
    };

    const headings = Array.from(
      document.querySelectorAll("h1, h2, h3, p.font-display, [class*='text-white']"),
    );

    for (const element of headings) {
      const style = getComputedStyle(element);
      const text = parse(style.color);
      if (!text || text.a < 0.1) continue;

      // Walk up for the first surface that actually paints.
      let node = element;
      let background = null;
      while (node && node !== document.documentElement) {
        const parentStyle = getComputedStyle(node);
        const candidate = parse(parentStyle.backgroundColor);
        if (candidate && candidate.a > 0.6) {
          background = candidate;
          break;
        }
        node = node.parentElement;
      }
      if (!background) continue;

      const difference = Math.abs(
        luminance(text) - luminance(background),
      );
      if (difference < 0.12) {
        return {
          ok: false,
          detail: `"${element.textContent?.trim().slice(0, 40)}" has no contrast against its surface`,
        };
      }
    }

    return { ok: true, detail: "" };
  });
}

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ channel: "chrome" });

try {
  for (const theme of THEMES) {
    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        colorScheme: theme.colorScheme,
        isMobile: viewport.isMobile,
        hasTouch: viewport.isMobile,
        deviceScaleFactor: 1,
      });

      // Public pages first, with no session.
      const publicPage = await context.newPage();
      for (const target of PUBLIC_PAGES) {
        const consoleErrors = [];
        publicPage.on("console", (message) => {
          if (message.type() === "error") consoleErrors.push(message.text());
        });

        await publicPage.goto(`${baseUrl}${target.path}`, {
          waitUntil: "networkidle",
          timeout: 30000,
        });

        const metrics = await publicPage.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          bodyText: document.body.innerText,
        }));

        const overflow = metrics.scrollWidth - metrics.clientWidth;
        check(
          `${theme.name} ${viewport.name} ${target.path} does not overflow horizontally`,
          overflow <= 1,
          `content ${metrics.scrollWidth}px vs viewport ${metrics.clientWidth}px`,
        );

        const haystack = metrics.bodyText.toLowerCase();
        const missing = target.expects.filter(
          (needle) => !haystack.includes(needle.toLowerCase()),
        );
        check(
          `${theme.name} ${viewport.name} ${target.path} shows the expected content`,
          missing.length === 0,
          missing.length === 0 ? "all present" : `missing: ${missing.join(", ")}`,
        );

        const contrast = await contrastIsSane(publicPage);
        check(
          `${theme.name} ${viewport.name} ${target.path} is readable in this theme`,
          contrast.ok,
          contrast.ok ? "contrast is sufficient" : contrast.detail,
        );

        check(
          `${theme.name} ${viewport.name} ${target.path} logs no console errors`,
          consoleErrors.length === 0,
          consoleErrors.length === 0 ? "none" : consoleErrors[0],
        );

        await publicPage.screenshot({
          path: path.join(
            outputDir,
            `${theme.name}-${viewport.name}-login.png`,
          ),
        });
      }
      await publicPage.close();

      // The protected screens, with a session.
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
          `${theme.name} ${viewport.name} ${target.path} does not overflow horizontally`,
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
          `${theme.name} ${viewport.name} ${target.path} shows the expected content`,
          missing.length === 0,
          missing.length === 0 ? "all present" : `missing: ${missing.join(", ")}`,
        );

        const contrast = await contrastIsSane(page);
        check(
          `${theme.name} ${viewport.name} ${target.path} is readable in this theme`,
          contrast.ok,
          contrast.ok ? "contrast is sufficient" : contrast.detail,
        );

        check(
          `${theme.name} ${viewport.name} ${target.path} logs no console errors`,
          consoleErrors.length === 0,
          consoleErrors.length === 0 ? "none" : consoleErrors[0],
        );

        await page.screenshot({
          path: path.join(
            outputDir,
            `${theme.name}-${viewport.name}${target.path.replace(/\//g, "-")}.png`,
          ),
        });
      }

      await context.close();
    }
  }
} finally {
  await browser.close();
}

await writeFile(
  path.join(outputDir, "report.json"),
  JSON.stringify(results, null, 2),
  "utf8",
);

console.log("\nYasir Ledger: responsive and theme check\n");
for (const result of results) {
  console.log(
    `  [${result.passed ? "PASS" : "FAIL"}] ${result.name}\n         ${result.detail}`,
  );
}
console.log(
  failures === 0
    ? `\n  All ${results.length} checks passed. Screenshots in screenshots/\n`
    : `\n  ${failures} check(s) failed.\n`,
);

process.exit(failures === 0 ? 0 : 1);
