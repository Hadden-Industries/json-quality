// SPDX-License-Identifier: AGPL-3.0-only
// Internal Node-API transport for the single shared native service. Public API
// and protocol use the same cohort; no alternate checker.
import { encodeNativeControl } from "./native-control.js";
import cohort from "../schemas/contract-cohort.json" with { type: "json" };

/** Encode one bounded wire frame, without accepting payload data as control. */
export function nativeFrame(
  /** @type {*} */ kind,
  /** @type {Buffer<ArrayBufferLike>} */ body = Buffer.alloc(0),
) {
  if (!Buffer.isBuffer(body) || body.length > 65536)
    throw new Error("native-frame-capacity");
  const result = Buffer.allocUnsafe(5 + body.length);
  result[0] = kind.charCodeAt(0);
  result.writeUInt32LE(body.length, 1);
  body.copy(result, 5);
  return result;
}

/** Decode at most two complete bounded response frames from a native exchange. */
export function decodeNativeFrames(/** @type {*} */ bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length > 131082)
    throw new Error("native-response-capacity");
  const /** @type {any[]} */ result = [];
  for (let offset = 0; offset < bytes.length;) {
    if (result.length >= 2 || offset + 5 > bytes.length)
      throw new Error("native-response-boundary");
    const kind = String.fromCharCode(bytes[offset]),
      length = bytes.readUInt32LE(offset + 1);
    if (
      !["J", "D"].includes(kind) ||
      length > 65536 ||
      offset + 5 + length > bytes.length
    )
      throw new Error("native-response-boundary");
    const body = bytes.subarray(offset + 5, offset + 5 + length);
    result.push({
      kind,
      value: kind === "J" ? JSON.parse(body.toString("utf8")) : body,
    });
    offset += 5 + length;
  }
  return result;
}

/** One configured execution, with serialized bounded exchanges and explicit
 * cleanup. The component has already passed the acquisition/identity boundary.
 * Inputs must cooperate with cancellation; close settles started work first.
 */
