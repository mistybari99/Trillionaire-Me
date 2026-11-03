import { defineConfig } from "vitest/config";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { precachePlugin } from "./tools/precache";

// Build stamp shown in Settings > About, so the owner can see which build the phone is running (date only, so the same commit builds the same file).
const sha = (() => { try { return process.env.GITHUB_SHA?.slice(0, 7) || execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); } catch { return "dev"; } })();
const version = (JSON.parse(readFileSync("package.json", "utf8")) as { version: string }).version;

export default defineConfig({
  base: "./",
  // Static, always-needed code is split into parallel chunks (text packs, built-in library); heavy screens are lazy (src/ui/lazyScreens.ts).
  // tools/precache.ts lists every file of dist/, so all chunks are saved for offline use at install.
  build: { target: "es2022", rolldownOptions: { output: { codeSplitting: { groups: [
    { name: "i18n", test: /src\/i18n\/packs/ },
    { name: "library", test: /src\/library\/(topics|paths|inspiration|systemList|systems)/ },
  ] } } } },
  define: { __APP_VERSION__: JSON.stringify(version), __APP_SHA__: JSON.stringify(sha), __APP_BUILT__: JSON.stringify(new Date().toISOString().slice(0, 10)) },
  plugins: [precachePlugin()],
  test: { environment: "jsdom", include: ["tests/**/*.test.ts"], setupFiles: ["tests/setup.ts"] },
});
