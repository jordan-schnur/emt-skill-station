import { defineConfig } from "vitest/config";
import preact from "@preact/preset-vite";

export default defineConfig({
  plugins: [preact({ devToolsEnabled: false })],
  test: {
    environment: "jsdom",
    setupFiles: ["tests/vitest.setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    globals: true,
    coverage: {
      provider: "v8",
      include: ["src/**"],
      thresholds: {
        statements: 40,
        branches: 37,
        functions: 40,
        lines: 44,
      },
    },
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
