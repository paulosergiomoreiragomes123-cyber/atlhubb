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
    rules: {
      // O projeto já usa `_prevState` como convenção pro parâmetro não usado
      // de useActionState (ex.: importProductsCsvAction) — sem isso, o aviso
      // só não aparecia por coincidência (o rule default "after-used" ignora
      // args não usados antes do último usado, o que só funciona quando há
      // um segundo parâmetro usado depois). Deixa a convenção explícita.
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
]);

export default eslintConfig;
