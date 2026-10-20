import { existsSync } from "node:fs";

// Next skips .env.local when NODE_ENV=test; integration tests read the same ignored file explicitly.
if (!process.env.DATABASE_URL && existsSync(".env.local")) process.loadEnvFile(".env.local");
