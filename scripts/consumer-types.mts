// SPDX-License-Identifier: AGPL-3.0-only
// Copied into an external packed consumer and compiled with normal NodeNext resolution.
import {
  resolveJsonQualityPolicy,
  defaultJsonQualityPolicy,
  resolveJsonSourceContract,
  jsonFormatOptions,
  openJsonSourceSession,
  openJsonRepositorySession,
  formatJsonSource,
  formatJsonValue,
  normalizeJsonSource,
  validateJsonQualityEvent,
  runJsonQualityCli,
  qualifyGitJsonSources,
  assertJsonQualityInstallationRoot,
  readJsonQualityAcquisitionBootstrapSource,
  parseJsonQualityRegistrySpecifier,
  verifyJsonQualityInstallation,
  DEFAULT_JSON_TRANSFORM_LIMITS,
  DEFAULT_JSON_PRODUCER_LIMITS,
  DEFAULT_PACKAGE_VERIFICATION_LIMITS,
} from "@hadden-industries/json-quality";
import plugin from "@hadden-industries/json-quality/eslint";
import type {
  ResolvedResources,
  ReadonlyJsonQualityPolicy,
} from "@hadden-industries/json-quality";
import type { Linter } from "eslint";
const policy = resolveJsonQualityPolicy({ schemaVersion: 4 });
const immutableDefaults: ReadonlyJsonQualityPolicy = defaultJsonQualityPolicy;
const defaultNormalization: "NFC" | "preserve" =
  immutableDefaults.defaults.normalization;
// @ts-expect-error The immutable defaults export has a concrete closed type.
defaultJsonQualityPolicy.nonexistentPolicyField;
// @ts-expect-error Nested defaults cannot be mutated.
defaultJsonQualityPolicy.defaults.normalization = "preserve";
// @ts-expect-error The frozen exception list cannot be mutated.
defaultJsonQualityPolicy.exceptions.push({
  paths: ["**"],
  owner: "x",
  reason: "x",
});
void defaultNormalization;
resolveJsonSourceContract("a.json", policy, { tracked: true });
resolveJsonSourceContract("a.json", defaultJsonQualityPolicy);
// @ts-expect-error The resolved policy has the same deep immutability contract.
policy.defaults.normalization = "preserve";
const text: string = await formatJsonValue({ a: [null, true, 1, "value"] });
await formatJsonSource(text, {
  contract: { allowSourceRewrites: false },
  transformControls: false,
});
await formatJsonValue(
  { nested: [] },
  {
    producerControls: { maximumDepth: null },
    transformControls: { maximumOutputBytes: null },
  },
);
await normalizeJsonSource(text);
const options = await jsonFormatOptions();
const tabWidth: number | undefined = options.tabWidth;
const config: Linter.Config = plugin.configs.recommended;
const session = await openJsonSourceSession({
  capacityLimits: false,
  runtimeControls: { maxCheckTimeMs: null, maxNestingDepth: null },
});
const resolvedResources: ResolvedResources = session.resources;
void resolvedResources;
for await (const event of session.check({
  async *open() {
    yield Buffer.from("{}\n");
  },
})) {
  if (validateJsonQualityEvent(event) && event.source) {
    const value = await session.select(event.source);
    if (value) {
      const lease = await session.materializeControl(value, "1024", () => true);
      const result: unknown = lease.value;
      const moved: { value: unknown; managedReservationBytes: string } =
        await lease.transfer();
      const descriptor = await session.describe(value);
      for await (const child of session.children(value)) {
        if (child.name) {
          const key = await session.describe(child.name);
          if (key.valueKind === "key") {
            const keyKind: "key" = key.valueKind;
            void keyKind;
          }
        }
      }
      const rawByteLength: string = descriptor.rawByteLength;
      const range = await session.read(value, "source-json", "0", "128");
      const byteOffset: string = range.byteOffset;
      const referenceId: string = value.referenceId;
      await session.selectByPointerStream(
        event.source,
        (async function* () {
          yield Buffer.from("");
        })(),
        {
          signal: session.signal,
          identity: {
            sha256:
              "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            byteLength: "0",
          },
        },
      );
      void [moved, rawByteLength, byteOffset, referenceId];
      void result;
      await lease.release();
    }
  }
}
await session.close();
// @ts-expect-error Streamed pointer selection requires its exact byte identity.
session.selectByPointerStream(
  { kind: "source", referenceId: "scoped" },
  (async function* () {})(),
);
const repository = await openJsonRepositorySession({ root: process.cwd() });
for await (const event of repository.check()) void event;
for await (const event of repository.rewrite("normalize", {
  files: ["a.json"],
  dryRun: true,
}))
  void event;
