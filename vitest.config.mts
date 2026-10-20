import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// `npm test` runs pure tests only; `npm run test:db` (mode "db") also runs PostgreSQL integration tests.
export default defineConfig(({ mode }) => ({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Repositories guard against client bundling; tests run them directly in Node.
      "server-only": fileURLToPath(new URL("./src/test/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node", include: ["src/**/*.test.ts"], restoreMocks: true,
    env: mode === "db" ? { RUN_DB_TESTS: "1" } : {},
    setupFiles: mode === "db" ? ["./src/test/load-env.ts"] : [],
  },
}));
