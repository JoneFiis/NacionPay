module.exports = {
  env: {
    node: true,
    commonjs: true,
    jest: true,
    es2021: true
  },
  extends: "eslint:recommended",
  parserOptions: {
    ecmaVersion: "latest"
  },
  rules: {
    "no-unused-vars": "off",
    "no-console": "off",
    "no-undef": "off",
    "no-redeclare": "off"
  }
};
