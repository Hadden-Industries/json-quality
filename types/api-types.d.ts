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
 * @typedef {{files?: string[], transformControls?: TransformControls, dryRun?: boolean}} RepositoryRewriteOptions
 * @typedef {JsonValueSession & {check: () => AsyncIterable<JsonQualityEvent>, rewrite: (operation: "format" | "normalize", options?: RepositoryRewriteOptions) => AsyncIterable<JsonQualityEvent>}} JsonRepositorySession
 * @typedef {Partial<Pick<RepositoryOptions, "root" | "nativeProviders" | "logicalProviders" | "requiredOutputs">>} CliContext
 * @typedef {SessionOptions & {transformControls?: TransformControls, producerControls?: ProducerControls, contract?: Pick<JsonSourceContract, "normalization" | "allowEmptyKeys" | "nfcExemptStringValues" | "allowSourceRewrites" | "owner" | "reason">}} WriterOptions
 * @typedef {null | boolean | number | string | JsonValue[] | {[key: string]: JsonValue}} JsonValue
 * @typedef {{trustedRoot: string, candidateRoot: string, trustedCommitId: string, candidateCommitId: string, capacityLimits?: CapacityLimits, runtimeControls?: RuntimeControls, temporaryDirectory?: string, signal?: AbortSignal, requestId?: string}} QualificationOptions
 */
export type JsonQualityConfiguration =
  import("../types/schemas/configuration.js").JsonQualityConfiguration;
export type JsonQualityPolicy =
  import("../types/schemas/effective-policy.js").JsonQualityPolicy;
export type ReadonlyJsonQualityPolicy = DeepReadonly<JsonQualityPolicy>;
export type JsonSourceContract =
  import("../types/schemas/source-contract.js").JsonSourceContract;
export type JsonQualityEvent =
  import("../types/schemas/event.js").JsonQualityEvent;
export type RuntimeControls =
  boolean | import("../types/schemas/configuration.js").RuntimeControls;
export type CapacityLimits =
  boolean | import("../types/schemas/configuration.js").CapacityLimits;
export type TransformControls =
  boolean | import("../types/schemas/configuration.js").TransformControls;
export type ProducerControls =
  boolean | import("../types/schemas/configuration.js").ProducerControls;
export type VerificationControls =
  boolean | import("../types/schemas/configuration.js").VerificationControls;
export type InstallationControls =
  boolean | import("../types/schemas/configuration.js").InstallationControls;
export type AcquisitionControls =
  boolean | import("../types/schemas/configuration.js").AcquisitionControls;
export type JsonContract = JsonSourceContract & {
  path: string;
  excludeUntrackedSources: boolean;
  exceptions: {
    owner: string;
    reason: string;
  }[];
};
export type InstallationVerificationOptions = {
  toolingRoot: string;
  npmCliPath?: string;
  cachePath?: string;
  installationControls?: InstallationControls;
  verificationControls?: VerificationControls;
  signal?: AbortSignal;
};
export type InstallationVerification = {
  specifier: string;
  coordinate: {
    kind: "registry";
    version: string;
  };
  integrity: string;
  fileCount: number;
  native: {
    name: string;
    version: string;
    integrity: string;
    fileCount: number;
  };
};
export type SessionOptions = {
  capacityLimits?: CapacityLimits;
  runtimeControls?: RuntimeControls;
  temporaryDirectory?: string;
  signal?: AbortSignal;
};
export type SourceReference = {
  readonly kind: "source";
  readonly referenceId: string;
  readonly byteLength?: string;
  readonly sha256?: string;
};
export type ValueReference = {
  readonly kind: "value";
  readonly referenceId: string;
  readonly valueKind?: ValueKind;
};
export type ValueKind =
  "key" | "string" | "number" | "true" | "false" | "null" | "object" | "array";
