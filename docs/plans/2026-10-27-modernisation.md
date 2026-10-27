# JSON Quality Modernisation Implementation Plan

This is the replacement implementation plan for the attached `json-quality` clone. It contains only changes to make. The target is a public npm package with a deliberately narrow supported-runtime contract, reproducible npm-owned development, manually checkpointed but mandatory CI, strong package/API ergonomics, and a release path that makes the published artefact independently verifiable.

The central engineering decision is:

> **Development branches stay fast and unrestricted; marking a draft PR “Ready for review” is the deliberate request to qualify that exact accumulated change set; the protected default branch cannot accept it until that qualification has passed.**

That separates *when* expensive assurance runs from *whether* assurance is required.

## Runtime, npm and dependency contract

### Replace the Node family expression with the intended compatibility floor

Change:

```json
"engines": {
  "node": "^22.13.0 || ^24.0.0 || ^26.0.0"
}
```

to:

```json
"engines": {
  "node": ">=22.13.0"
}
```

The meaning should be made explicit throughout the repository:

- `>=22.13.0` is the **installability and compatibility floor**.
- Officially tested/support-gating releases are **Node major versions that are in LTS**.
- Other releases satisfying the engine range receive **best-effort compatibility**, not release-blocking CI guarantees.
- Documentation should recommend the latest security-patched release of an LTS line for actual use rather than presenting `22.13.0` as a security recommendation.

As of **27 October 2026**, the Node project lists Node 22 and Node 24 as LTS and Node 26 as Current. Therefore the gating matrix should initially cover **22 and 24, not 26**. The Node project also changes its release model beginning with Node 27, so repository logic must not infer LTS status from “even major number” rules. citeturn6view0

The latest security release on 21 October 2026 produced Node 22.23.4 and 24.22.1, fixing vulnerabilities up to HIGH severity. Those are appropriate current patch targets at the time of implementation, while `22.13.0` remains the compatibility floor. citeturn5search7

### Reshape `assets/node-support.json`

Replace the present per-family minimum model with a policy that distinguishes the package floor, the currently tested LTS majors, the canonical producer version and best-effort releases. For example:

```json
{
  "schemaVersion": 2,
  "minimum": "22.13.0",
  "testedLtsMajors": [
    22,
    24
  ],
  "reference": "24.22.1",
  "platforms": [
    "ubuntu-24.04",
    "windows-2025",
    "macos-15"
  ],
  "support": {
    "otherEngineCompatibleReleases": "best-effort"
  },
  "producerNpm": {
    "version": "12.2.1",
    "range": ">=12.2.1 <13"
  }
}
```

Resolve the exact current patch for each LTS major when the policy is refreshed, record that exact version in CI evidence, and freeze it for the run. Do not silently change the matrix midway through qualification.

Update `project-node-support.js`, `node-matrix.js`, `ci-node-policy.js`, the Node-policy tests and generated documentation so there is a single authority for:

- the `22.13.0` engine floor;
- which majors are presently LTS-qualified;
- exact current secure patches used by a qualification run;
- the canonical development/producer release;
- platform qualification.

Add a dedicated **minimum-floor lane for Node 22.13.0**. Provision dependencies and the package artefact before entering that lane where practical, then perform its compatibility tests without exposing credentials. This proves that the declared floor is real rather than merely metadata.

Update `.node-version` to the current canonical LTS patch selected by the policy.

### Make npm the explicit repository toolchain authority

Keep an exact producer npm in `packageManager`, updating it to the latest approved safe npm at implementation time:

```json
"packageManager": "npm@<current-approved-version>"
```

Synchronise `devEngines.packageManager` to that selected major/version policy and make a package-manager mismatch an error. npm's `devEngines` exists specifically to constrain contributor tooling before `install`, `ci` and `run` operations. citeturn7search0

All dependency and lockfile operations in scripts, CI, contributor instructions and release operations should use npm.

### Apply the dependency policy consistently

Refresh every direct and transitive dependency to its latest safe compatible release before the rest of the modernisation is qualified.

Use two deliberately different manifest policies:

