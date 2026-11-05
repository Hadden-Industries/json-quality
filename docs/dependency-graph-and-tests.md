# Development analysis

The reference producer uses its locked dependency-cruiser installation and existing architecture policy.
Generate a new external report directory with:

```sh
npm run generate:dependency-graphs -- --output /absolute/external/new-graph
npm run generate:dependency-graphs -- --output /absolute/external/new-focused-graph --focus src/native-formatting.js
```

The bundle retains the complete native JSON import graph, native Mermaid overview/runtime/test views, optional focus/dependent views, declared process relations and source/lock provenance.
Architecture enforcement and reporting share one graph implementation.
The reports do not execute tests, establish test coverage or prove that unreachable modules are removable.
Existing output directories are refused.
The invoking maintainer owns the bundle and reassesses exploratory copies after their consumers finish.

Affected-test listing and shadow comparison use an explicit full baseline commit:

```sh
npm run test:affected -- --base FULL_COMMIT_SHA --list
npm run test:affected -- --base FULL_COMMIT_SHA --shadow
```

`--list` and the existing `--dry-run` run no tests.
The ordinary invocation executes complete selected test files, with the full suite as the fallback for uncertainty.
`--shadow` additionally discovers the full test inventory independently and compares stable pass/fail/skip/todo outcomes for the selected tests.
It retains both native outputs and failures; a passing full run cannot erase a failed subset.
Missing outcomes, source drift, runner errors or inconsistent common outcomes fail the operation.
No shadow or other test mode was executed during the 2026-10-18 alignment, by explicit owner instruction.

## Early qualification checks

`check:repository` runs JavaScript lint and formatting/Markdown checks before test execution and installed-package qualification.
The workflow contract check and installed qualifier also preflight the maintained main-binary CLI commands through the actual argument parser before native work or consumer installation.
The installed CLI runner checks each constructed invocation again before launching npm, so a stale caller cannot evade the inventory preflight.
Successful and quality-failing commands must pass admission; intentional exit-2 cases retain their argument or operational refusal semantics.
This preflight checks command compatibility only; the installed corpus still proves execution, byte preservation, convergence and failure behavior on each selected runtime and platform.

Version synchronization compares parsed JSON structurally, so member order and whitespace alone neither fail its check nor cause rewrites.
It validates the complete projection batch before writing; malformed later inputs cannot permit partial updates.

## Tooling dependency overrides

The [root manifest](https://github.com/Hadden-Industries/json-quality/blob/main/package.json) owns the selected patched `minimatch` overrides for ESLint and `@eslint/config-array`, addressing [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249).
The root also owns the override for `readdir-glob`'s matcher and selects a patched `glob` beneath `archiver-utils` for [GHSA-3g3m-2fjr-6pw4](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4).
These overrides apply to development tooling; product runtime dependencies retain their existing versions and identities.
Markdown Quality is a root development dependency; the root lockfile freezes its published package and platform dependencies.
Remove each override when its parent dependency admits a patched version and the regenerated complete graph passes `npm run audit:dependencies`.

The major-version replacements retain the caller APIs in use: `Minimatch` construction and matching, and `glob.sync`.
`tests/tooling-globs.test.js` exercises the actual transitive callers, selection/exclusion behavior and local Artifact SDK ZIP construction with exact entry names and bytes.
Run ESLint and the Markdown commands in the [tooling guide](markdown-quality.md) to check their respective repository inputs.
Glob's Windows expansion paths use native separators; ZIP entries must retain portable forward-slash names.
