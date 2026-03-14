import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import path from 'path';
import localMissingHookRule from './eslint-rules/no-missing-react-hook-imports.js';

export default tseslint.config(
  { ignores: ["dist", "sinapi", ".next", "CastorWorks-LandingPage/.next"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      local: {
        rules: {
          'no-missing-react-hook-imports': localMissingHookRule,
        },
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // enable our custom rule as an error (namespaced under `local`)
      'local/no-missing-react-hook-imports': 'error',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/incompatible-library': 'off', // TanStack Virtual is known to be incompatible with React Compiler, but safe to use
      "react-refresh/only-export-components": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
);
