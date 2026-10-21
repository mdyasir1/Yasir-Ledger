import { config as loadEnv } from "dotenv";

// Load the local environment before any test module is imported, so that
// server-only configuration such as SESSION_SECRET is available to the mocks.
loadEnv({ path: ".env.local", quiet: true });
loadEnv({ path: ".env", quiet: true });
