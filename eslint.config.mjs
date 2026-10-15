import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // NF-03: il client con secret key si importa solo nei repository.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/server/repositories/**", "src/lib/supabase/admin.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/supabase/admin",
              message:
                "Il client con secret key si usa solo in src/server/repositories (NF-03).",
            },
          ],
        },
      ],
    },
  },
  // DEV-14: nessun testo dell'interfaccia scritto direttamente nel JSX
  // (i testi stanno in src/lib/copy/it.ts). Esclusi i componenti shadcn.
  {
    files: [
      "src/app/**/*.tsx",
      "src/features/**/*.tsx",
      "src/components/shared/**/*.tsx",
    ],
    rules: {
      "react/jsx-no-literals": [
        "error",
        {
          noStrings: true,
          ignoreProps: true,
          allowedStrings: ["·", "–", "—", ":", "/"],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