```text
Runtime dependencies       exact versions
Development dependencies   >= current latest safe version
```

Thus the runtime portion of `package.json` remains deliberately controlled, while development tools remain floating forwards as requested.

Commit the npm lockfile after every refresh. Floating development ranges do **not** make CI non-reproducible when `npm ci` consumes a committed lockfile: npm documents `package-lock.json` as the exact dependency tree needed to reproduce installations despite intermediate dependency releases. citeturn7search4

Apply the same latest/safe refresh principle to the isolated Markdown tooling dependency graph and regenerate its native npm lockfile independently.

Add automated checks that reject:

- a runtime dependency expressed as an unintended range;
- a development dependency that has become exact-pinned;
- `package.json` / lockfile drift;
- a generated Node-policy projection differing from its source policy.

### Clean root tooling configuration

Remove the unused file-type-specific indentation override from `.editorconfig`.

Also remove the conversational-source URL comment currently embedded in that file. Repository configuration should describe the repository's policy directly rather than retain an external conversation as its authority.

## Pull-request CI and default-branch governance

This is the most important process change.

### Introduce a reusable qualification workflow and a deliberately triggered PR wrapper

Create:

```text
.github/
  workflows/
    qualification.yml
    ci.yml
    security.yml
    release-qualification.yml
    stage-release.yml
    release-registry.yml
    github-release.yml
    promote-release.yml
```

`qualification.yml` should be `workflow_call`-only and own the reusable package qualification mechanics.

`ci.yml` should be the PR acceptance wrapper. Its principal trigger should be:

```yaml
name: CI

on:
  pull_request:
    branches:
      - main
    types:
      - ready_for_review
```

Do **not** add `push` or `synchronize` to this merge-gating workflow.

This gives the intended lifecycle:

```text
feature branch
     │
     ├── commit
     ├── commit
     ├── push
     ├── commit
     ├── push
     │
     ▼
draft PR
     │
     ├── continue changing/pushing freely
     │      no full acceptance CI
     │
     ▼
Ready for review
     │
     ▼
one qualification of that exact candidate
     │
     ├── fail → return to draft → make a batch of fixes → Ready again
     │
     └── pass → merge eligible
```

A draft PR cannot itself be merged, and GitHub permits switching between draft and ready states, making this a native manual qualification control rather than an invented CI mechanism. citeturn12search17

### Do not use `workflow_dispatch` as the merge gate

A manually dispatched Actions run is superficially attractive but is the wrong primitive for a required PR check. GitHub explicitly documents that checks created by a `workflow_dispatch` run are not evaluated as required PR status checks, even when they ran against the PR's head commit. `pull_request` is an eligible event; `workflow_dispatch` is not. citeturn6view1turn12search12

Therefore **“Ready for review” becomes the manual Run CI button for merge acceptance**.

Any separately retained diagnostic dispatch must remain explicitly non-gating.

### Make a new commit invalidate acceptance without automatically rerunning CI

After a passing run, suppose the branch is:

```text
A ─ B ─ C ─ D
            ▲
          PASS
```

and another commit is pushed:

```text
A ─ B ─ C ─ D ─ E
                ▲
         not qualified
```

GitHub requires a required check to succeed on the latest relevant SHA; the result on `D` cannot satisfy the requirement for `E`. citeturn6view1

Because `synchronize` is deliberately absent, pushing `E` does **not** trigger the full suite. It simply makes the PR non-mergeable until the author deliberately requests another qualification:

```text
convert to draft
       ↓
finish the next batch
       ↓
Ready for review
       ↓
qualify E
```

This is the exact “fast development but impossible unvalidated merge” behaviour required.

Document that a sufficiently old required check may also need to be rerun: GitHub currently requires a required check to have completed successfully in the repository within the preceding seven days. citeturn6view1

### Use a single, stable merge-gate status

Do not make the ruleset depend on every individual matrix job name. Add a final job whose check name never changes, for example:

```text
CI / acceptance
```

Conceptually:

