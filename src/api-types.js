// SPDX-License-Identifier: AGPL-3.0-only
/** Public structural contracts. Runtime admission and opaque-reference ownership
 * remain mandatory; TypeScript types do not mint a native capability.
 * @typedef {import("../types/schemas/configuration.js").JsonQualityConfiguration} JsonQualityConfiguration
 * @typedef {import("../types/schemas/effective-policy.js").JsonQualityPolicy} JsonQualityPolicy
 * @typedef {DeepReadonly<JsonQualityPolicy>} ReadonlyJsonQualityPolicy
 * @typedef {import("../types/schemas/source-contract.js").JsonSourceContract} JsonSourceContract
 * @typedef {import("../types/schemas/event.js").JsonQualityEvent} JsonQualityEvent
 * @typedef {boolean | import("../types/schemas/configuration.js").RuntimeControls} RuntimeControls
 * @typedef {boolean | import("../types/schemas/configuration.js").CapacityLimits} CapacityLimits
 * @typedef {boolean | import("../types/schemas/configuration.js").TransformControls} TransformControls
 * @typedef {boolean | import("../types/schemas/configuration.js").ProducerControls} ProducerControls
 * @typedef {boolean | import("../types/schemas/configuration.js").VerificationControls} VerificationControls
 * @typedef {boolean | import("../types/schemas/configuration.js").InstallationControls} InstallationControls
 * @typedef {boolean | import("../types/schemas/configuration.js").AcquisitionControls} AcquisitionControls
 * @typedef {JsonSourceContract & {path: string, excludeUntrackedSources: boolean, exceptions: {owner: string, reason: string}[]}} JsonContract
 * @typedef {{toolingRoot: string, npmCliPath?: string, cachePath?: string, installationControls?: InstallationControls, verificationControls?: VerificationControls, signal?: AbortSignal}} InstallationVerificationOptions
 * @typedef {{specifier: string, coordinate: {kind: "registry", version: string}, integrity: string, fileCount: number, native: {name: string, version: string, integrity: string, fileCount: number}}} InstallationVerification
 * @typedef {{capacityLimits?: CapacityLimits, runtimeControls?: RuntimeControls, temporaryDirectory?: string, signal?: AbortSignal}} SessionOptions
 * @typedef {{readonly kind: "source", readonly referenceId: string, readonly byteLength?: string, readonly sha256?: string}} SourceReference
 * @typedef {{readonly kind: "value", readonly referenceId: string, readonly valueKind?: ValueKind}} ValueReference
 * @typedef {"key" | "string" | "number" | "true" | "false" | "null" | "object" | "array"} ValueKind
 * @typedef {ValueReference & {readonly valueKind: ValueKind, readonly ordinal: string, readonly byteLength: string, readonly rawByteLength: string, readonly sourceByteOffset: string, readonly nfcAvailable: boolean, readonly nfcByteLength?: string, readonly sha256: string | null, readonly closed: boolean, readonly record?: string}} ValueDescriptor
 * @typedef {{sha256: string, byteLength: string}} SourceIdentity
 * @typedef {{open: (options: {signal: AbortSignal}) => AsyncIterable<Uint8Array> | Promise<AsyncIterable<Uint8Array>>, identity?: SourceIdentity}} JsonSource
 * @typedef {"source-json" | "decoded-utf8" | "number-lexeme" | "nfc-utf8" | "json-pointer"} Representation
 * @typedef {{bytes: Buffer, byteOffset: string, totalByteLength: string}} ByteRange
 * @typedef {{readonly bytes: Buffer, readonly managedReservationBytes: string, release: () => Promise<void>}} ByteLease
 * @typedef {{readonly value: unknown, readonly managedReservationBytes: string, release: () => Promise<void>, transfer: () => Promise<{value: unknown, managedReservationBytes: string}>}} ControlLease
 * @typedef {{readonly coreSourceInputsSha256: string, readonly nodeApiVersion: number, readonly components: {readonly icu: string, readonly unicode: string, readonly sqlite: string}}} ImplementationIdentity
 * @typedef {Readonly<{[K in keyof Required<import("../types/schemas/configuration.js").CapacityLimits>]: string | null}>} ResolvedAdmissionResources
 * @typedef {Readonly<{[K in keyof Required<import("../types/schemas/configuration.js").RuntimeControls>]: string | null}>} ResolvedRuntimeResources
 * @typedef {{readonly admission: ResolvedAdmissionResources, readonly runtime: ResolvedRuntimeResources}} ResolvedResources
 * @typedef {{read: (value: ValueReference, representation: Representation, byteOffset?: string, maximumBytes?: string) => Promise<ByteRange>, readSource: (source: SourceReference, byteOffset?: string, maximumBytes?: string) => Promise<ByteRange>, fragments: (value: ValueReference, representation: Representation) => AsyncIterable<Buffer>, sourceFragments: (source: SourceReference) => AsyncIterable<Buffer>, select: (source: SourceReference, pointer?: string, record?: string) => Promise<ValueDescriptor>, children: (value: ValueReference) => AsyncIterable<{value: ValueDescriptor, name: ValueReference | null, ordinal: string}>, describe: (value: ValueReference) => Promise<ValueDescriptor>, materialize: (value: ValueReference, representation: Representation, maximumBytes: string) => Promise<ByteLease>, materializeControl: (value: ValueReference, maximumBytes: string, validate: (value: unknown) => unknown | Promise<unknown>) => Promise<ControlLease>}} JsonValueAccess
 * @typedef {JsonValueAccess & {selectByPointerStream: (source: SourceReference, pointerByteChunks: AsyncIterable<Uint8Array>, options: {identity: SourceIdentity, record?: string, signal?: AbortSignal}) => Promise<ValueDescriptor>, sameReference: (left: SourceReference | ValueReference, right: SourceReference | ValueReference) => boolean, cancel: (reason?: unknown) => void, close: () => Promise<void>, readonly signal: AbortSignal, readonly implementationIdentity: ImplementationIdentity, readonly resources: ResolvedResources}} JsonValueSession
 * @typedef {{signal?: AbortSignal, includeValueEvents?: boolean, retainValues?: boolean, requestId?: string}} SourceCheckOptions
 * @typedef {JsonValueSession & {check: (source: JsonSource, contract?: JsonSourceContract, options?: SourceCheckOptions) => AsyncIterable<JsonQualityEvent>}} JsonSourceSession
 * @typedef {SessionOptions & {root: string, nativeProviders?: Record<string, NativeProvider>, logicalProviders?: LogicalProvider[], requiredOutputs?: string[], gitExecutable?: string, retainValues?: boolean, requestId?: string}} RepositoryOptions
 * @typedef {SessionOptions & {root: string, files: string[], requestId?: string}} FileCheckOptions
 * @typedef {{files?: string[], transformControls?: TransformControls, dryRun?: boolean}} RepositoryRewriteOptions
 * @typedef {JsonValueSession & {check: () => AsyncIterable<JsonQualityEvent>, rewrite: (operation: "format" | "normalize", options?: RepositoryRewriteOptions) => AsyncIterable<JsonQualityEvent>}} JsonRepositorySession
 * @typedef {Partial<Pick<RepositoryOptions, "root" | "nativeProviders" | "logicalProviders" | "requiredOutputs">>} CliContext
 * @typedef {SessionOptions & {transformControls?: TransformControls, producerControls?: ProducerControls, contract?: Pick<JsonSourceContract, "normalization" | "allowEmptyKeys" | "nfcExemptStringValues" | "allowSourceRewrites" | "owner" | "reason">}} WriterOptions
 * @typedef {null | boolean | number | string | JsonValue[] | {[key: string]: JsonValue}} JsonValue
 * @typedef {{trustedRoot: string, candidateRoot: string, trustedCommitId: string, candidateCommitId: string, capacityLimits?: CapacityLimits, runtimeControls?: RuntimeControls, temporaryDirectory?: string, signal?: AbortSignal, requestId?: string}} QualificationOptions
 */

