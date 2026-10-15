// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { jsonQualityAcquisitionBootstrap } from "../src/installation.js";

/** Real cold exact-Git acquisition followed by native cached-payload admission. */
export async function qualifyAcquisition({ directory, npm, commit }) {
  assert.match(commit, /^[a-f0-9]{40}$/u);
  const tooling = join(directory, "tooling", "json");
  mkdirSync(tooling, { recursive: true });
  mkdirSync(join(directory, "scripts"));
  const name = "@hadden-industries/json-quality";
  const selector = `git+https://github.com/Hadden-Industries/json-quality.git#${commit}`;
  writeFileSync(
    join(tooling, "package.json"),
    JSON.stringify(
      { private: true, type: "module", devDependencies: { [name]: selector } },
      null,
      2,
    ) + "\n",
  );
  // A private cache makes this independent of a previous successful acquisition.
  const cache = join(directory, "cache");
  const env = {
    ...process.env,
    npm_execpath: npm,
    npm_config_cache: cache,
    npm_config_engine_strict: "true",
  };
  const options = {
    cwd: tooling,
    env,
    windowsHide: true,
    encoding: "utf8",
    timeout: 300000,
  };
  execFileSync(
    process.execPath,
    [
      npm,
      "install",
      "--package-lock-only",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--allow-git=root",
    ],
    options,
  );
  const lock = JSON.parse(
    readFileSync(join(tooling, "package-lock.json"), "utf8"),
  );
  assert.equal(lock.packages[`node_modules/${name}`].resolved, selector);
  writeFileSync(join(tooling, "public-api.mjs"), `export * from "${name}";\n`);
  const bootstrap = join(directory, "scripts", "acquire.mjs");
  writeFileSync(bootstrap, jsonQualityAcquisitionBootstrap());
  execFileSync(process.execPath, [bootstrap, "json"], {
    ...options,
    cwd: directory,
  });
  const probe = join(tooling, "verify.mjs");
  writeFileSync(
    probe,
    `import assert from "node:assert/strict";\nimport {writeFileSync} from "node:fs";\nimport {join} from "node:path";\nimport {verifyJsonQualityInstallation,assertIsolatedJsonQuality} from "${name}";\nconst toolingRoot=process.cwd();\nassert.equal(assertIsolatedJsonQuality(toolingRoot),toolingRoot);\nconst options={toolingRoot,cachePath:process.argv[2],bootstrapPath:process.argv[3]};\nconst result=await verifyJsonQualityInstallation(options);\nassert.equal(result.coordinate.commit,"${commit}");\nwriteFileSync(join(toolingRoot,"node_modules","@hadden-industries","json-quality","README.md"),"tampered");\nawait assert.rejects(verifyJsonQualityInstallation(options),/payload differs/u);\n`,
  );
  execFileSync(process.execPath, [probe, cache, bootstrap], options);
  execFileSync(
    process.execPath,
    [
      npm,
      "ci",
      "--offline",
      "--engine-strict",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--allow-git=root",
    ],
    options,
  );
  execFileSync(process.execPath, [probe, cache, bootstrap], options);
  return { commit };
}
