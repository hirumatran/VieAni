import { cpSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";

// The VieIndex encyclopedia page (built by scripts/build_vieindex.py) ships with the game as vieindex.html.
function vieIndexPage(): Plugin {
  const file = resolve(__dirname, "../vieindex.html");
  return {
    name: "vieindex-page",
    configureServer(server) {
      server.middlewares.use("/vieindex.html", (_req, res) => {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(readFileSync(file));
      });
    },
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "vieindex.html", source: readFileSync(file) });
    },
  };
}

// Only the files the game loads go into the build (17 Nov 2026: copying all of assets/ shipped the ~200 MB raw uploads and
// the 512-px masters to itch.io, close to its 1000-file limit). Dev server still serves the whole assets/ folder.
const SHIP = ["sprites", "backgrounds", "palette", "illustrations/web", "illustrations/manifest.json", "icons"];
function shipAssets(): Plugin {
  return {
    name: "ship-assets",
    apply: "build",
    writeBundle(opts) {
      const out = opts.dir ?? resolve(__dirname, "dist");
      for (const p of SHIP) {
        const src = resolve(__dirname, "../assets", p);
        if (existsSync(src)) cpSync(src, resolve(out, p), { recursive: true });
      }
    },
  };
}

// base "./" = relative paths, required because itch.io serves the game from a sub-folder.
// publicDir = the repo's assets/ (sprites, palette, backgrounds), served as /sprites/NN.png etc.
export default defineConfig({
  base: "./",
  publicDir: "../assets",
  server: { fs: { allow: [".."] } },
  build: { outDir: "dist", chunkSizeWarningLimit: 2000, copyPublicDir: false },
  plugins: [vieIndexPage(), shipAssets()],
});