const components: {
  readonly icu: string;
  readonly unicode: string;
  readonly sqlite: string;
} = repository.implementationIdentity.components;
repository.cancel(new Error("caller cancellation"));
void components;
await repository.close();
const code: number = await runJsonQualityCli(["--help"]);
qualifyGitJsonSources({
  trustedRoot: process.cwd(),
  candidateRoot: process.cwd(),
  trustedCommitId: "0".repeat(40),
  candidateCommitId: "1".repeat(40),
});
assertJsonQualityInstallationRoot(new URL(".", import.meta.url));
const bootstrap: string = readJsonQualityAcquisitionBootstrapSource();
parseJsonQualityRegistrySpecifier("1.0.0");
verifyJsonQualityInstallation({
  toolingRoot: process.cwd(),
  verificationControls: false,
  installationControls: { maximumPackageFamilyBytes: null },
  npmCliPath: process.env.npm_execpath,
});
void [
  tabWidth,
  config,
  code,
  bootstrap,
  DEFAULT_JSON_TRANSFORM_LIMITS,
  DEFAULT_JSON_PRODUCER_LIMITS,
  DEFAULT_PACKAGE_VERIFICATION_LIMITS,
];
// @ts-expect-error Functions are not producer JSON values.
formatJsonValue(() => 1);
// @ts-expect-error Unsupported resource controls must not enter the API.
openJsonSourceSession({ runtimeControls: { madeUpLimit: 1 } });
// @ts-expect-error The retired concurrency field is not a configurable quota.
openJsonSourceSession({ runtimeControls: { maxConcurrency: 1 } });
// @ts-expect-error Private source paths are not package exports.
await import("@hadden-industries/json-quality/src/value-session.js");
verifyJsonQualityInstallation({
  toolingRoot: process.cwd(),
  // @ts-expect-error Installation verification cannot select source quotas.
  capacityLimits: false,
});
// @ts-expect-error Native providers are a named map, not an array.
openJsonRepositorySession({ root: process.cwd(), nativeProviders: [] });
openJsonRepositorySession({
  root: process.cwd(),
  nativeProviders: {
    owner: async ({ signal, parameters }) => {
      signal.throwIfAborted();
      void parameters;
      return {
        authorities: (async function* () {
          yield {
            path: "native.blob",
            sha256: "0".repeat(64),
            byteLength: "0",
          };
        })(),
        inventory: (async function* () {
          yield {
            path: "native.blob",
            sha256: "0".repeat(64),
            byteLength: "0",
            source: {
              kind: "content-addressed" as const,
              path: "native.blob",
              sha256: "0".repeat(64),
              byteLength: "0",
            },
          };
        })(),
        documents: (async function* () {
          yield {
            path: "native.blob",
            chunks: (async function* () {
              yield Buffer.alloc(0);
            })(),
          };
        })(),
        close: async () => {},
      };
    },
  },
});
type NativeProvider = NonNullable<
  NonNullable<
    Parameters<typeof openJsonRepositorySession>[0]
  >["nativeProviders"]
>[string];
// @ts-expect-error A native provider's authority stream is not a promised stream.
const promisedAuthorityProvider: NativeProvider = async () => ({
  authorities: Promise.resolve((async function* () {})()),
  inventory: (async function* () {})(),
  documents: (async function* () {})(),
});
void promisedAuthorityProvider;
openJsonRepositorySession({
  root: process.cwd(),
  logicalProviders: [
    {
      definition: {
        id: "embedded",
        containerPaths: ["container.json"],
        minimumDocuments: 0,
        formatContract: "prettier-json",
      },
      inventory: async (access) => {
        const source = await access.capturedSource("container.json");
        const value = await access.select(source, "");
        const descriptor = await access.describe(value);
        const bytes = await access.readSource(source, "0", "128");
        void [
          descriptor.rawByteLength,
          bytes.byteOffset,
          access.resources.admission.maxTotalSourceBytes,
        ];
        return (async function* () {
          yield {
            path: "derived.json",
            containerPath: "container.json",
            pointer: "",
            record: "0",
            encoding: "utf8" as const,
            sha256: "0".repeat(64),
            byteLength: "0",
          };
        })();
      },
    },
  ],
});
