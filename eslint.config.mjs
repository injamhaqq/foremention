import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    // Audited third-party CommonJS forks; keep scanners/tests/build active, but do not apply Foremention TypeScript lint rules.
    "vendor/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
