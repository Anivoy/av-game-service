export default {
  env: {
    node: true,
    es2022: true,
    jest: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:import/recommended",
    "plugin:prettier/recommended",
  ],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  plugins: ["prettier", "import"],
  rules: {
    "prettier/prettier": [
      "error",
      {
        endOfLine: "auto",
      },
    ],
    "import/order": [
      "error",
      {
        groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
        "newlines-between": "always",
      },
    ],
    "no-unused-vars": ["warn"],
  },
  ignorePatterns: ["node_modules", "dist"],
};
