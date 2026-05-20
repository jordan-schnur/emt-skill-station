import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig(({ mode }) => ({
  plugins: [
    preact(),
    viteStaticCopy({
      targets: [
        { src: "js", dest: "." },
        { src: "css", dest: "." },
      ],
    }),
  ],
  root: ".",
  base: process.env.VITE_BASE ?? "/emt-skill-station/",
  build: {
    outDir: "dist",
  },
}));
