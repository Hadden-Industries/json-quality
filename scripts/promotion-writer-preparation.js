// SPDX-License-Identifier: AGPL-3.0-only
/** Startup-safe promotion preparation consumes a separately authenticated full admission. */
import assert from "node:assert/strict";
import { api, optionalApi } from "./release-provider.js";
import { npmViewObject, sha256 } from "./release-contract.js";
import { isolatedNpmEnvironment } from "./release-inventory.js";
import { npmCommand } from "./qualification-process.js";
import { consumeWriterAdmission } from "./release-writer-admission.js";
import {
  admitNpmContinuation,
  admitGithubContinuation,
} from "./promotion-handoff.js";

/** Writers authenticate the original admission and service results before reading labels. */
export function preparePromotionWriter(directory, scratch, service, env) {
  const admitted = consumeWriterAdmission(directory, "promote", env, {
    readOnly: service === "complete",
  });
  const { release, family } = admitted;
  assert.ok(
    family,
    "Current writers require an explicitly admitted family scope",
  );
  assert.equal(sha256(Buffer.from(env.OPERATION_JSON)), family.operationId);
  assert.equal(family.operationId, env.OPERATION_SHA);
  const target = family.subjects.find(
    (value) => value.package === release.package,
  ).target;
  const continuation =
    service === "npm"
      ? null
      : admitNpmContinuation(directory, env, release, target, family);
  const githubContinuation =
    service === "complete" && family.github.selected
      ? admitGithubContinuation(directory, env, release)
      : null;
  return {
    ...promotionObservation(admitted, scratch),
    target,
    expected: family,
    planOptions: { npmOnly: !family.github.selected },
    continuation,
    githubContinuation,
    auditRelease: release,
  };
}

/** Construct read capabilities only after the caller authenticates native evidence. */
export function promotionObservation(admitted, scratch) {
  const { release, family } = admitted;
  const isolation = isolatedNpmEnvironment(scratch);
  const tags = (packageName, deadline) => {
    const timeout =
      deadline === undefined
        ? undefined
        : Math.floor(deadline - performance.now());
    if (timeout !== undefined && timeout <= 0)
      throw Object.assign(
        new Error("Npm completion observation deadline exhausted"),
        { code: "ETIMEDOUT" },
      );
    return npmViewObject(
      npmCommand(
        [
          "view",
          packageName,
          "dist-tags",
          "--json",
          "--registry=https://registry.npmjs.org/",
        ],
        { env: isolation, ...(timeout ? { timeout } : {}) },
      ),
    );
  };
  const targetId = family.github.target?.id ?? family.github.prior?.id;
  const currentGithubState = (deadline) => ({
    latest: optionalApi("releases/latest", { deadline }),
    affected:
      family.operation === "scoped-restore" && !admitted.context.archive
        ? null
        : api(`releases/tags/v${release.version}`, [], { deadline }),
    target: targetId ? api(`releases/${targetId}`, [], { deadline }) : null,
    releases: (family.github.guards ?? []).map((guard) =>
      api(`releases/${guard.id}`, [], { deadline }),
    ),
  });
  return {
    ...admitted,
    isolation,
    tags,
    currentGithubState,
  };
}
