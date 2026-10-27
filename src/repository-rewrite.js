// SPDX-License-Identifier: AGPL-3.0-only
// Explicit finite file effects after complete peer and candidate preflight.
import { assertRepositoryPath, assertRegularSource } from "./paths.js";
import { realpath } from "node:fs/promises";
import { relative, sep } from "node:path";
import { encodeNativeControl } from "./native-control.js";
import { repositoryMembers } from "./repository-check.js";
import { recheckRepositorySource } from "./repository-source.js";
import { recheckNativeAuthorities } from "./native-provider.js";
import {
  recheckRepositoryDiscovery,
  recheckRepositoryWriteDiscovery,
} from "./repository-discovery.js";
import { gitIgnoreBatchLimits, ignoredGitPaths } from "./git-ignore.js";
import { formatSource } from "./native-formatting.js";
import { normalizeSource } from "./native-normalization.js";
import { replaceObservedSource } from "./guarded-replacement.js";
import {
  JSON_TRANSFORM_CAPABILITIES,
  transformWorkspaceReservation,
} from "./transform-capabilities.js";
import { jsonSourceFormat, isJsonLinesPath } from "./json-paths.js";

function selection(/** @type {*} */ operation, /** @type {*} */ options) {
  if (
    !["format", "normalize"].includes(operation) ||
    !options ||
    typeof options !== "object" ||
    Array.isArray(options) ||
    Object.keys(options).some((key) => key !== "files")
  )
    throw new TypeError(
      "Expected an explicit format/normalize operation and optional files.",
    );
  if (
    operation === "normalize" &&
    (!Array.isArray(options.files) || !options.files.length)
  )
    throw new TypeError(
      "Normalization requires explicit physical source paths.",
    );
  if (options.files === undefined) return null;
  if (!Array.isArray(options.files) || options.files.length > 4096)
    throw new TypeError("At most 4096 explicit write paths are supported.");
  const files = JSON.parse(
      encodeNativeControl({ files: options.files }).toString(),
    ).files,
    selected = new Set();
  for (const path of files) {
    assertRepositoryPath(path);
    if (selected.has(path))
      throw new TypeError("Duplicate explicit write path.");
    selected.add(path);
  }
  return selected;
}

async function policyAllowsWrite(
  /** @type {*} */ root,
  /** @type {*} */ member,
  /** @type {*} */ execution,
) {
  const contract = execution.contractFor(member.path, {
    tracked: member.provider === "git",
  });
  if (
    member.kind !== "physical" ||
    contract.allowFormatWrites !== true ||
    isJsonLinesPath(member.path)
  )
    return false;
  const parts = member.path.split("/");
  for (let length = 1; length < parts.length; length++)
    if (execution.contractFor(parts.slice(0, length).join("/") + "/").exclude)
      return false;
  // Windows Git/index spelling can differ from the actual directory entry.
  // Permission must also survive matching the canonical filesystem spelling;
  // otherwise an uppercase index alias can evade a pruned/protected ancestor.
  // Re-resolve each observed regular source rather than lowercasing policy
  // globs, which would conflate distinct case-sensitive Windows directories.
  if (process.platform === "win32") {
    const actual = relative(
      await realpath(root),
      await realpath(assertRegularSource(root, member.path)),
    )
      .split(sep)
      .join("/");
    const actualContract = execution.contractFor(actual, {
      tracked: member.provider === "git",
    });
    if (actualContract.allowFormatWrites !== true) return false;
    const actualParts = actual.split("/");
    for (let length = 1; length < actualParts.length; length++)
      if (
        execution.contractFor(actualParts.slice(0, length).join("/") + "/")
          .exclude
      )
        return false;
  }
  if (
    (
      await execution.core.command("census-get-authority", {
        path: member.path,
      })
    ).result.authority
  )
    return false;
  return true;
}