```yaml
acceptance:
  name: CI / acceptance
  if: ${{ always() }}
  needs:
    - qualification
    - dependency-review
    - codeql
  runs-on: ubuntu-24.04
  steps:
    - name: Require every mandatory predecessor
      env:
        NEEDS_JSON: ${{ toJSON(needs) }}
      run: node scripts/require-successful-ci-needs.js
```

The checker must explicitly assert that **every required predecessor ended in `success`**.

This matters because GitHub treats a skipped job as a successful status for branch-protection purposes. A required job that merely skips because an `if:` condition is false is therefore not a safe acceptance gate. citeturn7search27

Add tests for `require-successful-ci-needs.js` covering success, failure, cancelled and skipped predecessor states.

### Structure qualification into reference and compatibility proof

The reusable qualification workflow should produce the package candidate **once**, then test that exact artefact rather than repacking independently on every lane.

Use:

| Job | Required change |
|---|---|
| Reference qualification | On the canonical current LTS/npm pair, run complete source tests, lint, formatting, architecture checks, Node-policy checks, package checks, type checks, schema checks, JSON dogfooding and package qualification. Produce one immutable `.tgz`. |
| Engine-floor qualification | Run the installed artefact on Node 22.13.0 with no release credentials. |
| LTS/platform matrix | Qualify the same `.tgz` on the latest secure Node patch for every current LTS major on Ubuntu, Windows and macOS. |
| Package-consumer proof | Import every public JS entry point, consume every public schema, load the ESLint plugin, execute both binaries and verify package contents from a clean installation. |
| Security jobs | Run dependency review and CodeQL for the candidate. |
| Acceptance | Fail unless every mandatory job succeeded. |

Add `macos-15` to the platform policy so filesystem/path behaviour is qualified across all three major GitHub-hosted development platforms.

### Make CI secure by construction

Set workflow-level permissions to:

```yaml
permissions:
  contents: read
```

and elevate individual jobs only where their function requires it. CodeQL receives only its required `security-events` permission; publishing receives OIDC only inside the publisher job.

Use:

```yaml
- uses: actions/checkout@<full-commit-sha>
  with:
    persist-credentials: false
```

for external actions generally, with full reviewed commit SHAs and an adjacent release-version comment. GitHub identifies full-length SHA pinning as the safest stable way to prevent a mutable tag from changing what code executes. citeturn5search1turn5search13

Add PR-level concurrency so a newly requested qualification cancels a superseded in-progress qualification for the same PR:

```yaml
concurrency:
  group: json-quality-pr-${{ github.event.pull_request.number }}
  cancel-in-progress: true
```

Do not use path filters on the required workflow. A required workflow skipped by filtering can remain pending and block the PR in confusing ways. citeturn5search8

### Activate a default-branch ruleset

After `CI / acceptance` has existed at least once and can be selected as a status check, create an **active branch ruleset** targeting the default branch with:

| Rule | Configuration |
|---|---|
| Require a pull request before merging | Enabled |
| Required approvals | No mandatory human approval |
| Require status checks | `CI / acceptance` |
| Require branch to be up to date | Enabled |
| Require conversation resolution | Enabled |
| Block force pushes | Enabled |
| Block deletion | Enabled |
| Bypass | None for ordinary development/merge operations |

GitHub's strict required-status mode requires the topic branch to be current with the base before it can merge, preventing acceptance against an obsolete base. citeturn7search5turn12search16

If `main` advances after a qualification, update the PR branch, convert it back to draft and mark it ready again. That deliberately spends another qualification only when the integration candidate has actually changed.

The implementation acceptance test for the ruleset should explicitly demonstrate all six states:

| Scenario | Required outcome |
|---|---|
| Push repeatedly to feature branch | No full CI |
| Push repeatedly to draft PR | No full CI |
| Mark draft Ready for review | Full CI runs once |
| CI fails | Merge blocked |
| CI passes | Merge eligible |
| Push another commit after PASS | No automatic full CI; merge immediately becomes blocked until a new Ready-for-review qualification passes |

A direct ordinary push to the protected default branch must also be rejected.

## Public API, schemas and package quality

