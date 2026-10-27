/** The bounded serialization identity guard; consumers select their JS scope. */
declare const plugin: {
  meta: {
    name: string;
    version: string;
  };
  rules: {
    "no-json-stringify-identity": import("eslint").Rule.RuleModule;
  };
  configs: {
    recommended: import("eslint").Linter.Config<
      import("@eslint/core").RulesConfig
    >;
  };
};
export default plugin;
