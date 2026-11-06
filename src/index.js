// SPDX-License-Identifier: AGPL-3.0-only
/**
 * @typedef {import("./api-types.js").JsonQualityPolicy} JsonQualityPolicy
 * @typedef {import("./api-types.js").ReadonlyJsonQualityPolicy} ReadonlyJsonQualityPolicy
 * @typedef {import("./api-types.js").JsonSourceContract} JsonSourceContract
 * @typedef {import("./api-types.js").JsonQualityEvent} JsonQualityEvent
 * @typedef {import("./api-types.js").SessionOptions} SessionOptions
 * @typedef {import("./api-types.js").RepositoryOptions} RepositoryOptions
 * @typedef {import("./api-types.js").FileCheckOptions} FileCheckOptions
 * @typedef {import("./api-types.js").WriterOptions} WriterOptions
 * @typedef {import("./api-types.js").CapacityLimits} CapacityLimits
 * @typedef {import("./api-types.js").RuntimeControls} RuntimeControls
 * @typedef {import("./api-types.js").TransformControls} TransformControls
 * @typedef {import("./api-types.js").ProducerControls} ProducerControls
 * @typedef {import("./api-types.js").VerificationControls} VerificationControls
 * @typedef {import("./api-types.js").InstallationVerificationOptions} InstallationVerificationOptions
 * @typedef {import("./api-types.js").InstallationVerification} InstallationVerification
 * @typedef {import("./api-types.js").InstallationControls} InstallationControls
 * @typedef {import("./api-types.js").AcquisitionControls} AcquisitionControls
 * @typedef {import("./api-types.js").JsonQualityConfiguration} JsonQualityConfiguration
 * @typedef {import("./api-types.js").QualificationOptions} QualificationOptions
 * @typedef {import("./api-types.js").NativeProvider} NativeProvider
 * @typedef {import("./api-types.js").NativeProviderStreams} NativeProviderStreams
 * @typedef {import("./api-types.js").NativeAuthority} NativeAuthority
 * @typedef {import("./api-types.js").NativeInventoryEntry} NativeInventoryEntry
 * @typedef {import("./api-types.js").NativeDocument} NativeDocument
 * @typedef {import("./api-types.js").NativeSourceOrigin} NativeSourceOrigin
 * @typedef {import("./api-types.js").LogicalProvider} LogicalProvider
 * @typedef {import("./api-types.js").LogicalProviderDefinition} LogicalProviderDefinition
 * @typedef {import("./api-types.js").LogicalInventoryEntry} LogicalInventoryEntry
 * @typedef {import("./api-types.js").LogicalSourceAccess} LogicalSourceAccess
 * @typedef {import("./api-types.js").ByteRange} ByteRange
 * @typedef {import("./api-types.js").ByteLease} ByteLease
 * @typedef {import("./api-types.js").ControlLease} ControlLease
 * @typedef {import("./api-types.js").ImplementationIdentity} ImplementationIdentity
 * @typedef {import("./api-types.js").ResolvedResources} ResolvedResources
 * @typedef {import("./api-types.js").ValueDescriptor} ValueDescriptor
 * @typedef {import("./api-types.js").RepositoryRewriteOptions} RepositoryRewriteOptions
 * @typedef {import("./api-types.js").JsonValue} JsonValue
 * @typedef {import("./api-types.js").SourceCheckOptions} SourceCheckOptions
 * @typedef {import("./api-types.js").JsonSourceSession} JsonSourceSession
 * @typedef {import("./api-types.js").JsonRepositorySession} JsonRepositorySession
 * @typedef {import("./api-types.js").SourceReference} SourceReference
 * @typedef {import("./api-types.js").ValueReference} ValueReference
 */
export {
  openJsonSourceSession,
  openJsonRepositorySession,
} from "./sessions.js";
export {
  formatJsonSource,
  formatJsonValue,
  normalizeJsonSource,
} from "./writers.js";
export { validateJsonQualityEvent } from "./events.js";
export { checkJsonFiles } from "./selected-check.js";
export {
  resolveJsonSourceContract,
  resolveJsonQualityPolicy,
  defaultJsonQualityPolicy,
} from "./configuration.js";
export { jsonFormatOptions } from "./format-options.js";
export { DEFAULT_JSON_TRANSFORM_LIMITS } from "./transform-capabilities.js";
export { DEFAULT_JSON_PRODUCER_LIMITS } from "./producer-json.js";
export { DEFAULT_PACKAGE_VERIFICATION_LIMITS } from "./package-payload.js";
export { runJsonQualityCli } from "./cli.js";
export {
  assertJsonQualityInstallationRoot,
  parseJsonQualityRegistrySpecifier,
  verifyJsonQualityInstallation,
} from "./installation.js";
export { qualifyGitJsonSources } from "./qualification.js";
