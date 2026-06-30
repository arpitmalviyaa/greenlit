import next from "eslint-config-next";

export default [
  ...next,
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    ignores: ["app/_archive/**", ".next/**", "node_modules/**", "reports/**"],
  },
];