export type ValueDescriptor = ValueReference & {
  readonly valueKind: ValueKind;
  readonly ordinal: string;
  readonly byteLength: string;
  readonly rawByteLength: string;
  readonly sourceByteOffset: string;
  readonly nfcAvailable: boolean;
  readonly nfcByteLength?: string;
  readonly sha256: string | null;
  readonly closed: boolean;
  readonly record?: string;
};
export type SourceIdentity = {
  sha256: string;
  byteLength: string;
};
export type JsonSource = {
  open: (options: {
    signal: AbortSignal;
  }) => AsyncIterable<Uint8Array> | Promise<AsyncIterable<Uint8Array>>;
  identity?: SourceIdentity;
};
export type Representation =
  | "source-json"
  | "decoded-utf8"
  | "number-lexeme"
  | "nfc-utf8"
  | "json-pointer";
export type ByteRange = {
  bytes: Buffer;
  byteOffset: string;
  totalByteLength: string;
};
export type ByteLease = {
  readonly bytes: Buffer;
  readonly managedReservationBytes: string;
  release: () => Promise<void>;
};
export type ControlLease = {
  readonly value: unknown;
  readonly managedReservationBytes: string;
  release: () => Promise<void>;
  transfer: () => Promise<{
    value: unknown;
    managedReservationBytes: string;
  }>;
};
export type ImplementationIdentity = {
  readonly coreSourceInputsSha256: string;
  readonly nodeApiVersion: number;
  readonly components: {
    readonly icu: string;
    readonly unicode: string;
    readonly sqlite: string;
  };
};
export type ResolvedAdmissionResources = Readonly<{
  [
    K in keyof Required<
      import("../types/schemas/configuration.js").CapacityLimits
    >
  ]: string | null;
}>;
export type ResolvedRuntimeResources = Readonly<{
  [
    K in keyof Required<
      import("../types/schemas/configuration.js").RuntimeControls
    >
  ]: string | null;
}>;
export type ResolvedResources = {
  readonly admission: ResolvedAdmissionResources;
  readonly runtime: ResolvedRuntimeResources;
};
export type JsonValueAccess = {
  read: (
    value: ValueReference,
    representation: Representation,
    byteOffset?: string,
    maximumBytes?: string,
  ) => Promise<ByteRange>;
  readSource: (
    source: SourceReference,
    byteOffset?: string,
    maximumBytes?: string,
  ) => Promise<ByteRange>;
  fragments: (
    value: ValueReference,
    representation: Representation,
  ) => AsyncIterable<Buffer>;
  sourceFragments: (source: SourceReference) => AsyncIterable<Buffer>;
  select: (
    source: SourceReference,
    pointer?: string,
    record?: string,
  ) => Promise<ValueDescriptor>;
  children: (value: ValueReference) => AsyncIterable<{
    value: ValueDescriptor;
    name: ValueReference | null;
    ordinal: string;
  }>;
  describe: (value: ValueReference) => Promise<ValueDescriptor>;
  materialize: (
    value: ValueReference,
    representation: Representation,
    maximumBytes: string,
  ) => Promise<ByteLease>;
  materializeControl: (
    value: ValueReference,
    maximumBytes: string,
    validate: (value: unknown) => unknown | Promise<unknown>,
  ) => Promise<ControlLease>;
};
export type JsonValueSession = JsonValueAccess & {
  selectByPointerStream: (
    source: SourceReference,
    pointerByteChunks: AsyncIterable<Uint8Array>,
    options: {
      identity: SourceIdentity;
      record?: string;
      signal?: AbortSignal;
    },
  ) => Promise<ValueDescriptor>;
  sameReference: (
    left: SourceReference | ValueReference,
    right: SourceReference | ValueReference,
  ) => boolean;
  cancel: (reason?: unknown) => void;
  close: () => Promise<void>;
  readonly signal: AbortSignal;
  readonly implementationIdentity: ImplementationIdentity;
  readonly resources: ResolvedResources;
};
export type SourceCheckOptions = {
  signal?: AbortSignal;
  includeValueEvents?: boolean;
  retainValues?: boolean;
  requestId?: string;
};
export type JsonSourceSession = JsonValueSession & {
  check: (
    source: JsonSource,
    contract?: JsonSourceContract,
    options?: SourceCheckOptions,
  ) => AsyncIterable<JsonQualityEvent>;
};
export type RepositoryOptions = SessionOptions & {
  root: string;
  nativeProviders?: Record<string, NativeProvider>;
  logicalProviders?: LogicalProvider[];
  requiredOutputs?: string[];
  gitExecutable?: string;
  retainValues?: boolean;
  requestId?: string;
};
export type RepositoryRewriteOptions = {
  files?: string[];
  transformControls?: TransformControls;
  dryRun?: boolean;
};
export type JsonRepositorySession = JsonValueSession & {
  check: () => AsyncIterable<JsonQualityEvent>;
  rewrite: (
    operation: "format" | "normalize",
    options?: RepositoryRewriteOptions,
  ) => AsyncIterable<JsonQualityEvent>;
};
export type CliContext = Partial<
  Pick<
    RepositoryOptions,
    "root" | "nativeProviders" | "logicalProviders" | "requiredOutputs"
  >
