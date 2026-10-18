# Markdown quality

Markdown Quality owns Markdown formatting, linting, local-link checks and document selection in this repository.
The root [policy](https://github.com/Hadden-Industries/json-quality/blob/main/.markdown-quality.json) uses configuration schema 2 and `authored-gfm@1` and includes every authored `*.md` document without consumer exclusions.
The producer's built-in filesystem boundary already blocks dependency installations.
Layout uses the producer's opinionated LF and two-space defaults; the consumer does not repeat them.
Historical plans remain checked.
Git and Prettier ignore files do not control that policy.

## Commands

Install the root development dependencies and the isolated Markdown graph with lifecycle scripts disabled:

```sh
npm ci --ignore-scripts
npm run install:markdown
npm run inspect:markdown
npm run check:markdown
npm run format:markdown
npm run test:markdown
```

The commands invoke installed public package bins from the actual repository root.
They do not install missing tools or fall back to global binaries.
Checking is read-only; errors and canonical formatting drift fail the check.
Warnings remain visible and information is summarized; the default advisory severities remain those of the producer.
Pass `-- --strict` to make warnings blocking.
Formatting validates the complete selected batch before writing and preserves parsed structure and literals under the producer contract.

Explicit arguments retain literal scope, including when the root differs from this checkout:

```sh
npm run check:markdown -- --json -- README.md
npm run format:markdown -- -- README.md
```

Prettier owns JavaScript and workflow formatting; it skips Markdown.
`npm run format` invokes both tools for their respective scopes.
`npm run format:check` includes the read-only Markdown gate, so the existing manual CI reference-producer qualification retains it.
The producer setup action installs the isolated lock before checking.
The installed-contract tests also join focused and full source tests.

## Exact development source

The isolated [manifest](https://github.com/Hadden-Industries/json-quality/blob/main/tooling/markdown/package.json) binds its development dependency to an archive whose filename contains the full producer commit.
[Source provenance](https://github.com/Hadden-Industries/json-quality/blob/main/tooling/markdown/source.json) records source `2e1440c7b33771553a82ca42ba3f8205e5a9f6b3`, its clean Git tree and source-lock digest, plus each core/Windows/Linux archive's SHA-256 and SHA-512 integrity.
The isolated native npm lock freezes the complete installed graph.
Retain the source record, three archives and lock together.

This is the latest-source archive pattern used by OwlAPI and Google, rather than an acquisition from the unchanged published version label `1.0.3`.
A raw Git dependency omits generated native assets; the maintained producer packer supplies them and embeds the core's exact source identity.
Consumer tests verify the archive hashes, full-SHA filenames, resolved lock entries and product package membership.
The native package validates its executable digest before use.
The consumer override for KaTeX mirrors the producer's selected version because npm does not inherit dependency overrides.

The archives retain the producer and native third-party licenses and source-offer evidence.
This development graph remains outside JSON Quality's runtime dependencies and npm shipment.
Upgrading requires new archives from clean source, new provenance, a refreshed lock and current consumer checks; changing a version string alone is insufficient.

## Qualification and recovery

The [adoption plan](plans/2026-10-18-markdown-quality-adoption.md) records the prior plans, pushed fixes and scope decisions.
Current local checks exercise the installed checker, selection, explicit-file forwarding, excluded logical bytes, missing non-Markdown link targets, no-write behavior and source isolation.
They do not establish the producer's separate six-sample trusted Windows/Linux qualification or hosted acceptance.
The existing CI remains manually dispatched and this change does not run it remotely.

Ordinary checks retain finite producer defaults.
Measure this consumer before changing capacity limits; OwlAPI's larger staging and heap settings are evidence for its own corpus, not inherited targets here.
Final transported JSON package qualification still requires clean committed source.
Rollback must restore document preimages together with policy, manifests, locks, archives and command changes; replacing only the package cannot reverse formatting writes.
