export type JsonQualityPolicy =
  import("../types/schemas/configuration.js").JsonQualityPolicy;
export type JsonSourceContract =
  import("../types/schemas/source-contract.js").JsonSourceContract;
export type JsonQualityEvent =
  import("../types/schemas/event.js").JsonQualityEvent;
export type RuntimeControls = NonNullable<JsonQualityPolicy["runtimeControls"]>;
export type CapacityLimits = JsonQualityPolicy["capacityLimits"];
export type JsonContract = JsonSourceContract & {
  path: string;
  exclude: boolean;
  exceptions: {
    owner: string;
    reason: string;
  }[];
};
export type InstallationOptions = {
  toolingRoot: string;
  npmExecutable?: string;
  cachePath?: string;
  capacityLimits?: CapacityLimits;
  bootstrapPath?: string;
  signal?: AbortSignal;
};
export type InstallationVerification = {
  specifier: string;
  coordinate: {
    kind: "registry";
    version: string;
  };
  integrity: string;
  files: number;
  native: {
    name: string;
    version: string;
    integrity: string;
    files: number;
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
  readonly identity: string;
  readonly byteLength?: string;
  readonly sha256?: string;
};
export type ValueReference = {
  readonly kind: "value";
  readonly identity: string;
  readonly valueKind?: string;
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
  offset: string;
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
export type JsonValueSession = {
  read: (
    value: ValueReference,
    representation: Representation,
    offset?: string,
    maximum?: string,
  ) => Promise<ByteRange>;
  readSource: (
    source: SourceReference,
    offset?: string,
    maximum?: string,
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
  ) => Promise<ValueReference | null>;
  selectStream: (
    source: SourceReference,
    chunks: AsyncIterable<Uint8Array>,
    options?: {
      identity?: SourceIdentity;
      record?: string;
      signal?: AbortSignal;
    },
  ) => Promise<ValueReference | null>;
  children: (value: ValueReference) => AsyncIterable<{
    value: ValueReference;
    name: ValueReference | null;
    ordinal: string;
  }>;
  describe: (value: ValueReference) => Promise<Record<string, unknown>>;
  sameReference: (
    left: SourceReference | ValueReference,
    right: SourceReference | ValueReference,
  ) => boolean;
  materialize: (
    value: ValueReference,
    representation: Representation,
    maximum: string,
  ) => Promise<ByteLease>;
  materializeControl: (
    value: ValueReference,
    maximum: string,
    validate: (value: unknown) => unknown | Promise<unknown>,
  ) => Promise<ControlLease>;
  close: () => Promise<void>;
  signal: AbortSignal;
  identity: Readonly<Record<string, unknown>>;
  resources: Readonly<Record<string, unknown>>;
};
export type JsonSourceSession = JsonValueSession & {
  check: (
    source: JsonSource,
    contract?: JsonSourceContract,
    options?: {
      signal?: AbortSignal;
      includeValues?: boolean;
      retainValues?: boolean;
      requestId?: string;
    },
  ) => AsyncIterable<JsonQualityEvent>;
};
export type RepositoryOptions = SessionOptions & {
  root: string;
  nativeProviders?: Record<string, unknown>[];
  logicalProviders?: Record<string, unknown>[];
  requiredOutputs?: string[];
  gitExecutable?: string;
  retainValues?: boolean;
  requestId?: string;
};
export type JsonRepositorySession = JsonValueSession & {
  events: () => AsyncIterable<JsonQualityEvent>;
  rewrite: (
    operation: "format" | "normalize",
    options?: Record<string, unknown>,
  ) => AsyncIterable<JsonQualityEvent>;
};
export type CliContext = Partial<
  Pick<
    RepositoryOptions,
    "root" | "nativeProviders" | "logicalProviders" | "requiredOutputs"
  >
>;
export type WriterOptions = SessionOptions & {
  contract?: Pick<
    JsonSourceContract,
    | "normalization"
    | "allowEmptyKeys"
    | "preserveNfcValues"
    | "allowFormatWrites"
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
  trustedSha: string;
  candidateSha: string;
  capacityLimits?: CapacityLimits;
  runtimeControls?: RuntimeControls;
  temporaryDirectory?: string;
  signal?: AbortSignal;
  requestId?: string;
};
/** Public structural contracts. Runtime admission and opaque-reference ownership
 * remain mandatory; TypeScript types do not mint a native capability.
 * @typedef {import("../types/schemas/configuration.js").JsonQualityPolicy} JsonQualityPolicy
 * @typedef {import("../types/schemas/source-contract.js").JsonSourceContract} JsonSourceContract
 * @typedef {import("../types/schemas/event.js").JsonQualityEvent} JsonQualityEvent
 * @typedef {NonNullable<JsonQualityPolicy["runtimeControls"]>} RuntimeControls
 * @typedef {JsonQualityPolicy["capacityLimits"]} CapacityLimits
 * @typedef {JsonSourceContract & {path: string, exclude: boolean, exceptions: {owner: string, reason: string}[]}} JsonContract
 * @typedef {{toolingRoot: string, npmExecutable?: string, cachePath?: string, capacityLimits?: CapacityLimits, bootstrapPath?: string, signal?: AbortSignal}} InstallationOptions
 * @typedef {{specifier: string, coordinate: {kind: "registry", version: string}, integrity: string, files: number, native: {name: string, version: string, integrity: string, files: number}}} InstallationVerification
 * @typedef {{capacityLimits?: CapacityLimits, runtimeControls?: RuntimeControls, temporaryDirectory?: string, signal?: AbortSignal}} SessionOptions
 * @typedef {{readonly kind: "source", readonly identity: string, readonly byteLength?: string, readonly sha256?: string}} SourceReference
 * @typedef {{readonly kind: "value", readonly identity: string, readonly valueKind?: string}} ValueReference
 * @typedef {{sha256: string, byteLength: string}} SourceIdentity
 * @typedef {{open: (options: {signal: AbortSignal}) => AsyncIterable<Uint8Array> | Promise<AsyncIterable<Uint8Array>>, identity?: SourceIdentity}} JsonSource
 * @typedef {"source-json" | "decoded-utf8" | "number-lexeme" | "nfc-utf8" | "json-pointer"} Representation
 * @typedef {{bytes: Buffer, offset: string, totalByteLength: string}} ByteRange
 * @typedef {{readonly bytes: Buffer, readonly managedReservationBytes: string, release: () => Promise<void>}} ByteLease
 * @typedef {{readonly value: unknown, readonly managedReservationBytes: string, release: () => Promise<void>, transfer: () => Promise<{value: unknown, managedReservationBytes: string}>}} ControlLease
 * @typedef {{read: (value: ValueReference, representation: Representation, offset?: string, maximum?: string) => Promise<ByteRange>, readSource: (source: SourceReference, offset?: string, maximum?: string) => Promise<ByteRange>, fragments: (value: ValueReference, representation: Representation) => AsyncIterable<Buffer>, sourceFragments: (source: SourceReference) => AsyncIterable<Buffer>, select: (source: SourceReference, pointer?: string, record?: string) => Promise<ValueReference | null>, selectStream: (source: SourceReference, chunks: AsyncIterable<Uint8Array>, options?: {identity?: SourceIdentity, record?: string, signal?: AbortSignal}) => Promise<ValueReference | null>, children: (value: ValueReference) => AsyncIterable<{value: ValueReference, name: ValueReference | null, ordinal: string}>, describe: (value: ValueReference) => Promise<Record<string, unknown>>, sameReference: (left: SourceReference | ValueReference, right: SourceReference | ValueReference) => boolean, materialize: (value: ValueReference, representation: Representation, maximum: string) => Promise<ByteLease>, materializeControl: (value: ValueReference, maximum: string, validate: (value: unknown) => unknown | Promise<unknown>) => Promise<ControlLease>, close: () => Promise<void>, signal: AbortSignal, identity: Readonly<Record<string, unknown>>, resources: Readonly<Record<string, unknown>>}} JsonValueSession
 * @typedef {JsonValueSession & {check: (source: JsonSource, contract?: JsonSourceContract, options?: {signal?: AbortSignal, includeValues?: boolean, retainValues?: boolean, requestId?: string}) => AsyncIterable<JsonQualityEvent>}} JsonSourceSession
 * @typedef {SessionOptions & {root: string, nativeProviders?: Record<string, unknown>[], logicalProviders?: Record<string, unknown>[], requiredOutputs?: string[], gitExecutable?: string, retainValues?: boolean, requestId?: string}} RepositoryOptions
 * @typedef {JsonValueSession & {events: () => AsyncIterable<JsonQualityEvent>, rewrite: (operation: "format" | "normalize", options?: Record<string, unknown>) => AsyncIterable<JsonQualityEvent>}} JsonRepositorySession
 * @typedef {Partial<Pick<RepositoryOptions, "root" | "nativeProviders" | "logicalProviders" | "requiredOutputs">>} CliContext
 * @typedef {SessionOptions & {contract?: Pick<JsonSourceContract, "normalization" | "allowEmptyKeys" | "preserveNfcValues" | "allowFormatWrites" | "owner" | "reason">}} WriterOptions
 * @typedef {null | boolean | number | string | JsonValue[] | {[key: string]: JsonValue}} JsonValue
 * @typedef {{trustedRoot: string, candidateRoot: string, trustedSha: string, candidateSha: string, capacityLimits?: CapacityLimits, runtimeControls?: RuntimeControls, temporaryDirectory?: string, signal?: AbortSignal, requestId?: string}} QualificationOptions
 */
export {};
