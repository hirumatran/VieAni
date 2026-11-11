import { readFileSync } from "node:fs";
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

// base "./" = relative paths, required because itch.io serves the game from a sub-folder.
// publicDir = the repo's assets/ (sprites, palette, backgrounds), served as /sprites/NN.png etc.
export default defineConfig({
  base: "./",
  publicDir: "../assets",
  server: { fs: { allow: [".."] } },
  build: { outDir: "dist", chunkSizeWarningLimit: 2000 },
  plugins: [vieIndexPage()],
});
