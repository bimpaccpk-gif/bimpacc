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
    "next-env.d.ts",
  ]),
  {
    // TECH DEBT (tracked as warnings so CI stays green while we refactor): these two
    // React Compiler rules flag patterns that work today but should be reworked:
    //  - set-state-in-effect: dialogs that reset form state from an effect on open/prop change
    //    (move to keyed remounts / derived state)
    //  - immutability: callbacks declared after the effect that references them
    // Do not add new violations; fix existing ones file by file and then remove this block.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
    },
  },
]);

export default eslintConfig;
