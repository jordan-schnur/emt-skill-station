import { defineConfig } from "vitest/config";
import preact from "@preact/preset-vite";

export default defineConfig({
  plugins: [preact({ devToolsEnabled: false })],
  test: {
    environment: "jsdom",
    setupFiles: ["tests/vitest.setup.ts"],
    include: ["tests/lib/**/*.test.ts", "tests/views/**/*.test.tsx"],
    globals: true,
    coverage: {
      provider: "v8",
      include: ["src/**"],
      thresholds: {
        statements: 44,
        branches: 42,
        functions: 36,
        lines: 46,
      },
    },
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