async function withGitIgnoreReservation(
  /** @type {*} */ execution,
  /** @type {*} */ operation,
) {
  const limits = gitIgnoreBatchLimits(execution.numericResources);
  await execution.core.command("resize-control-state", {
    byteLength: String(
      BigInt(execution.controlStateBytes) + BigInt(limits.reservationBytes),
    ),
  });
  let operationFailed = false;
  try {
    return await operation(limits);
  } catch (error) {
    operationFailed = true;
    throw error;
  } finally {
    try {
      await execution.core.command("resize-control-state", {
        byteLength: execution.controlStateBytes,
      });
    } catch (error) {
      // A refused native selection may cancel the core. Preserve that primary
      // refusal; the session owner still closes its resources after failure.
      // A cleanup failure must block success; an existing refusal takes priority.
      // eslint-disable-next-line no-unsafe-finally
      if (!operationFailed) throw error;
    }
  }
}

/** Keep only one byte/count-bounded path batch; native state owns the complete
 * candidate inventory. Selection finishes before transformation or file effects.
 */
async function selectWritablePaths(
  /** @type {*} */ root,
  /** @type {*} */ execution,
  /** @type {*} */ selected,
  /** @type {*} */ gitExecutable,
) {
  return withGitIgnoreReservation(
    execution,
    async (/** @type {*} */ limits) => {
      const core = execution.core;
      let /** @type {any[]} */ paths = [],
        bytes = 0;
      const flush = async () => {
        const ignored = await ignoredGitPaths(
          root,
          paths,
          execution,
          gitExecutable,
        );
        for (const path of paths) {
          if (ignored.has(path)) {
            if (selected)
              throw new Error(
                `Protected or undiscovered write source: ${path}`,
              );
          } else await core.command("rewrite-select", { path });
        }
        paths = [];
        bytes = 0;
      };
      async function* members() {
        if (selected) {
          for (const path of selected) {
            const member = (await core.command("census-get", { path })).result
              .member;
            if (!member)
              throw new Error(
                `Protected or undiscovered write source: ${path}`,
              );
            yield member;
          }
        } else yield* repositoryMembers(core, execution.signal);
      }
      for await (const member of members()) {
        execution.signal?.throwIfAborted();
        if (!(await policyAllowsWrite(root, member, execution))) {
          if (selected)
            throw new Error(
              `Protected or undiscovered write source: ${member.path}`,
            );
          continue;
        }
        const size = Buffer.byteLength(member.path) + 1;
        if (size > limits.maximumInputBytes)
          throw new Error("git-ignore-input-capacity");
        if (
          paths.length === limits.maximumPaths ||
          bytes + size > limits.maximumInputBytes
        )
          await flush();
        paths.push(member.path);
        bytes += size;
      }
      if (paths.length) await flush();
    },
  );
}

async function* sourceBytes(
  /** @type {*} */ core,
  /** @type {*} */ source,
  /** @type {*} */ signal,
) {
  let offset = 0n;
  while (true) {
    signal?.throwIfAborted();
    const range = await core.command("read-source", {
      source,
      offset: String(offset),
      maximum: "65536",
    });
    if (range.data?.length) yield range.data;
    offset += BigInt(range.data?.length ?? 0);
    if (offset === BigInt(range.result.totalByteLength)) return;
    if (!range.data?.length)
      throw new Error("Incomplete retained candidate source.");
  }
}