### Add first-class type information without changing the implementation language

Make the JavaScript public API statically checkable using JSDoc plus a current TypeScript compiler as development tooling.

Add:

```text
tsconfig.json
types/
  index.d.ts
  eslint.d.ts
```

Annotate all public API inputs, outputs and structured contracts in source JSDoc and enable strict `checkJs`.

Generate declarations deterministically and either commit the generated declarations or generate them into a controlled packaging stage whose output is byte-verified. Given this repository's emphasis on source/artefact identity, the simpler contract is to commit them and have CI reject regeneration drift.

Change the root export metadata along these lines:

```json
{
  "types": "./types/index.d.ts",
  "exports": {
    ".": {
      "types": "./types/index.d.ts",
      "import": "./src/index.js"
    },
    "./eslint": {
      "types": "./types/eslint.d.ts",
      "import": "./src/eslint/index.js"
    }
  }
}
```

Retain the JSON-schema subpath exports, but add consumer compile tests proving that:

- root ESM import resolves correctly;
- named exports have the promised signatures;
- the ESLint plugin has a usable type;
- unsupported internal paths remain unexported;
- a tiny external consumer can type-check using normal Node module resolution.

Add scripts such as:

```json
"check:types": "tsc -p tsconfig.json --noEmit",
"build:types": "tsc -p tsconfig.types.json",
"check:types:generated": "..."
```

and make them part of `check:full`.

### Modernise the public JSON Schemas before stable publication

The package currently mixes Draft 7 public schemas with a 2020-12 release schema. Standardise the public contract schemas on **JSON Schema 2020-12**, which remains the current published JSON Schema version. JSON Schema also recommends explicitly declaring `$schema` and using a stable `$id` for real-world schemas. citeturn14search0turn14search2

For each public schema:

```text
configuration.schema.json
result.schema.json
document-request.schema.json
document-response.schema.json
```

add or standardise:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "<stable project-controlled URI>"
}
```

Then:

- migrate Draft-7-only structure to 2020-12 equivalents;
- migrate `definitions` to `$defs` where applicable;
- make inter-schema `$ref` resolution use the declared identifiers coherently;
- switch runtime compilation to Ajv's 2020-12 implementation;
- compile every schema with strict validation enabled;
- validate each documentation example;
- include deliberately invalid fixtures proving key constraints;
- verify every schema exported through `package.json` is the same byte content used by runtime validation.

If project-controlled GitHub Pages identifiers are used, actually publish the corresponding versioned schemas there rather than leaving identifiers as aspirational addresses.

Make schema-version evolution explicit: a breaking wire/configuration schema change requires a new `schemaVersion` and documented migration, independently of package SemVer.

### Strengthen package-level static checking

Add `@eslint/js` as a floating development dependency and extend the repository's ESLint flat configuration from ESLint's recommended JavaScript rules before layering the package's custom rule and repository-specific rules.

Modern ESLint's flat configuration is the default configuration system, and plugins can publish reusable configurations rather than making consumers reconstruct rule wiring manually. citeturn9search0turn9search7

Fix all newly exposed findings rather than disabling the recommended configuration wholesale.

### Turn the exported ESLint rule into a complete public plugin interface

Expand `src/eslint/index.js` from a bare rules object to include:

```js
{
  meta: {
    name: "@hadden-industries/json-quality",
    version: packageVersion
  },
  rules: {
    "no-json-stringify-identity": ...
  },
  configs: {
    recommended: ...
  }
}
```

Provide a flat-config consumer experience such as:

```js
import jsonQuality from "@hadden-industries/json-quality/eslint";

