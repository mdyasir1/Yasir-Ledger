/**
 * End-to-end check against a running server.
 *
 *   npm run e2e -- http://localhost:3000
 *
 * It replays the real login form over HTTP (React's server-action encoding and
 * all), proves that a wrong password is rejected, proves that a correct
 * password issues the session cookie, and that the protected screens then
 * render the expected figures.
 */
const baseUrl = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");

const results = [];
let failures = 0;

function check(name, passed, detail = "") {
  results.push({ name, passed, detail });
  if (!passed) failures += 1;
}

function decodeHtml(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x27;/g, "'");
}

/**
 * Reads the hidden fields React puts in a server-action form.
 *
 * Only React's own action metadata is extracted. The visible fields are read
 * by the user, so they are added by the caller rather than by this script
 * would post an empty value first, and `FormData.get` returns the first
 * occurrence.
 */
function extractFormFields(html) {
  const fields = {};
  const inputPattern = /<input([^>]*)\/?>/g;
  let match;

  while ((match = inputPattern.exec(html)) !== null) {
    const attributes = match[1];
    const nameMatch = attributes.match(/name="([^"]*)"/);
    if (!nameMatch) continue;

    const name = decodeHtml(nameMatch[1]);
    if (!name.startsWith("$")) continue;

    const valueMatch = attributes.match(/value="([^"]*)"/);
    fields[name] = valueMatch ? decodeHtml(valueMatch[1]) : "";
  }

  return fields;
}

async function attemptLogin(email, password) {
  const page = await fetch(`${baseUrl}/login`, { redirect: "manual" });
  const html = await page.text();
  const fields = extractFormFields(html);

  const body = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    body.append(name, value);
  }
  body.append("email", email);
  body.append("password", password);
  body.append("next", "/dashboard");

  const response = await fetch(`${baseUrl}/login`, {
    method: "POST",
    body,
    redirect: "manual",
  });

  const setCookie = response.headers.get("set-cookie") ?? "";
  return { status: response.status, setCookie, text: await response.text() };
}

const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;

if (!adminEmail || !adminPassword) {
  console.error(
    "ADMIN_EMAIL and ADMIN_PASSWORD must be set. They are read from .env.local by the npm script.",
  );
  process.exit(1);
}

// 1. An unauthenticated request is redirected to the login screen.
const anonymous = await fetch(`${baseUrl}/dashboard`, { redirect: "manual" });
check(
  "an unauthenticated request is redirected to /login",
  anonymous.status === 307 || anonymous.status === 302,
  `status ${anonymous.status}`,
);

// 2. A wrong password is rejected.
const wrong = await attemptLogin(adminEmail, "definitely-not-the-password");
check(
  "a wrong password is rejected",
  !wrong.setCookie.includes("yasir_ledger_session") &&
    wrong.text.includes("Incorrect email or password"),
  wrong.setCookie.includes("yasir_ledger_session")
    ? "a session cookie was issued"
    : "no session cookie, error shown",
);

// 3. The correct password issues the session cookie.
const correct = await attemptLogin(adminEmail, adminPassword);
const issued = correct.setCookie.includes("yasir_ledger_session");
check(
  "the correct password issues a session cookie",
  issued,
  issued ? "cookie issued" : `status ${correct.status}`,
);

if (!issued) {
  console.log("\n  Cannot continue without a session.\n");
} else {
  const cookie = correct.setCookie.split(";")[0];

  // 4. The protected screens render the real figures.
  const screens = [
    ["/dashboard", ["Yasir Ledger", "₹1,00,000", "October 2026"]],
    ["/collections", ["Fatima", "Zeenata Badeami", "Expected"]],
    ["/members", ["Yasir", "Munni Aunty", "Zeenata Badeami"]],
    ["/timeline", ["October 2026", "July 2027", "Recipients"]],
    ["/transactions", ["Transactions", "Export CSV"]],
    ["/settings", ["Scheme", "Monthly rounds", "Managed by Yasir"]],
  ];

  for (const [path, expected] of screens) {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: { cookie },
      redirect: "manual",
    });
    const html = await response.text();
    const missing = expected.filter((needle) => !html.includes(needle));

    check(
      `${path} renders`,
      response.status === 200 && missing.length === 0,
      missing.length === 0
        ? `status ${response.status}`
        : `status ${response.status}, missing: ${missing.join(", ")}`,
    );
  }

  // 5. The unauthenticated request still fails once a session exists elsewhere.
  const stillAnonymous = await fetch(`${baseUrl}/dashboard`, {
    redirect: "manual",
  });
  check(
    "a request without a cookie is still redirected",
    stillAnonymous.status === 307 || stillAnonymous.status === 302,
    `status ${stillAnonymous.status}`,
  );
}

console.log("\nYasir Ledger: end-to-end check\n");
for (const result of results) {
  console.log(
    `  [${result.passed ? "PASS" : "FAIL"}] ${result.name}\n         ${result.detail}`,
  );
}
console.log(
  failures === 0
    ? "\n  All end-to-end checks passed.\n"
    : `\n  ${failures} check(s) failed.\n`,
);

process.exit(failures === 0 ? 0 : 1);
