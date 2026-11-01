import { defineConfig } from "vitest/config";
import { precachePlugin } from "./tools/precache";

export default defineConfig({
  base: "./",
  // Static, always-needed code is split into parallel chunks (text packs, built-in library); heavy screens are lazy (src/ui/lazyScreens.ts).
  // tools/precache.ts lists every file of dist/, so all chunks are saved for offline use at install.
  build: { target: "es2022", rolldownOptions: { output: { codeSplitting: { groups: [
    { name: "i18n", test: /src\/i18n\/packs/ },
    { name: "library", test: /src\/library\/(topics|paths|inspiration|systemList|systems)/ },
  ] } } } },
  plugins: [precachePlugin()],
  test: { environment: "jsdom", include: ["tests/**/*.test.ts"], setupFiles: ["tests/setup.ts"] },
});
