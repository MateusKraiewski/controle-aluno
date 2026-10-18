import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { getDb } from "@/db";
import { getAppUrl, getBetterAuthSecret } from "@/lib/env";

const baseURL = getAppUrl();

export const auth = betterAuth({
  appName: "Aula em Dia",
  baseURL,
  basePath: "/api/auth",
  secret: getBetterAuthSecret(),
  trustedOrigins: [baseURL],
  database: drizzleAdapter(getDb(), { provider: "pg" }),
  emailAndPassword: { enabled: true },
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
});