export default [
  jsonQuality.configs.recommended,
];
```

Add a dedicated rule reference describing:

- what is detected;
- examples that fail;
- examples that pass;
- the explicit identity-contract escape hatch;
- resource-limit options;
- why each diagnostic exists.

Add tests that load the **packed** plugin through ESLint using exactly the documented configuration.

### Add dedicated npm-package validation

Add `publint` as a floating development dependency and run it in strict mode against the candidate package artefact. Its purpose is to detect npm-package metadata/export/resolution compatibility problems that ordinary unit tests do not exercise. citeturn10search6

Add an explicit package contract check covering:

```text
package name
version
licence identifier
engines
bin entries
exports
types
files included
files forbidden
repository metadata
dependency classes
absence of undeclared package entry points
```

Integrate the new checks into:

```text
check:full
release qualification
packaged-consumer qualification
```

### Introduce public-API regression fixtures

Create small fixtures under `tests/consumers/` for:

```text
library API
CLI
qualification CLI
ESLint plugin
configuration schema
result schema
document request/response schemas
typed ESM consumer
```

Each fixture should consume an installed `.tgz`, never source-relative paths. This ensures the tests prove what npm users actually receive.

Add an explicit exported-name contract test so accidentally adding, removing or renaming a root export becomes a conscious public-API decision.

## Security and dependency automation

### Add Dependabot configuration for npm and GitHub Actions

Create `.github/dependabot.yml` covering at minimum:

```text
npm             /
github-actions  /
```

and the isolated development-tooling npm graph where that graph can be maintained through ordinary npm metadata.

Use a regular scheduled update cadence and grouping that keeps related development updates together. Enable Dependabot security updates so patched versions produce PRs independently of the normal version-update schedule. GitHub documents version updates as keeping dependencies current and security updates as opening PRs for vulnerable dependencies with available fixes. citeturn7search3turn7search7

For SHA-pinned Actions, keep the release tag/version comment on the same line; Dependabot understands that format when updating Actions references. citeturn7search17

Dependabot PRs must pass the same normal acceptance gate before merging. When a bot PR is created already in the ready state, convert it to draft and back to Ready when the candidate is consciously ready for its merge-gating run.

### Add dependency review to PR acceptance

Add `actions/dependency-review-action` as a mandatory `ci.yml` job.

Configure it to fail when a PR introduces a dependency with an unacceptable known vulnerability severity. GitHub's dependency-review action specifically compares PR dependency changes and can fail the check when new vulnerable dependencies are introduced. citeturn7search2turn7search10

The final `CI / acceptance` job must depend on this result.

### Add CodeQL to the deliberate acceptance checkpoint

Configure CodeQL for JavaScript/TypeScript and run it:

```text
on PR ready-for-review qualification
on a weekly scheduled default-branch security scan
on explicit security workflow dispatch
```

Do not run it on every feature-branch push.

Use the explicit language rather than asking CodeQL to discover every language; GitHub recommends explicit language configuration where multiple possibilities could otherwise be analysed sequentially. citeturn6view5

Make the PR CodeQL result a predecessor of `CI / acceptance`.

### Add dependency vulnerability gates

Add a security script that checks both the runtime graph and complete development graph after the dependency refresh.

For release acceptance:

- no known high/critical runtime vulnerability may be unresolved;
- any lower-severity exception must have a repository-tracked disposition;
- development-tool vulnerabilities that execute during qualification or release receive the same treatment as build-system vulnerabilities, rather than being dismissed because they are not shipped.

Record the dependency graph/SBOM and audit evidence against the exact release candidate.

### Harden GitHub Actions settings

Configure repository Actions settings to:

- default `GITHUB_TOKEN` to read-only;
- prevent fork PRs from receiving secrets;
- prevent fork PRs from receiving write tokens;
- require explicit approval before untrusted external PR workflows are allowed to execute where appropriate;
- constrain the set of usable third-party Actions;
- require immutable action identities where the organisation policy supports it.

GitHub emphasises fresh build environments, known build dependencies, least privilege and immutable build dependencies as core build-system security measures. citeturn8view1

Add `CODEOWNERS` entries for sensitive surfaces such as:

```text
/.github/
/package.json
/package-lock.json
/scripts/release-*
/schemas/
/SECURITY.md
```

Use those entries for review routing and visibility; do not make an additional human approval mandatory for the sole-maintainer normal merge path.

### Enable repository-level secret protection

Enable GitHub secret scanning and push protection for the public repository, and make accidental credential material a hard repository-policy failure rather than relying on release review to notice it.

## Release and supply-chain publication

### Implement the release workflows that the repository documentation describes

Wire the existing release-contract scripts into actual GitHub workflows rather than creating a second independent release implementation.

The intended chain should be:

```text
merged, protected main
        │
        ▼
