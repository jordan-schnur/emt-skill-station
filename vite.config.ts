import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

export default defineConfig(({ mode }) => ({
  plugins: [preact()],
  root: ".",
  base: process.env.VITE_BASE ?? "/emt-skill-station/",
  build: {
    outDir: "dist",
  },
}));
