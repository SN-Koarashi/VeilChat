import globals from "globals";
import pluginJs from "@eslint/js";

/** @type {import('eslint').Linter.Config[]} */
export default [
  { files: ["**/*.js"], languageOptions: { sourceType: "commonjs" } },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      }
    }
  },
  {
    files: ["websocket/**/*.js"],
    languageOptions: {
      globals: {
        clientList: "writable",
        clientListID: "writable",
        roomTimer: "writable",
        roomCreatedTimestamp: "writable",
        roomList: "writable",
        roomKeyPair: "writable",
        roomListReserved: "writable",
        roomPassword: "writable",
        messageList: "writable",
        wssSrv: "writable",
        ipRequestCounts: "writeable",
        MAX_REQUESTS_PER_MINUTE: "readonly"
      }
    }
  },
  pluginJs.configs.recommended,
];