async function sourceText(/** @type {*} */ execution, /** @type {*} */ member) {
  const length = BigInt(member.byteLength);
  if (length > BigInt(JSON_TRANSFORM_CAPABILITIES.maximumSourceBytes))
    throw new Error("transform-source-capacity");
  await execution.core.command("resize-control-state", {
    byteLength: String(
      BigInt(execution.controlStateBytes) +
        BigInt(transformWorkspaceReservation(Number(length))),
    ),
  });
  const bytes = Buffer.alloc(Number(length));
  let offset = 0;
  for await (const part of sourceBytes(
    execution.core,
    member.source,
    execution.signal,
  )) {
    bytes.set(part, offset);
    offset += part.length;
  }
  if (offset !== bytes.length) throw new Error("Incomplete writer source.");
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

async function fresh(
  /** @type {*} */ root,
  /** @type {*} */ execution,
  /** @type {*} */ gitExecutable,
  /** @type {*} */ afterWrites,
) {
  const core = execution.core;
  for await (const member of repositoryMembers(core, execution.signal)) {
    if (member.kind !== "physical") continue;
    const candidate = (await core.command("rewrite-get", { path: member.path }))
      .result.candidate;
    await recheckRepositorySource({
      root,
      member: candidate?.written ? { ...member, ...candidate } : member,
      signal: execution.signal,
    });
  }
  const policy = (
    await core.command("rewrite-get", { path: ".json-quality.json" })
  ).result.candidate;
  await recheckRepositorySource({
    root,
    member: policy?.written
      ? { ...execution.policyObservation, ...policy }
      : execution.policyObservation,
    signal: execution.signal,
  });
  await recheckNativeAuthorities({
    root,
    session: core,
    signal: execution.signal,
  });
  await (
    afterWrites ? recheckRepositoryWriteDiscovery : recheckRepositoryDiscovery
  )({
    root,
    session: core,
    capacities: execution.resources.admission,
    gitExecutable,
    signal: execution.signal,
    contractFor: execution.contractFor,
  });
}

async function* candidates(/** @type {*} */ core, /** @type {*} */ signal) {
  let after = "";
  while (true) {
    signal?.throwIfAborted();
    const candidate = (await core.command("rewrite-next", { after })).result
      .candidate;
    if (!candidate) return;
    yield candidate;
    after = candidate.path;
  }
}

/** Internal effect owner for one completed retained repository execution. It
 * never collects file bodies/candidates in JS. Policy is formatted last so its
 * frozen observation governs every earlier effect. Failure reports confirmed
 * writes and an uncertain current path; no batch-atomicity claim is made.
 */
export async function* rewriteRepository(
  /** @type {*} */ execution,
  /** @type {*} */ { root, gitExecutable },
  /** @type {*} */ operation,
  /** @type {*} */ options = {},
) {
  const selected = selection(operation, options),
    core = execution.core;
  let written = 0n,
    uncertainPath = null,
    preflightComplete = false,
    afterWrites = false;
  try {
    await core.command("rewrite-start", { operation });
    await fresh(root, execution, gitExecutable, false);
    await selectWritablePaths(root, execution, selected, gitExecutable);
    for await (const candidate of candidates(core, execution.signal)) {
      const member = (
          await core.command("census-get", { path: candidate.path })
        ).result.member,
        contract = execution.contractFor(member.path, {
          tracked: member.provider === "git",
        }),
        capacityLimits = Object.values(
          execution.numericResources.admission,
        ).some((value) => value === null)
          ? false
          : execution.numericResources.admission;
      let /** @type {string | undefined} */ text = await sourceText(
          execution,
          member,
        ),
        /** @type {ReturnType<typeof import("./transform-capabilities.js").retainedTransformResult> | undefined} */ transformed =
          await (operation === "format" ? formatSource : normalizeSource)(
            text,
            {
              core,
              parentSource: member.source,
              controlStateBytes: execution.controlStateBytes,
              capacityLimits,
              runtimeControls: execution.numericResources.runtime,
              signal: execution.signal,
              allowEmptyKeys: contract.allowEmptyKeys,
              normalization: contract.normalization,
              preserveNfcValues: contract.preserveNfcValues,
            },
          );
      // Selected complete policy applies again after transformation. Preflight
      // writer parsing never substitutes for this final source obligation.
      const postReservation =
          BigInt(execution.controlStateBytes) +
          BigInt(
            transformWorkspaceReservation(
              Math.max(
                Buffer.byteLength(text),
                Buffer.byteLength(transformed.text),
              ),
            ),
          ),
        heldReservation = BigInt(
          (await core.command("metrics")).result.controlStateReservationBytes,
        );
      if (postReservation > heldReservation)
        await core.command("resize-control-state", {
          byteLength: String(postReservation),
        });
      const captured = await core.capture(
        [Buffer.from(transformed.text)],
        { ...contract, path: member.path, format: "json" },
        { retainValues: true, transformOf: transformed.capture.source },
      );
      yield {
        type: "source",
        source: captured.source,
        byteLength: captured.byteLength,
        sha256: captured.sha256,
        path: member.path,
        scope: "candidate",
      };
      for await (const event of core.events())
        yield { ...event, path: member.path, scope: "candidate" };
      await core.command("rewrite-bind", {
        path: member.path,
        source: captured.source,
      });
      text = undefined;
      await transformed.release();
      transformed = undefined;
    }
    while (true) {
      const member = (await core.command("rewrite-dependent")).result.member;
      if (!member) break;
      const link = member.linkage,
        source = (
          await core.command("rewrite-map-source", {
            source: link.containerSource,
          })
        ).result.source,
        value = (
          await core.command("rewrite-corresponding-value", {
            source,
            value: link.value,
          })
        ).result.value.id,
        contract = execution.contractFor(member.path, { identity: member }),
        captured = (
          await core.command("begin-linked-source", {
            value,
            encoding: link.encoding,
            contract: {
              ...contract,
              path: member.path,
              format: jsonSourceFormat(member.path),
            },
            retainValues: true,
          })
        ).result;
      yield {
        type: "source",
        source: captured.source,
        byteLength: captured.byteLength,
        sha256: captured.sha256,
        path: member.path,
        scope: "candidate",
      };
      for await (const event of core.events())
        yield { ...event, path: member.path, scope: "candidate" };
      await core.command("rewrite-bind", {
        path: member.path,
        source: captured.source,
      });
    }
    const admitted = (await core.command("rewrite-admit")).result;
    await fresh(root, execution, gitExecutable, false);
    preflightComplete = true;
    yield {
      type: "write-preflight",
      operation,
      selected: admitted.selected,
      changed: admitted.changed,
      preflightComplete: true,
    };
    // Re-read indexed candidates for effects, with the mutable policy last.
    for (const policyLast of [false, true])
      for await (const candidate of candidates(core, execution.signal)) {
        if (
          !candidate.changed ||
          (candidate.path === ".json-quality.json") !== policyLast
        )
          continue;
        const member = (
          await core.command("census-get", { path: candidate.path })
        ).result.member;
        await fresh(root, execution, gitExecutable, afterWrites);
        await withGitIgnoreReservation(execution, async () => {
          if (
            !(await policyAllowsWrite(root, member, execution)) ||
            (
              await ignoredGitPaths(
                root,
                [member.path],
                execution,
                gitExecutable,
              )
            ).has(member.path)
          )
            throw new Error(`Write permission changed: ${member.path}`);
        });
        uncertainPath = member.path;
        const committed = await replaceObservedSource({
          root,
          member,
          candidate,
          chunks: sourceBytes(core, candidate.source, execution.signal),
          signal: execution.signal,
        });
        await core.command("rewrite-written", {
          path: member.path,
          observation: committed.observation,
        });
        written++;
        afterWrites = true;
        uncertainPath = null;
        yield {
          type: "written",
          operation,
          path: member.path,
          byteLength: committed.byteLength,
          sha256: committed.sha256,
        };
      }
    await fresh(root, execution, gitExecutable, afterWrites);
    const status = (await core.command("rewrite-status")).result;
    if (!status.writesComplete)
      throw new Error("Incomplete repository replacement.");
    yield {
      type: "write-terminal",
      operation,
      selected: status.selected,
      changed: status.changed,
      written: status.written,
      complete: true,
      writesComplete: true,
      preflightComplete: true,
      sourceObservationsComplete: true,
    };
  } catch (error) {
    yield {
      type: "write-failure",
      operation,
      complete: false,
      preflightComplete,
      written: String(written),
      uncertainPath,
      message: String(error instanceof Error ? error.message : error).slice(
        0,
        2048,
      ),
    };
  }
}
