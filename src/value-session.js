// SPDX-License-Identifier: AGPL-3.0-only
// Scoped SDK capabilities over the single native service. This internal factory
// is composed by installed acquisition; callers never select a checker backend.
import { randomUUID } from "node:crypto";
const references = new WeakMap();

class ValueSession {
  #core;
  #closed = false;
  #cleanupComplete = false;
  #closing;
  #active = false;
  #cancelled = false;
  #scope = randomUUID();
  #captureOwner;
  #ownsCore;
  #leases = new Set();
  constructor(core, { captureOwner, ownsCore = true } = {}) {
    this.#core = core;
    this.#captureOwner = captureOwner;
    this.#ownsCore = ownsCore;
  }
  #open() {
    if (this.#closed) throw new Error("closed-session");
  }
  #reference(kind, id, metadata = {}) {
    const reference = Object.freeze({
      ...metadata,
      kind,
      identity: `${this.#scope}:${kind}:${id}`,
    });
    references.set(reference, { owner: this, kind, id });
    return reference;
  }
  #resolve(reference, kind) {
    this.#open();
    const authority = references.get(reference);
    if (!authority || authority.owner !== this || authority.kind !== kind)
      throw new TypeError("foreign-or-invalid-reference");
    return authority.id;
  }
  #value(id) {
    return id && id !== "0" ? this.#reference("value", id) : null;
  }
  #selected(descriptor) {
    const metadata = { ...descriptor, valueKind: descriptor.kind };
    for (const key of ["id", "type", "parent", "name", "source"])
      delete metadata[key];
    return this.#reference("value", descriptor.id, metadata);
  }
  #project(event, source) {
    const result = { ...event, ...(source ? { source } : {}) };
    if (event.type === "value") {
      result.reference = this.#value(event.id);
      result.parent = this.#value(event.parent);
      result.name = this.#value(event.name);
      delete result.id;
    } else if (Object.hasOwn(event, "value"))
      result.value = this.#value(event.value);
    if (event.arguments?.value?.id) {
      const { id, ...argument } = event.arguments.value;
      result.arguments = {
        ...event.arguments,
        value: { ...argument, reference: this.#value(id) },
      };
    }
    if (event.linkage)
      result.linkage = {
        ...event.linkage,
        containerSource: this.#reference(
          "source",
          event.linkage.containerSource,
        ),
        value: this.#value(event.linkage.value),
      };
    return result;
  }
  /** Logical identity remains stable across repeated projections and backing
   * transitions. Object identity is not a persistent reference contract.
   */
  sameReference(left, right) {
    this.#open();
    const first = references.get(left),
      second = references.get(right);
    if (!first || !second || first.owner !== this || second.owner !== this)
      throw new TypeError("foreign-or-invalid-reference");
    return first.kind === second.kind && first.id === second.id;
  }

  /** Internal projection seam for the trusted repository controller. It holds
   * one current source capability; callers own any retained earlier handles.
   * Repository census/terminal order remains with that controller.
   */
  async *projectRepositoryEvents(events) {
    this.#open();
    if (this.#active || this.#cancelled) throw new Error("session-not-ready");
    this.#active = true;
    let source,
      sourceId,
      completed = false;
    try {
      for await (const event of events) {
        this.#open();
        if (event.type === "source") {
          sourceId = event.source;
          source = this.#reference("source", sourceId, {
            byteLength: event.byteLength,
            sha256: event.sha256,
          });
        } else if (event.source && event.source !== sourceId)
          throw new Error("source-event-correlation");
        if (
          event.type === "execution-terminal" ||
          event.type === "write-terminal"
        )
          completed = true;
        yield this.#project(event, event.source ? source : undefined);
      }
    } finally {
      if (!completed) this.cancel();
      this.#active = false;
    }
  }

  /** Freeze identified source bytes, then deliver bounded events with consumer
   * backpressure. References belong to this open session, including across spill.
   * Ending iteration before its terminal cancels the incomplete check. Retained
   * references are caller-owned capabilities; collecting them is caller state.
   */
  async *check(
    chunks,
    contract = {},
    {
      identity,
      includeValues = false,
      retainValues = true,
      signal,
      transformOf,
    } = {},
  ) {
    this.#open();
    if (this.#active || this.#cancelled) throw new Error("session-not-ready");
    signal?.throwIfAborted();
    this.#active = true;
    let completed = false;
    const cancel = () => this.cancel();
    signal?.addEventListener("abort", cancel, { once: true });
    try {
      const captured = await this.#core.capture(chunks, contract, {
        identity,
        includeValueEvents: includeValues,
        retainValues,
        transformOf:
          transformOf === undefined
            ? this.#captureOwner?.parentSource
            : this.#resolve(transformOf, "source"),
      });
      this.#captureOwner?.onCapture(captured);
      this.#open();
      signal?.throwIfAborted();
      const source = this.#reference("source", captured.source, {
        byteLength: captured.byteLength,
        sha256: captured.sha256,
      });
      yield { type: "source", source };
      for await (const event of this.#core.events()) {
        this.#open();
        signal?.throwIfAborted();
        if (event.type === "terminal") completed = true;
        yield this.#project(event, source);
      }
    } finally {
      signal?.removeEventListener("abort", cancel);
      if (!completed) this.cancel();
      this.#active = false;
    }
  }

  /** Select an unambiguous decoded JSON Pointer in a completed retained source.
   * JSONL requires the exact physical record number in canonical decimal form.
   */
  async select(source, pointer = "", record) {
    const id = this.#resolve(source, "source"),
      { result } = await this.#core.command("select-value", {
        source: id,
        pointer,
        record,
      });
    return this.#selected(result.value);
  }

  /** Internal provider view: mint from actual captured census membership, never
   * from a caller's raw native ID or claimed payload identity.
   */
  async capturedSource(path) {
    this.#open();
    if (typeof path !== "string") throw new TypeError("Expected source path.");
    const { result } = await this.#core.command("census-get", { path });
    const member = result.member;
    if (!member || member.source === "0")
      throw new Error("captured-source-unavailable");
    return this.#reference("source", member.source, {
      byteLength: member.byteLength,
      sha256: member.sha256,
    });
  }

  /** Describe the same scoped value, including exact raw byte span for explicit
   * bounded transformations. This never materializes its JSON or decoded body.
   */
  async describe(value) {
    const id = this.#resolve(value, "value"),
      { result } = await this.#core.command("describe-value", { value: id });
    return this.#selected(result.value);
  }

  /** Iterate immediate object members or array elements in source order,
   * retaining one indexed descriptor at a time. Member names are scoped value
   * references, so oversized names need no complete JS string. A completed
   * retained source is required; duplicate object members remain distinct.
   */
  async *children(value) {
    const id = this.#resolve(value, "value");
    let ordinal = "0";
    while (true) {
      this.#open();
      const { result } = await this.#core.command("next-child", {
        value: id,
        ordinal,
      });
      this.#open();
      if (result.value === null) return;
      const child = result.value;
      ordinal = String(BigInt(child.ordinal) + 1n);
      yield Object.freeze({
        value: this.#selected(child),
        name: this.#value(child.name),
        ordinal: child.ordinal,
      });
    }
  }

  /** Resolve an identified UTF-8 pointer stream, including giant member names,
   * without a complete JS string or a giant control frame. The raw pointer and
   * decoded lookup segment use the same accounted adaptive native store.
   */
  async selectStream(source, chunks, { identity, record, signal } = {}) {
    const id = this.#resolve(source, "source");
    if (this.#active || this.#cancelled) throw new Error("session-not-ready");
    signal?.throwIfAborted();
    this.#active = true;
    const cancel = () => this.cancel();
    let captured;
    signal?.addEventListener("abort", cancel, { once: true });
    try {
      captured = await this.#core.capture(
        chunks,
        {},
        {
          identity,
          sourceKind: "authority",
          includeValueEvents: false,
          retainValues: false,
        },
      );
      this.#open();
      signal?.throwIfAborted();
      const { result } = await this.#core.command(
        "select-value-pointer-source",
        { source: id, pointerSource: captured.source, record },
      );
      return this.#selected(result.value);
    } finally {
      signal?.removeEventListener("abort", cancel);
      if (!captured) this.cancel();
      this.#active = false;
    }
  }

  /** Read a bounded range of raw JSON, decoded UTF-8, NFC UTF-8 or JSON Pointer
   * bytes. Offsets and lengths use canonical unsigned decimal strings.
   */
  async read(value, representation, offset = "0", maximum = "65536") {
    const id = this.#resolve(value, "value"),
      { result, data } = await this.#core.read(
        id,
        representation,
        offset,
        maximum,
      );
    return {
      bytes: data,
      offset: result.offset,
      totalByteLength: result.totalByteLength,
    };
  }

  /** Read identified original source bytes, including whitespace and rejected
   * input. Source access makes no claim that parsing or domain checks passed.
   */
  async readSource(source, offset = "0", maximum = "65536") {
    const id = this.#resolve(source, "source"),
      { result, data } = await this.#core.command("read-source", {
        source: id,
        offset,
        maximum,
      });
    return {
      bytes: data,
      offset: result.offset,
      totalByteLength: result.totalByteLength,
    };
  }

  async *sourceFragments(source) {
    let offset = 0n;
    while (true) {
      const range = await this.readSource(source, String(offset));
      if (range.bytes.length) yield range.bytes;
      offset += BigInt(range.bytes.length);
      if (offset === BigInt(range.totalByteLength)) return;
      if (!range.bytes.length) throw new Error("incomplete-source-range");
    }
  }

  /** Stream a representation with one bounded native response at a time. */
  async *fragments(value, representation) {
    let offset = 0n;
    while (true) {
      const range = await this.read(value, representation, String(offset));
      if (range.bytes.length) yield range.bytes;
      offset += BigInt(range.bytes.length);
      if (offset === BigInt(range.totalByteLength)) return;
      if (!range.bytes.length) throw new Error("incomplete-value-range");
    }
  }

  /** Reserve one explicit materialization against the shared managed ledger.
   * The caller owns the lease until release, must stop using its borrowed bytes
   * then, and must explicitly copy any data that needs a longer lifetime.
   */
  async materialize(value, representation, maximum) {
    return this.#materialize(
      value,
      representation,
      maximum,
      "reserve-materialization",
    );
  }
  async #materialize(value, representation, maximum, command) {
    const id = this.#resolve(value, "value"),
      { result } = await this.#core.command(command, {
        value: id,
        representation,
        maximum,
      });
    let bytes,
      released = false,
      releasing;
    const release = async () => {
      if (released) return;
      releasing ??= (async () => {
        if (!this.#closed || !this.#ownsCore)
          await this.#core.command("release-materialization", {
            reservation: result.reservation,
          });
        released = true;
        bytes = undefined;
        this.#leases.delete(release);
      })();
      try {
        await releasing;
      } catch (error) {
        // An overlapping bounded exchange can refuse this attempt before the
        // release command runs. Retain the lease and permit a settled retry.
        releasing = undefined;
        throw error;
      }
    };
    this.#leases.add(release);
    try {
      bytes = Buffer.alloc(Number(result.byteLength));
      let offset = 0;
      for await (const fragment of this.fragments(value, representation)) {
        if (offset + fragment.length > bytes.length)
          throw new Error("materialization-length");
        bytes.set(fragment, offset);
        offset += fragment.length;
      }
      if (offset !== bytes.length) throw new Error("materialization-length");
      const open = () => this.#open();
      return Object.freeze({
        managedReservationBytes: result.managedReservationBytes,
        get bytes() {
          open();
          if (released) throw new Error("released-materialization");
          return bytes;
        },
        release,
      });
    } catch (error) {
      await release();
      throw error;
    }
  }

  /** Explicit bounded JSON control/domain bridge, after complete positive shared
   * quality admission. Ajv or another complete domain validator remains caller
   * owned. Conservative byte/node reservation precedes JSON object allocation.
   * transfer moves the independent object and its accounting obligation to the
   * caller; it does not extend a borrowed native value's lifetime.
   */
  async materializeControl(value, maximum, validate) {
    if (typeof validate !== "function")
      throw new TypeError("domain-validator-required");
    const lease = await this.#materialize(
      value,
      "source-json",
      maximum,
      "reserve-control-materialization",
    );
    let object;
    try {
      object = JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(lease.bytes),
      );
      if ((await validate(object)) === false)
        throw new Error("domain-admission-failed");
      const current = () => {
        void lease.bytes; // Validate the lease before returning its owned object.
        return object;
      };
      return Object.freeze({
        get value() {
          return current();
        },
        managedReservationBytes: lease.managedReservationBytes,
        async release() {
          await lease.release();
          object = undefined;
        },
        async transfer() {
          const owned = {
            value: current(),
            managedReservationBytes: lease.managedReservationBytes,
          };
          await lease.release();
          object = undefined;
          return owned;
        },
      });
    } catch (error) {
      await lease.release();
      throw error;
    }
  }
  cancel() {
    this.#cancelled = true;
    this.#core.cancel();
  }
  close() {
    if (this.#closing) return this.#closing;
    if (this.#cleanupComplete) return Promise.resolve();
    this.#closed = true;
    const closing = Promise.resolve().then(async () => {
      if (this.#ownsCore) {
        try {
          await this.#core.close();
        } finally {
          // Native close releases owner reservations even after cancellation.
          for (const release of this.#leases) await release();
        }
      } else {
        for (const release of this.#leases) await release();
      }
      this.#cleanupComplete = true;
    });
    this.#closing = closing;
    closing.catch(() => {
      if (this.#closing === closing) this.#closing = undefined;
    });
    return closing;
  }
}

/** Internal composition seam: the supplied core is already verified/configured.
 * Kept outside supported package exports; public factories own acquisition.
 */
export function createValueSession(core) {
  return new ValueSession(core);
}

/** Internal writer view over the execution owner's existing configured core.
 * It cannot close that owner. Raw capture provenance stays within this seam;
 * the supported facade exposes neither constructor nor native identifiers.
 */
export function createTransformValueSession(core, captureOwner) {
  return new ValueSession(core, { captureOwner, ownsCore: false });
}

/** A trusted metadata reader shares its execution's core and allocation ledger,
 * while settlement invalidates only this borrowed view and its own leases.
 */
export function createBorrowedValueSession(core) {
  return new ValueSession(core, { ownsCore: false });
}
