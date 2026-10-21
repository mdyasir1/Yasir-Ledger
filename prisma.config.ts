import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

// `.env.local` holds the real secrets and takes precedence over `.env`.
// dotenv never overwrites a variable that is already set, so loading
// `.env.local` first gives it priority.
loadEnv({ path: ".env.local", quiet: true });
loadEnv({ path: ".env", quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // The CLI (generate / db pull) prefers the direct, session-mode connection.
    // The application itself connects through DATABASE_URL via the pg driver adapter.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