export class NativeSession {
  #binding;
  #handle;
  #owner;
  #sequence = 0n;
  /** @type {*} */ #pending;
  /** @type {*} */ #closing;
  #closed = false;
  #released = false;
  constructor(/** @type {*} */ component, /** @type {*} */ scratch) {
    this.#binding = component.binding;
    this.#handle = this.#binding.create(scratch);
    try {
      const frames = decodeNativeFrames(this.#binding.hello(this.#handle));
      this.hello = Object.freeze(frames[0]?.value);
      const manifest = component.manifest;
      if (
        frames.length !== 1 ||
        frames[0].kind !== "J" ||
        this.hello?.protocolVersion !== cohort.nativeProtocolVersion ||
        this.hello.sourceInputsSha256 !== manifest.sourceInputsSha256 ||
        this.hello.icu !== manifest.components.icuVersion ||
        this.hello.unicode !== manifest.components.unicodeVersion ||
        this.hello.sqlite !== manifest.components.sqliteVersion ||
        !/^[a-f0-9]{32}$/u.test(this.hello.owner)
      )
        throw new Error("native-session-cohort");
      this.#owner = this.hello.owner;
    } catch (error) {
      this.#binding.release(this.#handle);
      this.#closed = true;
      throw error;
    }
  }
  /** @template T
   * @param {() => T | Promise<T>} operation
   * @returns {Promise<T>}
   */
  #exclusive(operation) {
    if (this.#closed || this.#closing)
      return Promise.reject(new Error("closed-session"));
    if (this.#pending)
      return Promise.reject(new Error("concurrent-native-request"));
    const pending = Promise.resolve().then(operation);
    this.#pending = pending;
    return pending.finally(() => {
      if (this.#pending === pending) this.#pending = undefined;
    });
  }
  async #command(/** @type {*} */ command, /** @type {*} */ fields) {
    for (const key of ["protocolVersion", "owner", "requestId", "command"])
      if (Object.hasOwn(fields, key))
        throw new TypeError("reserved-native-envelope-field");
    const requestId = String(++this.#sequence),
      body = encodeNativeControl({
        ...fields,
        protocolVersion: cohort.nativeProtocolVersion,
        owner: this.#owner,
        requestId,
        command,
      });
    let frames;
    for (let offset = 0; offset < body.length; offset += 65536)
      frames = decodeNativeFrames(
        await this.#binding.exchange(
          this.#handle,
          nativeFrame(
            offset + 65536 < body.length ? "C" : "c",
            body.subarray(offset, offset + 65536),
          ),
        ),
      );
    if (!frames) throw new Error("native-response-boundary");
    const result = frames.find(({ kind }) => kind === "J")?.value;
    if (result?.requestId !== requestId)
      throw new Error("native-response-request");
    if (result.type === "request-refused") {
      const /** @type {NodeJS.ErrnoException} */ error = new Error(result.code);
      error.code = result.code;
      throw error;
    }
    return { result, data: frames.find(({ kind }) => kind === "D")?.value };
  }
  command(/** @type {*} */ command, /** @type {*} */ fields = {}) {
    return this.#exclusive(() => this.#command(command, fields));
  }
  configure(/** @type {*} */ resources = {}) {
    return this.command("configure", resources);
  }
  capture(
    /** @type {*} */ input,
    /** @type {*} */ contract = {},
    /** @type {*} */ {
      includeValueEvents = false,
      retainValues = includeValueEvents,
      identity,
      sourceKind,
      transformOf,
    } = {},
  ) {
    return this.#exclusive(async () => {
      const { result: ready } = await this.#command(
        transformOf === undefined ? "begin-source" : "begin-source-transform",
        {
          parentSource: transformOf,
          contract,
          includeValueEvents,
          retainValues,
          identity,
          sourceKind,
        },
      );
      let /** @type {any[]} */ pending = [],
        pendingBytes = 0;
      const flush = async (finish = false) => {
        if (finish) pending.push(nativeFrame("F"));
        const output = await this.#binding.exchange(
          this.#handle,
          pending.length === 1 ? pending[0] : Buffer.concat(pending),
        );
        pending = [];
        pendingBytes = 0;
        if (!finish && output.length)
          throw new Error("unexpected-source-fragment-response");
        return output;
      };
      for await (const part of input) {
        if (!ArrayBuffer.isView(part))
          throw new TypeError("source-fragment-type");
        const bytes = Buffer.from(
          part.buffer,
          part.byteOffset,
          part.byteLength,
        );
        for (let offset = 0; offset < bytes.length; offset += 65536) {
          const frame = nativeFrame(
            "B",
            bytes.subarray(offset, offset + 65536),
          );
          pending.push(frame);
          pendingBytes += frame.length;
          // Freeze each borrowed fragment before advancing its producer. One
          // bounded transport batch can share a worker hop with capture EOF;
          // parsing, quality checks and backing selection remain unchanged.
          if (pendingBytes >= 65536 || pending.length === 32) await flush();
        }
      }
      const frames = decodeNativeFrames(await flush(true)),
        result = frames[0]?.value;
      if (
        frames.length !== 1 ||
        frames[0].kind !== "J" ||
        result.type !== "source-captured" ||
        result.source !== ready.source ||
        result.requestId !== ready.requestId
      )
        throw new Error("native-source-capture-response");
      return result;
    });
  }
  async *events() {
    while (true) {
      const { result } = await this.command("next");
      if (result.type !== "events" || !Array.isArray(result.events))
        throw new Error("native-events-response");
      for (const event of result.events) {
        yield event;
        if (event.type === "terminal") return;
      }
    }
  }
  read(
    /** @type {*} */ value,
    /** @type {*} */ representation,
    offset = "0",
    maximum = "65536",
  ) {
    return this.command("read-value", {
      value,
      representation,
      offset,
      maximum,
    });
  }
  cancel() {
    if (!this.#closed) this.#binding.cancel(this.#handle);
  }
  close() {
    if (this.#closing) return this.#closing;
    if (this.#released) return Promise.resolve();
    this.#closing = (async () => {
      if (this.#pending) {
        this.cancel();
        try {
          await this.#pending;
        } catch {
          /* Cleanup remains available after failure. */
        }
      }
      this.#closed = true;
      try {
        await this.#command("close", {});
        this.#binding.release(this.#handle);
        this.#released = true;
      } finally {
        // Keep the handle owned after a failed close so cleanup can be retried.
        // Releasing an active native session would hide the original fault.
        this.#closing = undefined;
      }
    })();
    return this.#closing;
  }
}
