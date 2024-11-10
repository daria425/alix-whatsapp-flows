import globals from "globals";
import pluginJs from "@eslint/js";

import jestPlugin from "eslint-plugin-jest";

export default [
  {
    files: ["**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: globals.node,
    },
    plugins: {
      jest: jestPlugin,
    },
    rules: {
      ...pluginJs.configs.recommended.rules,
      ...jestPlugin.configs.recommended.rules,
    },
  },
];