release-qualification.yml
        │
        │ exact tarball + manifest + evidence
        ▼
owner review
        │
        ▼
stage-release.yml
        │
        │ OIDC, stage only
        ▼
npm staged candidate
        │
        ▼
interactive owner inspection + 2FA approval
        │
        ▼
release-registry.yml
        │
        │ qualify exact public registry bytes
        ▼
github-release.yml
        │
        ▼
immutable GitHub release
        │
        ▼
promote-release.yml
        │
        ▼
intended npm dist-tag
```

Every downstream workflow must identify and cryptographically bind its exact predecessor rather than simply accepting “the latest successful run”.

### Replace npm publication secrets with trusted publishing

Configure npm Trusted Publishing for the exact GitHub repository and exact staging workflow.

npm Trusted Publishing uses OIDC and eliminates long-lived npm publication tokens. npm currently requires npm CLI 11.5.1 or later and Node 22.14.0 or later for trusted publishing, and supports GitHub-hosted Actions runners. citeturn6view3

Therefore the publishing workflow should run on the canonical current LTS Node release, not the package's 22.13.0 compatibility-floor lane.

Grant:

```yaml
permissions:
  contents: read
  id-token: write
```

only to the actual npm staging job.

Do not put an `NPM_TOKEN` or other long-lived registry write credential in Actions secrets.

Trusted publishing automatically generates npm provenance for public packages, rather than requiring a separately managed provenance credential. citeturn5search6

### Make staged publishing the only normal package-publication route

Configure the trusted publisher so it may **stage** but may not directly publish.

npm staged publishing is specifically designed to let automation prepare a package while deferring the publication decision to an interactive human proof-of-presence/2FA action. citeturn6view4

The staging workflow should:

1. admit the exact previously qualified source SHA and tarball;
2. independently recalculate its hashes;
3. invoke `npm stage publish` on that exact archive;
4. record stage identity and returned registry evidence;
5. stop.

The owner then inspects and approves the staged candidate interactively with 2FA.

At npm package-account level, select the recommended policy that requires 2FA and disallows ordinary publication tokens. npm explicitly recommends this in conjunction with staged publishing. citeturn6view4

### Separate publication and dist-tag authority

Configure a distinct trusted-publisher identity/workflow for `promote-release.yml` that may manage dist-tags but cannot directly publish a new package version.

npm's trusted-publisher permissions treat staging, direct publishing and dist-tag management independently, allowing exactly this privilege separation. citeturn6view3

Stable and prerelease promotion must therefore become explicit, auditable state changes rather than side-effects of uploading the package.

### Requalify the registry artefact

After stage approval makes the candidate available, download it anonymously from the public npm registry by exact version and verify:

- package identity;
- integrity;
- provenance;
- expected workflow/repository/source identity;
- installed file set;
- public entry points;
- CLI behaviour;
- ESLint-plugin behaviour;
- schema behaviour;
- LTS/runtime compatibility.

The release workflow must prove that the registry artefact is the candidate that passed qualification, rather than treating successful upload as sufficient evidence.

### Add GitHub build attestations for release artefacts

For release artefacts attached to GitHub, generate GitHub artifact provenance attestations against the exact tarball and associated SBOM/evidence. GitHub describes artifact attestations as cryptographically signed claims binding a build artefact to its repository, workflow, commit and build environment. citeturn8view1

Verify the attestation before publishing the GitHub release.

### Enable and enforce immutable GitHub releases

Create the GitHub release as a **draft**, attach all intended artefacts, verify them, and only then publish it.

Enable immutable releases at repository level. Once published immutably, GitHub prevents the release assets from being changed or deleted and locks the associated tag against movement. citeturn15search0

GitHub itself recommends drafting first so all assets can be attached before the release becomes immutable. citeturn15search1

The release workflow should attach at least:

```text
qualified package archive
release manifest
checksums
SBOM
qualification/acceptance evidence
provenance/attestation material needed by consumers
```

and perform a post-publication verification of the immutable release and uploaded assets.

### Add a public changelog

Add `CHANGELOG.md` as a release-facing record of user-visible changes.

Every release PR must update it under one of:

```text
Added
Changed
Deprecated
Removed
Fixed
Security
```

Breaking API/schema/configuration/CLI changes must be called out explicitly and drive the appropriate SemVer change. npm uses SemVer ranges as the package-version compatibility model, so package versioning and public contract changes need to remain aligned. citeturn7search12

Release notes should be derived from the reviewed changelog and release manifest, not invented independently after the package has been published.

## Documentation and contributor experience

### Rebuild the top of the README around a new user's first five minutes

Move maintainer/release internals out of the opening path and make the public README lead with:

```text
What JSON Quality does
        ↓
