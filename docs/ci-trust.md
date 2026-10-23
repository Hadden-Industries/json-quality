# Trusted consumer CI

`json-quality-qualify` and the `qualifyJsonConsumer` asynchronous iterator check immutable candidate Git JSON under the policy from an independently selected immutable trusted commit.
The reusable [workflow](https://github.com/Hadden-Industries/json-quality/blob/main/.github/workflows/json-quality.yml) must be pinned to a reviewed full producer commit.

```sh
json-quality-qualify --trusted-root /trusted --candidate-root /candidate \
  --trusted-sha FULL_COMMIT --candidate-sha FULL_COMMIT
```

Both identities must be full 40-character commit object IDs.
The scope is explicitly `immutable-git-json`: checkout/HEAD cleanliness is not a qualification claim. The command reads the selected objects, leaving dirty or transformed working bytes untouched. A missing commit, non-commit identity or absent/nonregular trusted policy refuses completion.

The producer's installed component and local schemas own admission.
A bounded native/Ajv bootstrap reads the trusted `.json-quality.json` from its Git blob, verifies exact bytes and transfers the admitted frozen control charge into the main core.
Candidate policy is ordinary checked candidate data; it never selects the governing policy or loads code.

Raw native Git metadata and blob streams supply the candidate census.
Blob length and Git's framed object SHA-1 are independently verified before the source terminator.
JSON parsing and byte/rule checking occur in the shared native core. No complete document array, copied scratch checkout or second JavaScript JSON checker is used. Recognized unsupported dialects and tracked symlink/nonregular JSON entries refuse admission.

Git is selected as an external native tool outside both source roots.
Its identity is observed and rechecked.
Inherited Git directory/config injection, replacement objects and lazy fetching are disabled. The path uses `ls-tree`/raw `cat-file`; it does not invoke candidate npm scripts, imports, dependency graphs, Git status/fsmonitor, checkout filters or hooks.
The trusted policy cannot fetch schemas or executable providers from data.

Source-only qualification refuses policy requirements for native sources, original native/logical presentation or expected logical linkage.
Use the complete trusted repository adapter to discharge those obligations.
It also makes no application-domain, archive-meaning or installation-integrity claim.

Output is cohort-2 NDJSON, with correlated `execution`, source/finding/terminal events and final `execution-terminal`.
Execution metadata names the trusted/candidate commits, trusted policy blob, policy SHA-256, core source identity and `immutable-git-json` scope.
Only the final terminal closes inventory, diagnostic and source-observation obligations.
`domainComplete` stays false.
The terminal is delivered after owned native storage and Git subprocesses settle.

Exit 0 means the selected source contracts were satisfied and delivery completed.
Shared contract failure returns 1.
Acquisition, resource, identity, cancellation, cleanup or output failure returns 2 and provides no successful final verdict.
Exact expected negatives can satisfy their pinned contracts while intrinsic `qualityPassed` is false; findings remain visible.

The API takes `{ trustedRoot, candidateRoot, trustedSha, candidateSha, capacityLimits, runtimeControls, temporaryDirectory, signal, requestId }`.
Consume the iterator to completion or cancel/return it. CLI resource/runtime flags share the ordinary vocabulary and environment contracts in the [resource guide](resource-limits.md).

The reusable workflow retains read-only repository permissions and no publication/OIDC authority. Its `capacity-limits`, job timeout and artifact-retention inputs govern separate boundaries. Hosted checkout/acquisition and native platform availability still need real workflow evidence; a local source-only pass does not establish a clean transported package, consumer adoption or release approval.
