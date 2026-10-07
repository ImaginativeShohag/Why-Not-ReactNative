// https://docs.expo.dev/guides/using-eslint/
/* global __dirname */
const fs = require("fs");
const path = require("path");
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
const eslintPluginPrettierRecommended = require("eslint-plugin-prettier/recommended");

// Isolation rule 1 (AGENTS.md): a project may not import another project.
// The composition root (src/app/_layout.tsx, +native-intent.tsx) is exempt.
const SLUGS = fs
  .readdirSync(path.join(__dirname, "src/projects"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

const isolation = SLUGS.map((slug) => {
  const others = SLUGS.filter((other) => other !== slug).join("|");
  return {
    files: [`src/projects/${slug}/**`, `src/app/projects/${slug}/**`],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: `^@/src/(app/)?projects/(?!${slug}(/|$))`,
              message:
                "No cross-project imports. Promote shared code to src/shared/.",
            },
            {
              regex: `^(\\.\\./)+(projects/)?(${others})(/|$)`,
              message:
                "No cross-project imports. Promote shared code to src/shared/.",
            },
          ],
        },
      ],
    },
  };
});

module.exports = defineConfig([
  expoConfig,
  eslintPluginPrettierRecommended,
  {
    ignores: ["dist/*", "node_modules/*", "/.expo/*"],
  },
  ...isolation,
  {
    files: ["src/shared/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "^@/src/(app/)?projects/|^(\\.\\./)+projects/",
              message: "src/shared/ must not depend on a project.",
            },
          ],
        },
      ],
    },
  },
]);
