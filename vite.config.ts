import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import crypto from "node:crypto";

// Stamps ?v=<hash> onto local (non-CDN, non-hashed) asset references so
// browsers always fetch the updated file after a new deploy.
function legacyCacheBust() {
  const hash = crypto.randomBytes(4).toString("hex");
  return {
    name: "legacy-cache-bust",
    transformIndexHtml: {
      order: "post" as const,
      handler(html: string) {
        // Match src="..." and href="..." that are local paths (no http/https/data)
        // and not already in the Vite-hashed /assets/ directory.
        return html.replace(
          /((?:src|href)=")((?!https?:\/\/)(?!data:)(?!.*\/assets\/)[^"?#]+)(")/g,
          `$1$2?v=${hash}$3`
        );
      },
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [
    preact(),
    legacyCacheBust(),
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
