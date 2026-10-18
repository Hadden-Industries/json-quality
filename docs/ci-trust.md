# Trusted consumer CI

The public `json-quality-qualify` command and `qualifyJsonConsumer` API check an immutable candidate under an independently selected trusted root policy.
The reusable workflow is [json-quality.yml](https://github.com/Hadden-Industries/json-quality/blob/main/.github/workflows/json-quality.yml).
Pin the workflow to a full reviewed producer commit.
Pass full `trusted-sha` and `candidate-sha` commits and their repository names.
Caller inputs `capacity-limits`, `timeout-minutes` and `artifact-retention-days` configure capacity and evidence retention; see [consumer resource controls](resource-limits.md).
The CLI exposes the ordinary capacity flags and environment `JSON_QUALITY_CAPACITY_LIMITS`; CLI `--capacity-limits` / `--no-capacity-limits` map to API/JSON `capacityLimits: true` / `capacityLimits: false`.
Boolean `true` or a numeric override object enables finite configured/default capacities; `false` disables the 17 shared capacities.
Invocation limits reach initial trusted-policy bootstrap, Git metadata/blob acquisition and nested checking.
Both checkouts must be clean and match those identities.
The shared workflow disables automatic CRLF conversion before checkout because working JSON and policy bytes must equal their Git blobs.
Explicit attributes that force transformed checkout bytes are refused by byte-exact qualification.

The workflow acquires only the producer's frozen dependency graph with lifecycle scripts disabled.
It uses read-only repository permissions and receives no registry credential, publication environment or OIDC permission.
Candidate npm scripts, JavaScript configuration, Git attributes and dependency graphs never execute.
Only regular tracked JSON-family blobs are materialized as data in a fresh temporary Git inventory.
The root `.json-quality.json` comes from the trusted checkout; a candidate policy change cannot relax the current check.
Candidate and trusted source identities and the trusted policy digest are retained with the native quality result.
The checker does not emit document bodies in its report.

```sh
json-quality-qualify --trusted-root /path/to/trusted --trusted-sha FULL_COMMIT_SHA --candidate-root /path/to/candidate --candidate-sha FULL_COMMIT_SHA
```

This source-only qualification covers tracked candidate JSON and the trusted policy.
It does not certify generated or untracked outputs, native storage/domain admission, or logical-document census.
A policy requiring native sources or preserved source presentation is refused; use the repository's trusted adapter for those obligations.
The ordinary library and CLI retain their complete owned-tree, logical and native checking interfaces.
Consumer CI success is separate from product qualification, package acquisition verification and release acceptance.

Product CI remains manually dispatched.
This workflow has only `workflow_call`; adding it does not enable automatic product tests on pushes or pull requests.
