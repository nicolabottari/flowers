import { defineConfig } from "tsup";

// ESM only, with types. A generative engine has no CommonJS legacy to
// carry, and an unminified dist stays readable for anyone who opens it.
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  treeshake: true,
  minify: false,
});
