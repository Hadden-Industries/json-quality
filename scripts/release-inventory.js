// SPDX-License-Identifier: AGPL-3.0-only
/** Native recipient inventory/audit/SBOM with explicit subject and finite tools. */
import assert from "node:assert/strict";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { native, npmCommand, budgets } from "./qualification-process.js";
import {
  packageName,
  readJson,
  regularBytes,
  save,
  sha256,
  sha512,
  verifyProvenance,
} from "./release-contract.js";

export function isolatedNpmEnvironment(root, env = process.env) {
  const result = Object.fromEntries(
    Object.entries(env).filter(
      ([key]) => !/^(?:npm_config_|npm_token$|node_auth_token$)/iu.test(key),
    ),
  );
  for (const name of ["user", "global"]) {
    const path = join(root, `${name}.npmrc`);
    if (!existsSync(path)) writeFileSync(path, "", { flag: "wx" });
    result[`NPM_CONFIG_${name.toUpperCase()}CONFIG`] = path;
  }
  return {
    ...result,
    NPM_CONFIG_CACHE: join(root, "npm-cache"),
    NPM_CONFIG_IGNORE_SCRIPTS: "true",
    NPM_CONFIG_REGISTRY: "https://registry.npmjs.org/",
    NPM_CONFIG_FETCH_RETRIES: "2",
    NPM_CONFIG_FETCH_TIMEOUT: "60000",
  };
}
export function verifyAudit(audit) {
  assert.equal(audit.auditReportVersion, 2);
  assert.ok(!audit.error);
  assert.equal(
    audit.metadata?.vulnerabilities?.total,
    0,
    "Recipient vulnerabilities require disposition",
  );
  assert.deepEqual(audit.vulnerabilities, {});
}
/** Keep lock location and license identity; never collapse by name/version. */
export function verifySbom(bom, lock, directory, inventory) {
  assert.equal(bom.bomFormat, "CycloneDX");
  assert.ok(["1.4", "1.5", "1.6", "1.7"].includes(bom.specVersion));
  const refs = new Set([bom.metadata.component["bom-ref"]]);
  for (const component of bom.components) {
    assert.ok(component["bom-ref"] && !refs.has(component["bom-ref"]));
    refs.add(component["bom-ref"]);
    assert.ok(
      component.licenses?.length,
      `Missing component license: ${component.name}`,
    );
  }
  const components = [...bom.components, bom.metadata.component];
  for (const [location, entry] of Object.entries(lock.packages).filter(
    ([path, value]) => path && !value.dev,
  )) {
    const metadata = readJson(join(directory, location, "package.json"));
    assert.equal(metadata.version, entry.version);
    const matching = components.filter(
      (c) => c.name === metadata.name && c.version === entry.version,
    );
    assert.equal(
      matching.length,
      1,
      `SBOM omitted/ambiguously mapped installed location ${location}`,
    );
    const component = matching[0];
    if (entry.integrity?.startsWith("sha512-"))
      assert.ok(
        component.hashes?.some(
          (hash) =>
            hash.alg === "SHA-512" &&
            hash.content ===
              Buffer.from(entry.integrity.slice(7), "base64").toString("hex"),
        ),
        `SBOM integrity differs: ${location}`,
      );
    assert.ok(
      component.licenses?.some(
        (l) =>
          l.license?.id === metadata.license ||
          l.expression === metadata.license ||
          l.license?.name === metadata.license,
      ),
      `SBOM license differs: ${location}`,
    );
    assert.equal(
      component.purl,
      `pkg:npm/${metadata.name.split("/").map(encodeURIComponent).join("/")}@${encodeURIComponent(entry.version)}`,
    );
  }
  for (const edge of bom.dependencies) {
    assert.ok(refs.has(edge.ref));
    for (const ref of edge.dependsOn ?? [])
      assert.ok(refs.has(ref), "Dangling SBOM dependency");
  }
  // Native npm may coalesce equal name/version nodes. Preserve every location
  // separately and reject a coalescence that loses distinct edges or rights.
  assert.ok(Array.isArray(inventory));
  assert.deepEqual(
    [...refs].sort(),
    [...new Set(inventory.map((node) => node.ref))].sort(),
    "SBOM added or omitted native inventory components",
  );
  for (const node of inventory) {
    const matches = bom.dependencies.filter((edge) => edge.ref === node.ref);
    assert.equal(matches.length, 1);
    assert.deepEqual(
      [...(matches[0].dependsOn ?? [])].sort(),
      [...new Set(node.dependsOn)].sort(),
      `Native SBOM lost dependency edges at ${node.location}`,
    );
  }
  return bom;
}
export async function installedInventory(directory, npm) {
  const Arborist = createRequire(npm)("@npmcli/arborist");
  const tree = await new Arborist({
    path: directory,
    ignoreScripts: true,
  }).loadActual();
  return [...tree.inventory.values()]
    .filter((node) => !node.dev && !node.isLink)
    .map((node) => ({
      location: node.location,
      ref: `${node.packageName}@${node.version}`,
      name: node.packageName,
      version: node.version,
      resolved: node.resolved ?? null,
      integrity: node.integrity ?? null,
      license: node.package.license ?? null,
      dependsOn: [...node.edgesOut.values()]
        .filter((edge) => edge.to && !edge.to.dev)
        .map((edge) => `${edge.to.packageName}@${edge.to.version}`),
    }));
}
/** Only native npm's exact file distribution URL can need URI representation repair. */
export function normalizeFileReferences(bom, lock, directory, expectedArchive) {
  const result = structuredClone(bom),
    changes = [];
  for (const component of [...result.components, result.metadata.component]) {
    for (const reference of component.externalReferences ?? []) {
      if (!reference.url.startsWith("file:")) continue;
      const matches = Object.entries(lock.packages).filter(
        ([location, entry]) => location && entry.resolved === reference.url,
      );
      assert.equal(matches.length, 1, "Ambiguous native file reference");
      const [location, entry] = matches[0],
        metadata = readJson(join(directory, location, "package.json"));
      assert.equal(metadata.version, component.version);
      assert.equal(component.name, metadata.name);
      assert.ok(entry.integrity?.startsWith("sha512-"));
      const original = reference.url;
      assert.ok(
        expectedArchive &&
          metadata.name === expectedArchive.name &&
          metadata.version === expectedArchive.version,
        "Only the verified package tarball may receive a file URI repair",
      );
      const archivePath = resolve(directory, original.slice(5));
      assert.equal(archivePath, resolve(expectedArchive.path));
      assert.equal(entry.integrity, expectedArchive.integrity);
      assert.equal(
        sha512(regularBytes(archivePath)),
        expectedArchive.integrity,
      );
      // npm lock file references are paths after file:, relative to the install root.
      reference.url = pathToFileURL(resolve(directory, original.slice(5))).href;
      changes.push({
        location,
        package: metadata.name,
        version: metadata.version,
        integrity: entry.integrity,
        before: original,
        after: reference.url,
      });
    }
  }
  return { bom: result, changes };
}
export function acquireValidator(root) {
  const tool = readJson(
    new URL("../assets/release-tools.json", import.meta.url),
  );
  const asset = tool[`${process.platform}-${process.arch}`];
  assert.ok(asset, "Unsupported native validator platform");
  const directory = join(root, "validator");
  mkdirSync(directory, { recursive: true });
  const path = join(directory, asset.asset);
  if (!existsSync(path))
    native("gh", [
      "release",
      "download",
      tool.tag,
      "--repo",
      tool.repository,
      "--pattern",
      asset.asset,
      "--dir",
      directory,
    ]);
  assert.equal(
    sha256(regularBytes(path, 134217728)),
    asset.sha256,
    "Validator digest differs",
  );
  if (process.platform !== "win32") chmodSync(path, 0o755);
  const version = native(path, ["--version"]);
  assert.ok(
    version.includes(tool.tag.slice(1)) && version.includes(tool.source),
  );
  return path;
}
export async function recipientEvidence({
  directory,
  npm,
  output,
  layout,
  signatures = false,
  isolationRoot,
  publication,
  expectedArchive,
}) {
  mkdirSync(output, { recursive: true });
  const env = isolatedNpmEnvironment(isolationRoot),
    command = (args, phase) =>
      native(
        process.execPath,
        [
          npm,
          ...args,
          "--ignore-scripts",
          "--registry=https://registry.npmjs.org/",
        ],
        { cwd: directory, env, timeout: budgets.install, phase },
      );
  const lock = readJson(join(directory, "package-lock.json"));
  save(
    join(output, `${layout}-lock.json`),
    regularBytes(join(directory, "package-lock.json")),
  );
  const graph = JSON.parse(
    command(
      ["ls", "--omit=dev", "--all", "--json"],
      `${layout}-dependency-validity`,
    ),
  );
  assert.ok(!graph.problems?.length);
  save(join(output, `${layout}-dependencies.json`), graph);
  let auditRaw;
  try {
    auditRaw = command(["audit", "--omit=dev", "--json"], `${layout}-audit`);
  } catch (error) {
    if (error.stdout)
      save(join(output, `${layout}-audit.json`), Buffer.from(error.stdout));
    throw error;
  }
  const audit = JSON.parse(auditRaw);
  save(join(output, `${layout}-audit.json`), audit);
  verifyAudit(audit);
  const raw = command(
    ["sbom", "--omit=dev", "--sbom-format=cyclonedx"],
    `${layout}-sbom`,
  );
  save(join(output, `${layout}-native.cdx.json`), Buffer.from(raw));
  const { bom, changes } = normalizeFileReferences(
    JSON.parse(raw),
    lock,
    directory,
    expectedArchive,
  );
  const inventory = await installedInventory(directory, npm);
  verifySbom(bom, lock, directory, inventory);
  save(join(output, `${layout}-locations.json`), inventory);
  const path = join(output, `${layout}.cdx.json`);
  save(path, bom);
  const validator = acquireValidator(
    process.env.JSON_QUALITY_VALIDATOR_ROOT || isolationRoot,
  );
  native(
    validator,
    [
      "validate",
      "--input-file",
      path,
      "--input-version",
      `v${bom.specVersion.replace(".", "_")}`,
      "--fail-on-errors",
    ],
    { phase: `${layout}-validate-sbom` },
  );
  if (signatures) {
    assert.ok(publication, "Original publication context required");
    const verification = native(
      process.env.JSON_QUALITY_PRODUCER_NODE || process.execPath,
      [
        process.env.JSON_QUALITY_PRODUCER_NPM || npm,
        "audit",
        "signatures",
        "--json",
        "--include-attestations",
        "--ignore-scripts",
        "--registry=https://registry.npmjs.org/",
      ],
      {
        cwd: directory,
        env,
        timeout: budgets.install,
        phase: `${layout}-signatures-provenance`,
      },
    );
    verifyProvenance(
      JSON.parse(verification),
      publication.release,
      publication.origin,
    );
    save(join(output, `${layout}-signatures.json`), Buffer.from(verification));
  }
  save(join(output, `${layout}-inventory.json`), {
    schemaVersion: 1,
    subject: "actual clean installed recipient graph",
    package: packageName,
    node: process.versions.node,
    platform: process.platform,
    layout,
    lockSha256: sha256(regularBytes(join(directory, "package-lock.json"))),
    fileUriChanges: changes,
    signatures,
    validatorSha256: sha256(regularBytes(validator, 134217728)),
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 4);
  const [directory, output] = process.argv.slice(2).map((p) => resolve(p));
  mkdirSync(output, { recursive: true });
  const install = join(output, "source-install");
  mkdirSync(install);
  const originalLock = regularBytes(join(directory, "package-lock.json"));
  save(join(install, "package-lock.json"), originalLock);
  const metadata = readJson(join(directory, "package.json"));
  // A mixed development install lets npm's .dev query omit a shared prod/dev
  // component. Qualify a clean production-only manifest against the frozen lock.
  delete metadata.devDependencies;
  delete metadata.scripts;
  save(join(install, "package.json"), metadata);
  const environment = isolatedNpmEnvironment(output);
  npmCommand(
    ["ci", "--omit=dev", "--ignore-scripts", "--no-audit", "--no-fund"],
    { cwd: install, env: environment, phase: "source-production-install" },
  );
  assert.equal(
    sha256(regularBytes(join(install, "package-lock.json"))),
    sha256(originalLock),
  );
  save(
    join(output, "source-production-lock.json"),
    readFileSync(join(directory, "package-lock.json")),
  );
  const raw = npmCommand(["sbom", "--omit=dev", "--sbom-format=cyclonedx"], {
    cwd: install,
    env: environment,
    phase: "source-production-sbom",
  });
  const bom = JSON.parse(raw);
  const inventory = await installedInventory(install, process.env.npm_execpath);
  verifySbom(bom, JSON.parse(originalLock), install, inventory);
  save(join(output, "source-locations.json"), inventory);
  const graph = npmCommand(["ls", "--omit=dev", "--all", "--json"], {
    cwd: install,
    env: environment,
    phase: "source-dependency-validity",
  });
  save(join(output, "source-dependencies.json"), Buffer.from(graph));
  const auditRaw = npmCommand(["audit", "--omit=dev", "--json"], {
    cwd: install,
    env: environment,
    phase: "source-production-audit",
  });
  save(join(output, "source-audit.json"), Buffer.from(auditRaw));
  verifyAudit(JSON.parse(auditRaw));
  save(join(output, "source-production.cdx.json"), Buffer.from(raw));
  native(acquireValidator(output), [
    "validate",
    "--input-file",
    join(output, "source-production.cdx.json"),
    "--input-version",
    `v${bom.specVersion.replace(".", "_")}`,
    "--fail-on-errors",
  ]);
}
