# Documentation

Use the current contracts and runbooks below when developing or consuming cohort 2.
Dated [plans](https://github.com/Hadden-Industries/json-quality/tree/main/docs/plans) describe decisions and historical proposals; they do not establish implemented or hosted acceptance.

| Need                                 | Reference                                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------------------------- |
| First use                            | [README](../README.md), [maintained example](../examples/source-session.mjs)                |
| Library signatures and effects       | [API](api.md), [consumer guide](consumer-guide.md)                                          |
| Commands, output and exit status     | [CLI](cli.md)                                                                               |
| Policy and exported schemas          | [Configuration](configuration.md)                                                           |
| CPU, memory, scratch and deadlines   | [Resource controls](resource-limits.md)                                                     |
| ESLint configuration and diagnostics | [Identity rule](rules/no-json-stringify-identity.md)                                        |
| Node/npm and platforms               | [Runtime compatibility](node-runtime-compatibility.md)                                      |
| Ownership and module boundaries      | [Architecture](architecture.md), [shared contracts](centralized-contracts.md)               |
| Native executable transport          | [Protocol](native-protocol.md)                                                              |
| Deliberate CI and equal-input reuse  | [CI trust](ci-trust.md), [contributing](../CONTRIBUTING.md)                                 |
| Releases, provenance and recovery    | [Release operations](release-operations.md), [changelog](../CHANGELOG.md)                   |
| Scope selection and performance      | [Dependency graph](dependency-graph-and-tests.md), [performance](javascript-performance.md) |
| Isolated Markdown tooling            | [Markdown quality](markdown-quality.md)                                                     |

The [native producer guide](https://github.com/Hadden-Industries/json-quality/blob/main/native/README.md) belongs to the source repository; the core package contains no native producer directory or platform payload.

Source implementation, local tests, hosted checks, publication and downstream acceptance are separate claims.