Why a developer would use it
        ↓
Install with npm
        ↓
minimal configuration
        ↓
check a repository
        ↓
format a repository
        ↓
use the library
        ↓
use the ESLint plugin
        ↓
Node support policy
        ↓
links to full references
```

Use the npm-only installation:

```sh
npm install --save-dev --save-exact @hadden-industries/json-quality
```

and prefer repo-local execution examples such as:

```sh
npm exec -- json-quality check --root .
npm exec -- json-quality format --check --root .
```

Add concise badges for:

- npm package/version;
- required CI;
- Node floor;
- licence;
- release provenance/security status where a stable badge exists.

Remove development-candidate and unpublished-package wording once the first public release is actually available.

### Add explicit API and CLI references

Create or expand:

```text
docs/
  api.md
  cli.md
  configuration.md
```

`api.md` should document every root export with:

- signature;
- input shape;
- output shape;
- synchronous/asynchronous behaviour;
- filesystem/network side effects;
- errors;
- resource-limit behaviour;
- minimal example.

`cli.md` should document every verb and option, including:

- exact correspondence to library operations;
- exit status meanings;
- stdout/stderr contracts;
- JSON output mode;
- file-selection semantics;
- check-versus-write behaviour;
- examples of operational failure versus quality failure.

`configuration.md` should be the human companion to the machine-readable schema, with examples that are executed by tests.

Create tested examples under a repository `examples/` area and use those exact files in documentation snippets wherever practical, so documentation cannot silently diverge from supported behaviour.

### Rewrite contributor workflow around draft PR qualification

Replace all contributor-facing statements that permit a direct-default-branch development model or present Actions' **Run workflow** button as product acceptance.

`CONTRIBUTING.md` should prescribe:

```text
create feature branch
        ↓
open draft PR
        ↓
commit/push freely
        ↓
run local focused checks as useful
        ↓
finish candidate
        ↓
mark Ready for review
        ↓
full hosted acceptance
        ↓
fix in draft if necessary
        ↓
Ready again
        ↓
merge when CI / acceptance passes
```

Explicitly explain that:

- CI deliberately does not run on every pushed commit;
- Ready-for-review means “qualify this exact candidate”;
- a later commit makes the previous result obsolete without automatically spending another run;
- the author returns to draft, batches further changes, and requests qualification again;
- updating against a changed `main` also requires requalification.

Update the same policy consistently in:

```text
README.md
CONTRIBUTING.md
docs/ci-trust.md
docs/node-runtime-compatibility.md
docs/release-operations.md
```

In particular, remove language preserving a direct-to-default-branch model and remove merge-gating instructions based on `gh workflow run`.

### Rewrite Node support wording to match the intended `owlapi` model

Use one short policy everywhere:

> JSON Quality requires Node.js `>=22.13.0`. Official qualification covers maintained LTS Node major versions. Other engine-compatible Node releases receive best-effort support. Use a current security-patched LTS release for production use.

The LTS list itself should be generated/projected from `assets/node-support.json`, not copied manually into multiple documents.

### Add issue forms and a PR template

Add:

```text
.github/
  ISSUE_TEMPLATE/
    bug.yml
    feature.yml
    config.yml
  pull_request_template.md
  CODEOWNERS
