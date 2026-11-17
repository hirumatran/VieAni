import { defineConfig } from "vitest/config";
// separate config so the slow balance simulation does not run with the normal tests
export default defineConfig({ test: { include: ["tools/**/*.ts"], testTimeout: 3_600_000 } });
