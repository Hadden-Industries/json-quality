// SPDX-License-Identifier: AGPL-3.0-only
// Copied into an external packed consumer and compiled with normal NodeNext resolution.
import {
  admitJsonPolicy,
  jsonContract,
  jsonFormatOptions,
  openJsonSourceSession,
  openJsonRepositorySession,
  formatJsonSource,
  formatJsonValue,
  normalizeJsonSource,
  validateJsonQualityEvent,
  runJsonQualityCli,
  qualifyJsonConsumer,
  assertIsolatedJsonQuality,
  jsonQualityAcquisitionBootstrap,
  jsonQualitySourceCoordinate,
  verifyJsonQualityInstallation,
  JSON_TRANSFORM_CAPABILITIES,
  JSON_PRODUCER_CAPABILITIES,
  PACKAGE_VERIFICATION_CAPABILITIES,
} from "@hadden-industries/json-quality";
import plugin from "@hadden-industries/json-quality/eslint";
import type { Linter } from "eslint";
const policy = admitJsonPolicy({ schemaVersion: 3 });
jsonContract("a.json", policy, { tracked: true });
const text: string = await formatJsonValue({ a: [null, true, 1, "value"] });
await formatJsonSource(text, {
  contract: { allowFormatWrites: false },
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
      void result;
      await lease.release();
    }
  }
}
await session.close();
const repository = await openJsonRepositorySession({ root: process.cwd() });
await repository.close();
const code: number = await runJsonQualityCli(["--help"]);
qualifyJsonConsumer({
  trustedRoot: process.cwd(),
  candidateRoot: process.cwd(),
  trustedSha: "0".repeat(40),
  candidateSha: "1".repeat(40),
});
assertIsolatedJsonQuality(new URL(".", import.meta.url));
const bootstrap: string = jsonQualityAcquisitionBootstrap();
jsonQualitySourceCoordinate("1.0.0");
verifyJsonQualityInstallation({
  toolingRoot: process.cwd(),
  verificationControls: false,
});
void [
  tabWidth,
  config,
  code,
  bootstrap,
  JSON_TRANSFORM_CAPABILITIES,
  JSON_PRODUCER_CAPABILITIES,
  PACKAGE_VERIFICATION_CAPABILITIES,
];
// @ts-expect-error Functions are not producer JSON values.
formatJsonValue(() => 1);
// @ts-expect-error Unsupported resource controls must not enter the API.
openJsonSourceSession({ runtimeControls: { madeUpLimit: 1 } });
// @ts-expect-error The retired concurrency field is not a configurable quota.
openJsonSourceSession({ runtimeControls: { maxConcurrency: 1 } });
// @ts-expect-error Private source paths are not package exports.
await import("@hadden-industries/json-quality/src/value-session.js");
