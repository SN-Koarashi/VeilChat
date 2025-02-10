import globals from "globals";
import pluginJs from "@eslint/js";


/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ["**/*.js"], languageOptions: {
      globals: {
        ...globals.browser,
        process: 'readable'
      }
    }
  },
  {
    files: ["compiler.js", "webpack.config.js"],
    sourceType: "commonjs",
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      }
    }
  },
  pluginJs.configs.recommended,
];