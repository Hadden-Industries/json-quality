// SPDX-License-Identifier: AGPL-3.0-only
import { lstatSync, realpathSync } from "node:fs";
import { isAbsolute, join, relative, sep } from "node:path";

/** Lexical containment includes equality; callers own filesystem admission. */
export function isPathContained(/** @type {*} */ root, /** @type {*} */ path) {
  const contained = relative(root, path);
  return (
    !isAbsolute(contained) &&
    contained !== ".." &&
    !contained.startsWith(`..${sep}`)
  );
}

/** File identities are canonical repository-relative paths, never tool globs. */
export function assertRepositoryPath(/** @type {*} */ path) {
  if (
    typeof path !== "string" ||
    isAbsolute(path) ||
    // Reject control characters in untrusted path identities.
    // eslint-disable-next-line no-control-regex
    /[\\:\0-\x1f\x7f]/u.test(path) ||
    path.split("/").some((part) => !part || part === "." || part === "..")
  )
    throw new Error("Invalid repository-relative path.");
}

/** Admit regular files through regular ancestors and verify real containment. */
export function assertRegularSource(
  /** @type {*} */ root,
  /** @type {*} */ path,
  /** @type {*} */ mode = undefined,
) {
  return assertRegularPath(root, path, false, mode);
}

/** Admit one traversed directory through regular ancestors inside the root. */
export function assertRegularDirectory(
  /** @type {*} */ root,
  /** @type {*} */ path,
) {
  if (path === "") {
    const stat = lstatSync(root);
    if (stat.isSymbolicLink() || !stat.isDirectory())
      throw new Error("Nonregular repository root.");
    return root;
  }
  return assertRegularPath(root, path, true);
}

/** Share containment and ancestor admission for read-only source discovery. */
function assertRegularPath(
  /** @type {*} */ root,
  /** @type {*} */ path,
  /** @type {*} */ directory,
  /** @type {*} */ mode = undefined,
) {
  assertRepositoryPath(path);
  if (mode !== undefined && mode !== "100644" && mode !== "100755")
    throw new Error(`Nonregular Git JSON entry: ${path}`);
  let current = root;
  const parts = path.split("/");
  for (const [index, part] of parts.entries()) {
    current = join(current, part);
    const stat = lstatSync(current);
    if (
      stat.isSymbolicLink() ||
      (index === parts.length - 1 && !directory
        ? !stat.isFile()
        : !stat.isDirectory())
    )
      throw new Error(`Nonregular source path: ${path}`);
  }
  if (!isPathContained(realpathSync(root), realpathSync(current)))
    throw new Error(`Source leaves repository: ${path}`);
  return current;
}
