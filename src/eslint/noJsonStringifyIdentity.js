// Extracted from Universal Ontology 015a356e1fac8bcea3fcfb213954a191ab6f6851.
// SPDX-License-Identifier: AGPL-3.0-only
/** Bounded lexical guard: JSON serialization is not a semantic identity.
 * ESLint owns parsing and scopes; consumers retain permutation regression tests.
 */
const EQUALITY = new Set(["==", "!=", "===", "!=="]);
const ASSERTIONS = new Set([
  "equal",
  "notEqual",
  "strictEqual",
  "notStrictEqual",
  "deepEqual",
  "notDeepEqual",
  "deepStrictEqual",
  "notDeepStrictEqual",
]);
const MATCHERS = new Set(["toBe", "toEqual", "toStrictEqual"]);
const ROOT_ROLES = new Map([
  ["JSON", "json"],
  ["Object", "object"],
  ["Set", "set-constructor"],
  ["Map", "map-constructor"],
  ["Buffer", "buffer"],
  ["expect", "expect"],
  ["String", "string"],
  ["globalThis", "global"],
  ["global", "global"],
  ["window", "global"],
]);
const INSTANCE_ROLES = new Map([
  ["set-constructor", "set"],
  ["map-constructor", "map"],
]);
const CONTRACT =
  /^json-identity-contract: (bytes|digest|ordered-tuple); owner: ([^;\r\n]+); reason: (\S[^\r\n]*)$/u;
const DEFAULT_LIMITS = Object.freeze({ maxFrames: 64, maxSteps: 100_000 });
const LIMIT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: Object.fromEntries(
    Object.keys(DEFAULT_LIMITS).map((name) => [
      name,
      {
        anyOf: [
          { type: "integer", minimum: 1, maximum: Number.MAX_SAFE_INTEGER },
          { const: false },
        ],
      },
    ]),
  ),
};

function propertyName(/** @type {*} */ node) {
  if (!node.computed && node.property?.type === "Identifier")
    return node.property.name;
  if (node.property?.type === "Literal") return String(node.property.value);
  return null;
}

