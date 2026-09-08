import path from "node:path";
import { createRequire } from "node:module";
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

const require = createRequire(import.meta.url);
const nextConfigDir = path.dirname(path.dirname(require.resolve("eslint-config-next")));
const nextPlugin = require(path.resolve(nextConfigDir, "../@next/eslint-plugin-next/dist/index.js"));

export default tseslint.config(
  {
    ignores: [
      ".next",
      "dist",
      "app-sub/**",
      "new-app/**",
      "mcp-server/**",
      "tests/**",
      "studio/**",
      "scripts/**",
      ".storybook/**",
      "supabase/functions/**",
      "storybook-static/**",
      "public/mockServiceWorker.js",
      "**/node_modules/**",
      "src/components/aceternity/**",
      "src/components/magicui/**",
      "src/components/kokonutui/**",
      "src/stories/**",
      "**/*.stories.tsx",
      "**/*.stories.ts",
      "aixsignal-webapp/**",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      "@next/next": nextPlugin,
      "react-hooks": reactHooks,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      ...reactHooks.configs.recommended.rules,
      // React Compiler 전용 규칙: 기존 코드베이스와 호환되지 않는 패턴이 많아 CI/IDE 노이즈만 유발함 (점진적 리팩터 시 재검토)
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "react-hooks/refs": "off",
      "react-hooks/static-components": "off",
      "react-hooks/incompatible-library": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/immutability": "off",
      // 레거시 Vite UI 다수가 raw <img> / 캡처용 DOM을 사용하므로 Next Image 전환은 화면별로 점진 처리한다.
      "@next/next/no-img-element": "off",
      // ✅ TypeScript strict 규칙 강화
      "@typescript-eslint/no-unused-vars": ["error", { 
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_"
      }],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/explicit-function-return-type": "off", // 너무 엄격할 수 있음
      "@typescript-eslint/no-non-null-assertion": "off",
      // ✅ Import 관련 규칙
      "no-duplicate-imports": "error",
      // ✅ TS 지시자: 기본은 금지하되, 설명(description)이 붙은 @ts-nocheck(레거시 아카이브 표시)는 허용
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-expect-error": "allow-with-description",
          "ts-ignore": true,
          "ts-nocheck": "allow-with-description",
          "ts-check": false,
          "minimumDescriptionLength": 5,
        },
      ],
      // ✅ 코드 품질 규칙
      "no-console": "off",
      "react-hooks/exhaustive-deps": "off",
      "prefer-const": "error",
      "no-var": "error",
      "eqeqeq": ["error", "always", { "null": "ignore" }],
    },
  },
);