/**
 * @template T
 * @typedef {T extends object ? {readonly [K in keyof T]: DeepReadonly<T[K]>} : T} DeepReadonly
 */

/**
 * @template T
 * @typedef {T | Promise<T>} MaybePromise
 */

/** Native providers supply independent provenance, inventory and document
 * streams. NativeDocument chunks are byte views of at most 65,536 bytes.
 * @typedef {SourceIdentity & {path: string}} NativeAuthority
 * @typedef {(NativeAuthority & {kind: "content-addressed"}) | (NativeAuthority & {kind: "archive-member", memberPath: string})} NativeSourceOrigin
 * @typedef {{path: string, sha256: string, byteLength: string, source: NativeSourceOrigin}} NativeInventoryEntry
 * @typedef {{path: string, chunks: AsyncIterable<ArrayBufferView>}} NativeDocument
 * @typedef {{authorities: AsyncIterable<NativeAuthority>, inventory: AsyncIterable<NativeInventoryEntry>, documents: AsyncIterable<NativeDocument>, close?: () => MaybePromise<void>}} NativeProviderStreams
 * @typedef {(input: {root: string, parameters: Record<string, JsonValue>, signal: AbortSignal}) => MaybePromise<NativeProviderStreams>} NativeProvider
 * @typedef {NonNullable<JsonSourceContract["formatContract"]>} JsonFormatContract
 * @typedef {{id: string, containerPaths: string[], minimumDocuments?: number, formatContract?: JsonFormatContract}} LogicalProviderDefinition
 * @typedef {{path: string, containerPath: string, pointer: string, record?: string, encoding: "utf8" | "base64", sha256: string, byteLength: string}} LogicalInventoryEntry
 * @typedef {JsonValueAccess & {readonly resources: ResolvedResources, readonly signal: AbortSignal, capturedSource: (path: string) => Promise<SourceReference>}} LogicalSourceAccess
 * @typedef {{definition: LogicalProviderDefinition, inventory: (access: LogicalSourceAccess) => MaybePromise<AsyncIterable<LogicalInventoryEntry>>}} LogicalProvider
 */
export {};
