// SPDX-License-Identifier: AGPL-3.0-only
// Adapted from OwlAPI's bounded reader and retry-after handling (source register).
import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { budgets } from "./qualification-process.js";
import { artifactLimits } from "./artifact-policy.js";

const transientCodes = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "EAI_AGAIN",
  "ETIMEDOUT",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_BODY_TIMEOUT",
  "UND_ERR_SOCKET",
]);
export const transientReadError = (error) =>
  error?.name === "TimeoutError" ||
  transientCodes.has(error?.code) ||
  transientCodes.has(error?.cause?.code);
const rateLimited = (response) =>
  response?.status === 429 ||
  (response?.status === 403 &&
    (response.headers.has("retry-after") ||
      response.headers.get("x-ratelimit-remaining") === "0"));
export function retryDelay(response, attempt, now, random = Math.random) {
  const hint = response?.headers?.get("retry-after");
  const seconds = hint?.trim() ? Number(hint) : NaN;
  const retry = Number.isFinite(seconds)
    ? seconds * 1000
    : Date.parse(hint) - now;
  const reset =
    Number(response?.headers?.get("x-ratelimit-reset")) * 1000 - now;
  const exhausted = response?.headers?.get("x-ratelimit-remaining") === "0";
  return Math.max(
    1000 * 2 ** attempt * (1 + random() * 0.25),
    Number.isFinite(retry) ? retry : 0,
    exhausted && Number.isFinite(reset) ? reset : 0,
    rateLimited(response) &&
      !Number.isFinite(retry) &&
      !(exhausted && Number.isFinite(reset))
      ? 60000
      : 0,
  );
}

/** Read retries never encompass JSON/schema/provenance admission or writes. */
export function createRepositoryReader({
  repository,
  token,
  fetchImpl = fetch,
  now = Date.now,
  sleep = delay,
  random = Math.random,
  deadline = now() + budgets.read,
  accept = "application/vnd.github+json",
  maximumDownloadBytes = artifactLimits.collectionBytes,
} = {}) {
  assert.match(repository, /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u);
  assert.ok(token, "Read-only GitHub token unavailable");
  assert.ok(
    Number.isSafeInteger(maximumDownloadBytes) && maximumDownloadBytes > 0,
  );
  const downloadLimit = Math.min(
    maximumDownloadBytes,
    artifactLimits.collectionBytes,
  );
  const end = Math.min(deadline, now() + budgets.read);
  let requests = 0,
    bytesRead = 0,
    metadataBytesRead = 0,
    downloadBytesRead = 0;
  const limit = () =>
    Object.assign(new Error("GitHub evidence lookup budget exhausted"), {
      code: "LOOKUP_LIMIT_EXCEEDED",
    });
  return async (
    path,
    { raw = false, maximumBytes = artifactLimits.proofBytes } = {},
  ) => {
    assert.ok(
      path === "" || /^\/[A-Za-z0-9_./?=&%-]+$/u.test(path),
      "Invalid repository evidence path",
    );
    assert.ok(!path.includes("..") && !path.includes("//"));
    for (let attempt = 0; attempt < 3; attempt++) {
      const remaining = end - now();
      if (requests >= 64 || remaining <= 0) throw limit();
      requests++;
      let response, bytes;
      try {
        response = await fetchImpl(
          `https://api.github.com/repos/${repository}${path}`,
          {
            redirect: "manual",
            cache: "no-store",
            signal: AbortSignal.timeout(remaining),
            headers: {
              Accept: accept,
              Authorization: `Bearer ${token}`,
              "X-GitHub-Api-Version": "2026-03-10",
            },
          },
        );
        if (raw && response.status === 302) {
          const location = new URL(response.headers.get("location"));
          assert.ok(
            location.protocol === "https:" &&
              !location.username &&
              !location.password &&
              !location.hash &&
              (location.hostname.endsWith(".blob.core.windows.net") ||
                location.hostname.endsWith(".actions.githubusercontent.com")),
            "Unexpected artifact storage origin",
          );
          await response.body?.cancel();
          if (++requests > 64 || now() >= end) throw limit();
          // Never forward the GitHub credential to signed object-storage URLs.
          response = await fetchImpl(location, {
            redirect: "error",
            cache: "no-store",
            signal: AbortSignal.timeout(end - now()),
          });
        }
        if (!response.ok)
          throw Object.assign(
            new Error(`GitHub evidence HTTP ${response.status}`),
            {
              httpStatus: response.status,
              retryable:
                [408, 500, 502, 503, 504].includes(response.status) ||
                rateLimited(response),
            },
          );
        assert.ok(response.body, "Missing GitHub evidence body");
        let size = 0;
        const chunks = [];
        for await (const chunk of response.body) {
          size += chunk.byteLength;
          bytesRead += chunk.byteLength;
          if (raw) downloadBytesRead += chunk.byteLength;
          else metadataBytesRead += chunk.byteLength;
          if (
            size > maximumBytes ||
            metadataBytesRead > artifactLimits.metadataBytes ||
            downloadBytesRead > downloadLimit ||
            now() >= end
          )
            throw limit();
          chunks.push(chunk);
        }
        bytes = Buffer.concat(chunks);
      } catch (error) {
        if (attempt === 2 || !(error.retryable || transientReadError(error)))
          throw error;
      } finally {
        if (response?.body && !response.bodyUsed)
          await response.body.cancel().catch(() => {});
      }
      if (bytes !== undefined) {
        if (now() >= end) throw limit();
        return raw
          ? bytes
          : JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
      }
      const wait = retryDelay(response, attempt, now(), random);
      console.error(
        JSON.stringify({
          phase: "github-evidence-read",
          state: "retry",
          attempt: attempt + 1,
          requests,
          bytesRead,
          metadataBytesRead,
          downloadBytesRead,
          delayMs: Math.ceil(wait),
          remainingMs: end - now(),
        }),
      );
      if (wait >= end - now()) throw limit();
      await sleep(wait);
    }
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const read = createRepositoryReader({
      repository:
        process.env.GITHUB_REPOSITORY ?? "Hadden-Industries/json-quality",
      token: process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN,
      accept: process.argv.includes("--sarif")
        ? "application/sarif+json"
        : "application/vnd.github+json",
      deadline: Date.now() + budgets.read - 2000,
    });
    const path = process.argv[2];
    if (process.argv[3] === "--paginate") {
      const pages = [];
      for (let page = 1; page <= 100; page++) {
        const result = await read(
          `${path}${path.includes("?") ? "&" : "?"}page=${page}`,
        );
        pages.push(result);
        const items = Array.isArray(result)
          ? result
          : Object.values(result).find(Array.isArray);
        assert.ok(items, "Missing paginated collection");
        if (items.length < 100) {
          console.log(JSON.stringify(pages));
          break;
        }
        assert.ok(page < 100, "GitHub pagination bound exceeded");
      }
    } else if (process.argv.includes("--binary")) {
      const maximumBytes = Number(
        process.env.JSON_QUALITY_ARTIFACT_MAXIMUM_BYTES ??
          artifactLimits.proofBytes,
      );
      assert.ok(
        Number.isSafeInteger(maximumBytes) &&
          maximumBytes > 0 &&
          maximumBytes <= artifactLimits.collectionBytes,
      );
      process.stdout.write(await read(path, { raw: true, maximumBytes }));
    } else console.log(JSON.stringify(await read(path)));
  } catch (error) {
    console.error(
      JSON.stringify({
        githubEvidenceError: {
          message: error.message,
          code: error.code,
          httpStatus: error.httpStatus,
        },
      }),
    );
    process.exitCode = 1;
  }
}
