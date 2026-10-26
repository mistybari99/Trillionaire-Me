import { defineConfig } from "vitest/config";
import { precachePlugin } from "./tools/precache";

export default defineConfig({
  base: "./",
  build: { target: "es2022" },
  plugins: [precachePlugin()],
  test: { environment: "jsdom", include: ["tests/**/*.test.ts"] },
});
