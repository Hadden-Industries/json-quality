// SPDX-License-Identifier: AGPL-3.0-only
// Exact input identity; this module never participates in pure policy resolution.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import cohort from "../schemas/contract-cohort.json" with { type: "json" };
import { encodeNativeControl } from "./native-control.js";
import { readControlOptions } from "./control-snapshot.js";
import { policyResolverFingerprint } from "./policy-inputs.js";

const sha256 = (/** @type {*} */ bytes) =>
  createHash("sha256").update(bytes).digest("hex");
const defaultPolicySha256 = sha256(
    readFileSync(
      new URL("../assets/default-json-quality-policy.json", import.meta.url),
    ),
  ),
  policyResolverInputsSha256 = policyResolverFingerprint();

export function policyProvenance(
  /** @type {*} */ configurationOrigin,
  /** @type {*} */ member,
) {
  configurationOrigin = {
    ...readControlOptions(configurationOrigin, [
      "kind",
      "path",
      "commitId",
      "blobId",
    ]),
  };
  const kinds = [
      "repository-file",
      "repository-absence",
      "git-blob",
      "git-absence",
    ],
    git = ["git-blob", "git-absence"].includes(configurationOrigin.kind);
  if (
    !kinds.includes(configurationOrigin.kind) ||
    configurationOrigin.path !== ".json-quality.json" ||
    (git
      ? typeof configurationOrigin.commitId !== "string" ||
        !/^[a-f0-9]{40}$/u.test(configurationOrigin.commitId)
      : Object.hasOwn(configurationOrigin, "commitId")) ||
    (configurationOrigin.kind === "git-blob"
      ? typeof configurationOrigin.blobId !== "string" ||
        !/^[a-f0-9]{40}$/u.test(configurationOrigin.blobId)
      : Object.hasOwn(configurationOrigin, "blobId"))
  )
    throw new TypeError("Invalid configuration origin.");
  const present = ["repository-file", "git-blob"].includes(
    configurationOrigin.kind,
  );
  if (
    present !== Boolean(member) ||
    (present &&
      (typeof member.sha256 !== "string" ||
        typeof member.byteLength !== "string" ||
        !/^[a-f0-9]{64}$/u.test(member.sha256) ||
        !/^(0|[1-9][0-9]*)$/u.test(member.byteLength)))
  )
    throw new TypeError("Invalid configuration byte provenance.");
  if (
    configurationOrigin.kind === "git-blob" &&
    configurationOrigin.blobId !== member.oid
  )
    throw new TypeError("Trusted configuration blob identity mismatch.");
  const tuple = [
    "json-quality-policy-inputs-v1",
    String(cohort.cohortVersion),
    defaultPolicySha256,
    policyResolverInputsSha256,
    configurationOrigin.kind,
    configurationOrigin.path,
    configurationOrigin.commitId ?? null,
    configurationOrigin.blobId ?? null,
    member?.byteLength ?? null,
    member?.sha256 ?? null,
  ];
  return Object.freeze({
    configurationOrigin: Object.freeze(configurationOrigin),
    defaultPolicySha256,
    policyResolverInputsSha256,
    ...(present
      ? {
          configurationByteLength: member.byteLength,
          configurationBytesSha256: member.sha256,
        }
      : {}),
    policyInputsSha256: sha256(encodeNativeControl(tuple)),
  });
}