>;
export type WriterOptions = SessionOptions & {
  transformControls?: TransformControls;
  producerControls?: ProducerControls;
  contract?: Pick<
    JsonSourceContract,
    | "normalization"
    | "allowEmptyKeys"
    | "nfcExemptStringValues"
    | "allowSourceRewrites"
    | "owner"
    | "reason"
  >;
};
export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | {
      [key: string]: JsonValue;
    };
export type QualificationOptions = {
  trustedRoot: string;
  candidateRoot: string;
  trustedCommitId: string;
  candidateCommitId: string;
  capacityLimits?: CapacityLimits;
  runtimeControls?: RuntimeControls;
  temporaryDirectory?: string;
  signal?: AbortSignal;
  requestId?: string;
};
export type DeepReadonly<T> = T extends object
  ? {
      readonly [K in keyof T]: DeepReadonly<T[K]>;
    }
  : T;
export type MaybePromise<T> = T | Promise<T>;
export type NativeAuthority = SourceIdentity & {
  path: string;
};
export type NativeSourceOrigin =
  | (NativeAuthority & {
      kind: "content-addressed";
    })
  | (NativeAuthority & {
      kind: "archive-member";
      memberPath: string;
    });
export type NativeInventoryEntry = {
  path: string;
  sha256: string;
  byteLength: string;
  source: NativeSourceOrigin;
};
export type NativeDocument = {
  path: string;
  chunks: AsyncIterable<ArrayBufferView>;
};
export type NativeProviderStreams = {
  authorities: AsyncIterable<NativeAuthority>;
  inventory: AsyncIterable<NativeInventoryEntry>;
  documents: AsyncIterable<NativeDocument>;
  close?: () => MaybePromise<void>;
};
export type NativeProvider = (input: {
  root: string;
  parameters: Record<string, JsonValue>;
  signal: AbortSignal;
}) => MaybePromise<NativeProviderStreams>;
export type JsonFormatContract = NonNullable<
  JsonSourceContract["formatContract"]
>;
export type LogicalProviderDefinition = {
  id: string;
  containerPaths: string[];
  minimumDocuments?: number;
  formatContract?: JsonFormatContract;
};
export type LogicalInventoryEntry = {
  path: string;
  containerPath: string;
  pointer: string;
  record?: string;
  encoding: "utf8" | "base64";
  sha256: string;
  byteLength: string;
};
export type LogicalSourceAccess = JsonValueAccess & {
  readonly resources: ResolvedResources;
  readonly signal: AbortSignal;
  capturedSource: (path: string) => Promise<SourceReference>;
};
export type LogicalProvider = {
  definition: LogicalProviderDefinition;
  inventory: (
    access: LogicalSourceAccess,
  ) => MaybePromise<AsyncIterable<LogicalInventoryEntry>>;
};
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
