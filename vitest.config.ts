import path from "node:path";
import { defineConfig } from "vitest/config";

// Pure logic in src/lib is unit-tested here; screens are checked on the emulator.
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: { include: ["src/**/*.test.ts"] },
});
