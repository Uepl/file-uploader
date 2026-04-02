import typescriptEslintParser from "@typescript-eslint/parser";
import typescriptEslintPlugin from "@typescript-eslint/eslint-plugin";
import importPlugin from "eslint-plugin-import";

export default [
  {
    ignores: ["node_modules/**", "dist/**", "client/**", ".vscode/**"],
  },
  {
    files: [
      "server/src/**/*.ts",
      "services/**/src/**/*.ts",
      "packages/shared/src/**/*.ts",
    ],
    languageOptions: {
      parser: typescriptEslintParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
      },
      globals: {
        console: "readonly",
        process: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": typescriptEslintPlugin,
      import: importPlugin,
    },
    rules: {
      // Enforce .js extensions on relative imports
      "import/extensions": [
        "error",
        "always",
        {
          ignorePackages: true,
          js: "always",
          ts: "never",
        },
      ],
      // TypeScript rules
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "no-console": "off",
      "import/no-unresolved": "off",
    },
  },
];
