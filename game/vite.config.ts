import { defineConfig } from "vite";

// base "./" = relative paths, required because itch.io serves the game from a sub-folder.
// publicDir = the repo's assets/ (sprites, palette), served as /sprites/NN.png etc.
export default defineConfig({
  base: "./",
  publicDir: "../assets",
  server: { fs: { allow: [".."] } },
  build: { outDir: "dist", chunkSizeWarningLimit: 2000 },
});
