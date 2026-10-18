import "server-only";
import { appUrlSchema, authSecretSchema, databaseUrlSchema, logLevelSchema, parseEnv } from "./env-schema";

export function getDatabaseUrl() {
  return parseEnv("DATABASE_URL", process.env.DATABASE_URL, databaseUrlSchema);
}

export function getLogLevel() {
  return parseEnv("LOG_LEVEL", process.env.LOG_LEVEL, logLevelSchema);
}

export function getBetterAuthSecret() {
  return parseEnv("BETTER_AUTH_SECRET", process.env.BETTER_AUTH_SECRET, authSecretSchema);
}

export function getAppUrl() {
  return parseEnv("BETTER_AUTH_URL", process.env.BETTER_AUTH_URL, appUrlSchema);
}
