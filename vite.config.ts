import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export default defineConfig(({ mode }) => {
  const buildHash = crypto.randomBytes(4).toString("hex");

  return {
    plugins: [
      preact(),

      // Stamps ?v=<hash> onto local (non-CDN, non-hashed) asset references so
      // browsers always re-fetch legacy js/css after a new deploy.
      {
        name: "legacy-cache-bust",
        transformIndexHtml: {
          order: "post" as const,
          handler(html: string) {
            return html.replace(
              /((?:src|href)=")((?!https?:\/\/)(?!data:)(?!.*\/assets\/)[^"?#]+)(")/g,
              `$1$2?v=${buildHash}$3`
            );
          },
        },
      },

      // Writes dist/version.json so UpdateBanner can poll for new deploys.
      {
        name: "version-json",
        writeBundle() {
          fs.writeFileSync(
            path.resolve("dist/version.json"),
            JSON.stringify({ version: buildHash })
          );
        },
      },

      viteStaticCopy({
        targets: [
          { src: "js", dest: "." },
          { src: "css", dest: "." },
        ],
      }),
    ],

    define: {
      __APP_VERSION__: JSON.stringify(buildHash),
    },

    root: ".",
    base: process.env.VITE_BASE ?? "/emt-skill-station/",
    build: {
      outDir: "dist",
    },
  };
});
