// SPDX-License-Identifier: AGPL-3.0-only
// Port OwlAPI's checked projection of external Action pins.
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { isScalar, parseDocument, visit } from "yaml";

const repository = fileURLToPath(new URL("../", import.meta.url));
export const ACTION_CATALOG_PATH = "docs/release/action-versions.json";
const REPOSITORY = /^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/u;
const REVISION = /^[0-9a-f]{40}$/u;
const TAG = /^v\d+(?:\.\d+)*$/u;
const REFERENCE = /^([^/@\s]+\/[^/@\s]+)((?:\/[^@\s]+)?)@([^@\s]+)$/u;

export function validateActionCatalog(catalog) {
  const fail = (message) => {
    throw new Error(`${ACTION_CATALOG_PATH}: ${message}`);
  };
  if (
    catalog?.schemaVersion !== 1 ||
    Object.keys(catalog).sort().join() !== "actions,schemaVersion" ||
    typeof catalog.actions !== "object" ||
    catalog.actions === null ||
    Array.isArray(catalog.actions)
  )
    fail("expected schemaVersion 1 and an actions map");
  const names = Object.keys(catalog.actions);
  if (names.join() !== [...names].sort().join())
    fail("sort actions by repository");
  for (const [name, entry] of Object.entries(catalog.actions)) {
    if (!REPOSITORY.test(name)) fail(`invalid action repository ${name}`);
    if (
      Object.keys(entry ?? {})
        .sort()
        .join() !== "revision,tag"
    )
      fail(`${name} must declare exactly a tag and a revision`);
    if (!TAG.test(entry.tag)) fail(`${name} needs a release tag`);
    if (!REVISION.test(entry.revision))
      fail(`${name} needs a full lowercase commit revision`);
  }
  return catalog;
}

export function readActionCatalog(root = repository) {
  return validateActionCatalog(
    JSON.parse(readFileSync(resolve(root, ACTION_CATALOG_PATH), "utf8")),
  );
}

const external = (value) =>
  typeof value === "string" &&
  !value.startsWith("./") &&
  !value.startsWith("docker://");

/** Project the literal reference and its release-tag comment in place. */
export function projectActionVersions(
  source,
  { file, actions, write = false },
) {
  const document = parseDocument(source, { uniqueKeys: true });
  if (document.errors.length)
    return {
      source,
      used: [],
      violations: [`${file}: action pins need valid YAML`],
    };
  const violations = [];
  const used = new Set();
  const edits = [];
  visit(document, {
    Pair(_key, pair) {
      if (
        !isScalar(pair.key) ||
        pair.key.value !== "uses" ||
        !isScalar(pair.value) ||
        !external(pair.value.value)
      )
        return;
      const node = pair.value;
      const match = REFERENCE.exec(node.value);
      if (!match) {
        violations.push(`${file}: unrecognized action reference ${node.value}`);
        return;
      }
      const [, name, subpath, revision] = match;
      const entry = Object.hasOwn(actions, name) ? actions[name] : undefined;
      if (!entry) {
        violations.push(`${file}: ${name} is not in ${ACTION_CATALOG_PATH}`);
        return;
      }
      used.add(name);
      if (revision === entry.revision && node.comment?.trim() === entry.tag)
        return;
      violations.push(
        `${file}: ${name} drifts from ${ACTION_CATALOG_PATH}; run node scripts/project-action-versions.mjs --write`,
      );
      const newline = source.indexOf("\n", node.range[1]);
      const end =
        newline === -1
          ? source.length
          : newline - Number(source[newline - 1] === "\r");
      if (/^[ \t]*(?:#.*)?$/u.test(source.slice(node.range[1], end)))
        edits.push([
          node.range[0],
          end,
          `${name}${subpath}@${entry.revision} # ${entry.tag}`,
        ]);
      else violations.push(`${file}: cannot rewrite ${name} in place`);
    },
  });
  if (write)
    for (const [start, end, replacement] of edits.sort((a, b) => b[0] - a[0]))
      source = source.slice(0, start) + replacement + source.slice(end);
  return { source, used: [...used], violations };
}

function actionConsumers(root) {
  const workflows = readdirSync(resolve(root, ".github/workflows"))
    .filter((name) => /\.ya?ml$/u.test(name))
    .sort()
    .map((name) => `.github/workflows/${name}`);
  const actions = readdirSync(resolve(root, ".github/actions"), {
    withFileTypes: true,
  })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .flatMap((name) =>
      ["action.yml", "action.yaml"].map(
        (file) => `.github/actions/${name}/${file}`,
      ),
    )
    .filter((path) => existsSync(resolve(root, path)));
  return [...workflows, ...actions];
}

function planActionProjections(root, write) {
  const { actions } = readActionCatalog(root);
  const used = new Set();
  const changes = [];
  const violations = [];
  for (const file of actionConsumers(root)) {
    const target = resolve(root, file);
    const source = readFileSync(target, "utf8");
    const projection = projectActionVersions(source, { file, actions, write });
    const checked = write
      ? projectActionVersions(projection.source, { file, actions })
      : projection;
    violations.push(...checked.violations);
    for (const name of checked.used) used.add(name);
    if (projection.source !== source)
      changes.push({ target, source, projected: projection.source });
  }
  for (const name of Object.keys(actions))
    if (!used.has(name))
      violations.push(
        `${ACTION_CATALOG_PATH}: ${name} has no workflow or action consumer`,
      );
  return { violations, changes };
}

export function checkActionProjections(root = repository) {
  return planActionProjections(root, false).violations;
}

export function writeActionProjections(root = repository) {
  const { violations, changes } = planActionProjections(root, true);
  if (violations.length) return violations;
  for (const { target, source } of changes)
    if (readFileSync(target, "utf8") !== source)
      throw new Error(`${target}: changed during action projection`);
  for (const { target, projected } of changes) writeFileSync(target, projected);
  return [];
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const [mode, ...rest] = process.argv.slice(2);
  if (rest.length || !["--check", "--write"].includes(mode))
    throw new Error("Use --check or --write");
  const violations =
    mode === "--check" ? checkActionProjections() : writeActionProjections();
  process.stdout.write(
    `${JSON.stringify({ mode: mode.slice(2), violations })}\n`,
  );
  if (violations.length) process.exitCode = 1;
}