/** @type {import("eslint").Rule.RuleModule} */
const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Reject raw JSON serialization used as equality or identity.",
    },
    schema: [{ anyOf: [LIMIT_SCHEMA, { const: false }] }],
    messages: {
      identity:
        "JSON.stringify is order-sensitive. Compare structured data or use a reviewed canonical identity; declare an intentional byte/digest/ordered-tuple contract locally.",
      contract:
        "Use one immediately preceding line: json-identity-contract: bytes|digest|ordered-tuple; owner: OWNER; reason: REASON.",
      unused:
        "Unused JSON identity contract: attach it immediately before the serializer used by an identity operation.",
      analysisLimit:
        "JSON identity analysis exceeded {{maxFrames}} lexical frames or {{maxSteps}} steps; simplify the alias graph or explicitly adjust its resource limits.",
    },
  },
  create(/** @type {*} */ context) {
    const limits = Object.fromEntries(
      Object.entries(DEFAULT_LIMITS).map(([name, defaultValue]) => {
        const value =
          context.options[0] === false
            ? false
            : (context.options[0]?.[name] ?? defaultValue);
        return [name, value === false ? Infinity : value];
      }),
    );
    const source = context.sourceCode;
    const contracts = source
      .getAllComments()
      .filter((/** @type {*} */ comment) =>
        comment.value.trim().startsWith("json-identity-contract:"),
      );
    const used = new Set();
    const reported = new Set();
    const contractsByLine = new Map();
    for (const comment of contracts) {
      const line = comment.loc.end.line;
      const entries = contractsByLine.get(line) ?? [];
      entries.push(comment);
      contractsByLine.set(line, entries);
    }
    const /** @type {any[]} */ sinks = [];
    // Prune impossible flows from native scope facts, rather than exempting
    // generated files. Escaped identifiers have their decoded binding names.
    const roots = new Set(["JSON", "globalThis", "global", "window"]);
    function possibleRoot(/** @type {*} */ reference) {
      const id = reference.identifier;
      if (!roots.has(id.name)) return false;
      const member = id.parent;
      if (
        id.name !== "JSON" ||
        member.type !== "MemberExpression" ||
        member.object !== id
      )
        return true;
      const key = propertyName(member);
      return key === null || key === "stringify";
    }
    const maySerialize = source.scopeManager.scopes.some(
      (/** @type {*} */ scope) =>
        scope.through.some(possibleRoot) ||
        scope.variables.some(
          (/** @type {*} */ bound) =>
            roots.has(bound.name) &&
            !bound.defs.length &&
            bound.references.some(possibleRoot),
        ),
    );
    /** @type {WeakMap<object, {node: any, path: string[]}[]>} */
    const valuesByBinding = new WeakMap();
    const pathsByPattern = new WeakMap();
    const propertiesByObject = new WeakMap();
    let remainingAnalysisSteps = limits.maxSteps;
    let analysisLimited = false;

    function withinBudget(/** @type {*} */ seen) {
      if (seen.size >= limits.maxFrames || --remainingAnalysisSteps < 0) {
        analysisLimited = true;
        return false;
      }
      return true;
    }

    // AST indexes contain only direct, context-independent facts. Recursive
    // alias results still use the caller's cycle guard and global allowance.
    function bindingPath(/** @type {*} */ pattern, /** @type {*} */ target) {
      let paths = pathsByPattern.get(pattern);
      if (!paths) {
        paths = new WeakMap();
        pathsByPattern.set(pattern, paths);
        const pending = [
          { node: pattern, path: /** @type {string[]} */ ([]), depth: 0 },
        ];
        while (pending.length) {
          const { node, path, depth } = /** @type {any} */ (pending.pop());
          if (!node) continue;
          if (depth >= limits.maxFrames || --remainingAnalysisSteps < 0) {
            analysisLimited = true;
            break;
          }
          paths.set(node, path);
          if (node.type === "AssignmentPattern")
            pending.push({ node: node.left, path, depth: depth + 1 });
          else if (node.type === "ObjectPattern") {
            for (const property of node.properties)
              if (--remainingAnalysisSteps < 0) {
                analysisLimited = true;
                break;
              } else if (property.type === "Property" && !property.computed)
                pending.push({
                  node: property.value,
                  path: [
                    ...path,
                    property.key.name ?? String(property.key.value),
                  ],
                  depth: depth + 1,
                });
          } else if (node.type === "ArrayPattern") {
            for (const [index, element] of node.elements.entries())
              if (--remainingAnalysisSteps < 0) {
                analysisLimited = true;
                break;
              } else
                pending.push({
                  node: element,
                  path: [...path, String(index)],
                  depth: depth + 1,
                });
          }
        }
      }
      return paths.get(target) ?? null;
    }

    function selectedValue(
      /** @type {*} */ node,
      /** @type {string[]} */ path,
    ) {
      for (const name of path) {
        if (node?.type === "ObjectExpression") {
          let properties = propertiesByObject.get(node);
          if (!properties) {
            properties = new Map();
            propertiesByObject.set(node, properties);
            for (const property of node.properties) {
              if (--remainingAnalysisSteps < 0) {
                analysisLimited = true;
                break;
              }
              if (property.type !== "Property" || property.computed) continue;
              const key = property.key.name ?? String(property.key.value);
              if (!properties.has(key)) properties.set(key, property.value);
            }
          }
          node = properties.get(name);
        } else if (node?.type === "ArrayExpression")
          node = node.elements[Number(name)];
        else return null;
      }
      return node;
    }

    function variable(/** @type {*} */ node) {
      for (let scope = source.getScope(node); scope; scope = scope.upper) {
        if (scope.set.has(node.name)) return scope.set.get(node.name);
      }
      return null;
    }

    function values(/** @type {*} */ node) {
      const bound = variable(node);
      if (!bound) return [];
      // ESLint has finished scope analysis before listeners run. Cache only
      // direct writes; recursive results depend on the caller's cycle guard.
      const cached = valuesByBinding.get(bound);
      if (cached) return cached;
      const /** @type {any[]} */ entries = [];
      for (const definition of bound.defs) {
        if (definition.type === "Variable" && definition.node.init) {
          entries.push({
            node: definition.node.init,
            path: bindingPath(definition.node.id, definition.name) ?? [],
          });
        }
      }
      for (const reference of bound.references) {
        if (reference.isWrite() && reference.writeExpr && !reference.init) {
          let parent = reference.identifier.parent;
          while (
            parent &&
            ![
              "AssignmentExpression",
              "VariableDeclarator",
              "FunctionDeclaration",
              "FunctionExpression",
              "ArrowFunctionExpression",
            ].includes(parent.type)
          )
            parent = parent.parent;
          entries.push({
            node: reference.writeExpr,
            path:
              parent?.type === "AssignmentExpression"
                ? (bindingPath(parent.left, reference.identifier) ?? [])
                : [],
          });
        }
      }
      valuesByBinding.set(bound, entries);
      return entries;
    }

    /** @returns {*} */ function projectedValues(
      /** @type {*} */ node,
      /** @type {*} */ path,
      seen = new Set(),
    ) {
      if (!node || seen.has(node) || !withinBudget(seen)) return [];
      if (!path.length) return [node];
      seen = new Set(seen).add(node);
      const selected = selectedValue(node, [path[0]]);
      if (selected) return projectedValues(selected, path.slice(1), seen);
      if (node.type === "Identifier")
        return values(node).flatMap((entry) =>
          projectedValues(entry.node, [...entry.path, ...path], seen),
        );
      if (node.type === "MemberExpression" && propertyName(node) !== null)
        return projectedValues(
          node.object,
          [propertyName(node), ...path],
          seen,
        );
      return [];
    }

    /** @returns {*} */ function rolesAt(
      /** @type {*} */ node,
      /** @type {*} */ path,
      /** @type {*} */ seen,
    ) {
      if (!path.length) return roles(node, seen);
      const selected = projectedValues(node, [path[0]], seen);
      if (selected.length)
        return selected.flatMap((/** @type {*} */ value) =>
          rolesAt(value, path.slice(1), seen),
        );
      return path.reduce(
        (/** @type {*} */ current, /** @type {*} */ name) =>
          current
            .map((/** @type {*} */ role) => memberRole(role, name))
            .filter(Boolean),
        roles(node, seen),
      );
    }

    function memberRole(/** @type {*} */ role, /** @type {*} */ name) {
      if (
        ["stringify", "compare", "expect", "matcher", "hash-factory"].includes(
          role,
        ) &&
        name === "bind"
      )
        return `${role}-bound`;
      if (role === "global") return ROOT_ROLES.get(name) ?? null;
      if (role === "buffer-module" && name === "Buffer") return "buffer";
      if (role === "json" && name === "stringify") return "stringify";
      if (role === "object" && name === "is") return "compare";
      if (role === "assert" && ASSERTIONS.has(name)) return "compare";
      if (role === "assert" && name === "strict") return "assert";
      if (role === "buffer" && name === "from") return "buffer-from";
      if (role === "crypto" && ["createHash", "createHmac"].includes(name))
        return "hash-factory";
      if (role === "stringify" && ["call", "apply"].includes(name))
        return "stringify";
      if (
        role === "expect-result" &&
        ["not", "resolves", "rejects"].includes(name)
      )
        return role;
      if (role === "expect-result" && MATCHERS.has(name)) return "matcher";
      return null;
    }

    /** @returns {*} */ function roles(
      /** @type {*} */ node,
      seen = new Set(),
    ) {
      if (!node || seen.has(node) || !withinBudget(seen)) return [];
      seen = new Set(seen).add(node);
      if (node.type === "ChainExpression") return roles(node.expression, seen);
      if (node.type === "Identifier") {
        const bound = variable(node);
        if (!bound?.defs.length) {
          const role = ROOT_ROLES.get(node.name);
          return role ? [role] : [];
        }
        const imported = bound.defs.find(
          (/** @type {*} */ definition) => definition.type === "ImportBinding",
        );
        if (imported) {
          const from = imported.parent.source.value;
          const name = imported.node.imported?.name;
          if (["@jest/globals", "vitest"].includes(from) && name === "expect")
            return ["expect"];
          if (/^(?:node:)?buffer$/u.test(from))
            return name === "Buffer"
              ? ["buffer"]
              : imported.node.type === "ImportSpecifier"
                ? []
                : ["buffer-module"];
          if (/^(?:node:)?assert(?:\/strict)?$/u.test(from))
            return name && ASSERTIONS.has(name) ? ["compare"] : ["assert"];
          if (/^(?:node:)?crypto$/u.test(from))
            return ["createHash", "createHmac"].includes(name)
              ? ["hash-factory"]
              : ["crypto"];
          return [];
        }
        return values(node).flatMap((entry) =>
          rolesAt(entry.node, entry.path, seen),
        );
      }
      if (node.type === "MemberExpression")
        return rolesAt(node.object, [propertyName(node)], seen);
      if (node.type === "ArrayExpression") return ["array"];
      if (node.type === "NewExpression")
        return roles(node.callee, seen)
          .map((/** @type {*} */ role) => INSTANCE_ROLES.get(role))
          .filter(Boolean);
      if (node.type === "CallExpression") {
        const /** @type {any} */ called = roles(node.callee, seen);
        const /** @type {any} */ boundRole = called.find(
            (/** @type {*} */ role) => role.endsWith("-bound"),
          );
        if (boundRole) return [boundRole.slice(0, -6)];
        if (called.includes("expect")) return ["expect-result"];
        if (called.includes("hash-factory")) return ["hash"];
        if (
          node.callee.type === "MemberExpression" &&
          propertyName(node.callee) === "update" &&
          roles(node.callee.object, seen).includes("hash")
        )
          return ["hash"];
        if (
          node.callee.type === "Identifier" &&
          node.callee.name === "require" &&
          !variable(node.callee)?.defs.length
        ) {
          const from = node.arguments[0]?.value;
          if (
            typeof from === "string" &&
            /^(?:node:)?assert(?:\/strict)?$/u.test(from)
          )
            return ["assert"];
          if (typeof from === "string" && /^(?:node:)?crypto$/u.test(from))
            return ["crypto"];
          if (typeof from === "string" && /^(?:node:)?buffer$/u.test(from))
            return ["buffer-module"];
        }
      }
      return [];
    }

    /** @returns {*} */ function origins(
      /** @type {*} */ node,
      seen = new Set(),
    ) {
      if (!node || seen.has(node) || !withinBudget(seen)) return [];
      seen = new Set(seen).add(node);
      if (node.type === "ChainExpression")
        return origins(node.expression, seen);
      if (node.type === "Identifier")
        return values(node).flatMap((entry) =>
          projectedValues(entry.node, entry.path, seen).flatMap(
            (/** @type {*} */ value) => origins(value, seen),
          ),
        );
      if (node.type === "MemberExpression" && propertyName(node) !== null)
        return projectedValues(node.object, [propertyName(node)], seen).flatMap(
          (/** @type {*} */ value) => origins(value, seen),
        );
      if (node.type === "CallExpression") {
        const called = roles(node.callee);
        if (called.includes("stringify")) return [node];
        if (called.includes("buffer-from") || called.includes("string"))
          return origins(node.arguments[0], seen);
        if (
          node.callee.type === "MemberExpression" &&
          [
            "toString",
            "trim",
            "trimStart",
            "trimEnd",
            "normalize",
            "replace",
            "replaceAll",
          ].includes(propertyName(node.callee))
        )
          return origins(node.callee.object, seen);
      }
      if (node.type === "TemplateLiteral")
        return node.expressions.flatMap((/** @type {*} */ expression) =>
          origins(expression, seen),
        );
      if (node.type === "BinaryExpression" && node.operator === "+")
        return [...origins(node.left, seen), ...origins(node.right, seen)];
      if (node.type === "LogicalExpression")
        return [...origins(node.left, seen), ...origins(node.right, seen)];
      if (node.type === "ConditionalExpression")
        return [
          ...origins(node.consequent, seen),
          ...origins(node.alternate, seen),
        ];
      if (node.type === "SequenceExpression")
        return origins(node.expressions.at(-1), seen);
      if (node.type === "AssignmentExpression")
        return origins(node.right, seen);
      if (node.type === "AwaitExpression") return origins(node.argument, seen);
      return [];
    }

    function inspect(/** @type {*} */ node) {
      for (const origin of origins(node)) {
        if (reported.has(origin)) continue;
        reported.add(origin);
        const starts = new Set([origin.loc.start.line]);
        for (let parent = origin.parent; parent; parent = parent.parent) {
          if (
            [
              "VariableDeclaration",
              "ExpressionStatement",
              "ReturnStatement",
              "IfStatement",
            ].includes(parent.type)
          ) {
            starts.add(parent.loc.start.line);
            break;
          }
          if (
            [
              "BlockStatement",
              "ArrowFunctionExpression",
              "FunctionExpression",
              "FunctionDeclaration",
            ].includes(parent.type)
          )
            break;
        }
        let attached;
        let attachedCount = 0;
        for (const line of starts) {
          const entries = contractsByLine.get(line - 1);
          attachedCount += entries?.length ?? 0;
          if (entries?.length) attached = entries[0];
          if (attachedCount > 1) break;
        }
        if (
          attachedCount === 1 &&
          attached.type === "Line" &&
          !used.has(attached) &&
          !source.lines[attached.loc.start.line - 1]
            .slice(0, attached.loc.start.column)
            .trim() &&
          CONTRACT.test(attached.value.trim()) &&
          CONTRACT.exec(attached.value.trim())?.[2].trim()
        ) {
          used.add(attached);
        } else context.report({ node: origin, messageId: "identity" });
      }
    }

    function expectArguments(/** @type {*} */ node) {
      while (node?.type === "MemberExpression") node = node.object;
      if (
        node?.type === "CallExpression" &&
        roles(node.callee).includes("expect")
      )
        return node.arguments;
      return [];
    }

    function matcherArguments(/** @type {*} */ node, seen = new Set()) {
      if (!node || seen.has(node) || !withinBudget(seen)) return [];
      seen = new Set(seen).add(node);
      if (node.type === "ChainExpression")
        return matcherArguments(node.expression, seen);
      if (
        node.type === "CallExpression" &&
        node.callee.type === "MemberExpression" &&
        propertyName(node.callee) === "bind"
      )
        return matcherArguments(node.callee.object, seen);
      if (node.type === "Identifier")
        return values(node).flatMap((entry) =>
          projectedValues(entry.node, entry.path, seen).flatMap(
            (/** @type {*} */ value) => matcherArguments(value, seen),
          ),
        );
      return node.type === "MemberExpression"
        ? expectArguments(node.object)
        : [];
    }

    function collectionElements(
      /** @type {*} */ node,
      /** @type {*} */ map,
      seen = new Set(),
    ) {
      if (!node || seen.has(node) || !withinBudget(seen)) return;
      seen = new Set(seen).add(node);
      if (node.type === "Identifier") {
        for (const entry of values(node))
          for (const value of projectedValues(entry.node, entry.path, seen))
            collectionElements(value, map, seen);
      } else if (node.type === "ArrayExpression") {
        sinks.push(
          ...node.elements.map((/** @type {*} */ entry) =>
            map ? selectedValue(entry, ["0"]) : entry,
          ),
        );
      } else if (
        node.type === "CallExpression" &&
        node.callee.type === "MemberExpression" &&
        propertyName(node.callee) === "map"
      ) {
        const callback = node.arguments[0];
        if (
          callback?.type === "ArrowFunctionExpression" &&
          callback.body.type !== "BlockStatement"
        ) {
          sinks.push(map ? selectedValue(callback.body, ["0"]) : callback.body);
        }
      }
    }

    const listeners = {
      BinaryExpression(/** @type {*} */ node) {
        if (EQUALITY.has(node.operator)) sinks.push(node.left, node.right);
      },
      MemberExpression(/** @type {*} */ node) {
        if (node.computed) sinks.push(node.property);
      },
      Property(/** @type {*} */ node) {
        if (node.computed) sinks.push(node.key);
      },
      NewExpression(/** @type {*} */ node) {
        const called = roles(node.callee);
        if (called.includes("set-constructor"))
          collectionElements(node.arguments[0], false);
        if (called.includes("map-constructor"))
          collectionElements(node.arguments[0], true);
      },
      CallExpression(/** @type {*} */ node) {
        // Unbound ordinary callees cannot be any of the supported sinks.
        if (
          node.callee.type === "Identifier" &&
          !ROOT_ROLES.has(node.callee.name) &&
          !variable(node.callee)?.defs.length
        )
          return;
        const called = roles(node.callee);
        if (called.includes("compare"))
          sinks.push(...node.arguments.slice(0, 2));
        if (called.includes("matcher"))
          sinks.push(
            ...node.arguments.slice(0, 1),
            ...matcherArguments(node.callee),
          );
        if (node.callee.type !== "MemberExpression") return;
        const receiver = roles(node.callee.object);
        const name = propertyName(node.callee);
        if (
          (receiver.includes("set") &&
            ["add", "has", "delete"].includes(name)) ||
          (receiver.includes("map") &&
            ["set", "get", "has", "delete"].includes(name)) ||
          (receiver.includes("array") &&
            ["includes", "indexOf", "lastIndexOf"].includes(name)) ||
          (receiver.includes("hash") && name === "update")
        )
          sinks.push(node.arguments[0]);
      },
      "Program:exit"(/** @type {*} */ node) {
        sinks.forEach(inspect);
        if (analysisLimited)
          context.report({ node, messageId: "analysisLimit", data: limits });
        for (const comment of contracts) {
          if (!used.has(comment))
            context.report({
              loc: comment.loc,
              messageId:
                CONTRACT.test(comment.value.trim()) && comment.type === "Line"
                  ? "unused"
                  : "contract",
            });
        }
      },
    };
    return maySerialize
      ? listeners
      : { "Program:exit": listeners["Program:exit"] };
  },
};
export default rule;