```

The bug form should require the information actually needed to reproduce this package's failures:

```text
package/source version
Node version
npm version
OS
command/API operation
minimal configuration
minimal non-sensitive input
expected result
actual result
exit code/diagnostics
```

The PR template should require:

```text
problem being solved
public contract affected
schema/config/API/CLI compatibility effect
tests added/changed
documentation changed
dependency changes
security implications
release-note/changelog entry
```

Do not turn the template into a second test checklist; CI remains authoritative.

### Add a documentation index and separate normative material from history

Add `docs/README.md` dividing documentation into:

```text
Using the package
Public contracts
Architecture
Contributor/development guidance
Release/security operations
Historical implementation/proof records
```

Move old implementation/proof material out of the normal consumer navigation path.

Remove obsolete auxiliary-runtime references from active package configuration and normative documentation so the documented implementation surface corresponds to the actual package.

## Implementation sequence and completion gates

The changes should be applied in dependency order rather than as independent edits.

| Order | Change set | Completion gate |
|---|---|---|
| Foundation | Update npm/toolchain/dependencies; change Node engine to `>=22.13.0`; redesign Node support policy; clean root configuration | `npm ci`, Node-policy tests and lockfile-drift checks pass on the canonical producer |
| Package contracts | Add strict JS checking, JSDoc typing, declarations, public API contract tests and strict package linting | `check:types`, ESLint and package-lint checks pass; packed ESM/type consumers succeed |
| Schema contract | Migrate public schemas to 2020-12, add stable IDs, update Ajv use and schema fixtures | Every public schema compiles strictly; positive/negative and cross-schema fixtures pass |
| Public plugin | Add metadata, recommended flat config, rule docs/types and installed-consumer tests | Packed plugin works using the exact documented configuration |
| Qualification CI | Add reusable qualification, ready-for-review PR workflow, exact candidate artefact transport, three-platform LTS matrix and stable acceptance job | Draft → Ready causes one complete run; pushing after PASS blocks merge without automatically rerunning |
| GitHub governance | Activate the default-branch ruleset and Actions restrictions | Direct default-branch push is rejected; failing/missing/stale acceptance cannot merge; passing current acceptance can |
| Security automation | Add dependency review, CodeQL, Dependabot, audit gates, secret protection and sensitive-path ownership | Dependency/security PRs use the same acceptance path and vulnerable additions are blocked |
| Release system | Add qualification/staging/registry/GitHub-release/promotion workflows; configure npm OIDC, staged publishing, attestations and immutable releases | A release candidate can traverse exact-source qualification → stage → 2FA approval → public-registry requalification → immutable GitHub release without a long-lived npm publication token |
| Public documentation | Rewrite README/contributor/runtime/release guidance; add API/CLI/config docs, changelog, issue forms and PR template | Every documented command/example is exercised by automated tests and no contributor documentation describes the obsolete merge/CI path |

The repository-level final acceptance should be one clean run of:

```sh
npm ci --ignore-scripts
npm run install:markdown
npm run check:full
```

with `check:full` expanded to include the new type, schema and package-metadata checks.

Then perform an actual GitHub process proof with a deliberately created draft PR:

```text
multiple pushes while draft
        ↓
zero full acceptance runs
        ↓
Ready for review
        ↓
one full qualification
        ↓
PASS
        ↓
push one harmless additional commit
        ↓
merge becomes blocked, with no automatic full CI
        ↓
convert to draft
        ↓
Ready for review
        ↓
new qualification
        ↓
PASS
        ↓
normal merge succeeds
```

That process proof is the decisive acceptance criterion for the new CI design: **iteration frequency no longer controls CI expenditure, but every exact revision that reaches the protected default branch has necessarily passed the complete qualification gate.** GitHub's required-check semantics—latest SHA required, PR-triggered checks eligible for branch protection, skipped jobs counting as success unless explicitly guarded, and strict up-to-date branch protection—provide the enforcement primitives needed for that model. citeturn6view1turn7search27turn7search5