# JSON Quality documentation

[Install JSON Quality and run your first check](../README.md#install-and-first-check) in an existing Git repository.
These guides describe contract cohort 6.

## Use JSON Quality

- [Choose a CLI command](cli.md) for a Git repository, selected files or stdin.
  Look up [exit codes](cli.md#exit-status) when a check fails.
- [Read a number without losing its spelling](consumer-guide.md#stream-a-source-and-read-lossless-values) or [run the source-session example](../examples/source-session.mjs).
- [Preview and apply a repair](../README.md#preview-and-apply-a-repair) to format a file or normalize Unicode.
- [Check immutable Git inputs in CI](ci-trust.md) using a trusted policy and a separate candidate commit.

## Look up a contract

- [Public API](api.md) — ESM exports, session methods, effects and provider declarations.
- [Configuration and schemas](configuration.md) — defaults, path exceptions, offline registration and migration.
- [Resource controls](resource-limits.md) — memory, scratch, input size, deadlines and operation-specific quotas.
- [Node runtime compatibility](node-runtime-compatibility.md) — supported platforms, Node versions and producer toolchain.
- [ESLint identity rule](rules/no-json-stringify-identity.md) — configuration, examples and diagnostics.
- [Native protocol](native-protocol.md) — binary frames, handshake and supervision for a non-Node host.

## Develop and release

- [Set up the checkout and submit a change](../CONTRIBUTING.md).
  Use the [Markdown workflow](markdown-quality.md) for documentation changes.
- [Trace a check through the architecture](architecture.md) or [find the source that owns a rule](centralized-contracts.md).
- [Generate dependency graphs and select tests](dependency-graph-and-tests.md) or [measure orchestration performance](javascript-performance.md).
- [Build and stage native components](https://github.com/Hadden-Industries/json-quality/blob/main/native/README.md) from a source checkout.
- [Qualify a candidate PR or recover a main run](ci-trust.md#deliberate-repository-acceptance).
- [Stage, archive, promote or recover a release](release-operations.md).
  Find user-visible changes in the [changelog](../CHANGELOG.md).

Dated [implementation plans and evidence](https://github.com/Hadden-Industries/json-quality/tree/main/docs/plans) record design decisions and historical proposals.
Use the current references above for implemented contracts.
