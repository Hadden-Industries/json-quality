// SPDX-License-Identifier: AGPL-3.0-only
import { lstatSync, realpathSync } from "node:fs";
import { isAbsolute, join, relative, sep } from "node:path";

/** Lexical containment includes equality; callers own filesystem admission. */
export function isPathContained(root, path) {
  const contained = relative(root, path);
  return (
    !isAbsolute(contained) &&
    contained !== ".." &&
    !contained.startsWith(`..${sep}`)
  );
}

/** File identities are canonical repository-relative paths, never tool globs. */
export function assertRepositoryPath(path) {
  if (
    typeof path !== "string" ||
    isAbsolute(path) ||
    /[\\:\0-\x1f\x7f]/u.test(path) ||
    path.split("/").some((part) => !part || part === "." || part === "..")
  )
    throw new Error("Invalid repository-relative path.");
}

/** Admit regular files through regular ancestors and verify real containment. */
export function assertRegularSource(root, path, mode) {
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
      (index === parts.length - 1 ? !stat.isFile() : !stat.isDirectory())
    )
      throw new Error(`Nonregular source path: ${path}`);
  }
  if (!isPathContained(realpathSync(root), realpathSync(current)))
    throw new Error(`Source leaves repository: ${path}`);
  return current;
}
