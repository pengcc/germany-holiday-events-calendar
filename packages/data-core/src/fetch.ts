import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { assertWithin, sha256, writeJsonAtomic } from "./fs";
import { type SourceFingerprint, SourceFingerprintSchema, type SourceManifest } from "./schemas";

interface CachedSource {
  fingerprint: SourceFingerprint;
  bodyFile: string;
}

export interface FetchResult {
  body: string;
  fingerprint: SourceFingerprint;
  fromCache: boolean;
}

export async function fetchSource(
  source: SourceManifest,
  cacheDirectory: string,
): Promise<FetchResult> {
  const sourceCacheDirectory = assertWithin(cacheDirectory, resolve(cacheDirectory, source.id));
  await mkdir(sourceCacheDirectory, { recursive: true });
  const metadataPath = resolve(sourceCacheDirectory, "latest.json");
  let cached: CachedSource | undefined;

  try {
    cached = JSON.parse(await readFile(metadataPath, "utf8")) as CachedSource;
    SourceFingerprintSchema.parse(cached.fingerprint);
  } catch {
    cached = undefined;
  }

  const headers = new Headers({ Accept: source.fetch.expectedContentTypes.join(", ") });
  if (cached?.fingerprint.etag) {
    headers.set("If-None-Match", cached.fingerprint.etag);
  }
  if (cached?.fingerprint.lastModified) {
    headers.set("If-Modified-Since", cached.fingerprint.lastModified);
  }

  const response = await fetchWithLimits(source, headers);
  if (response.status === 304 && cached) {
    return {
      body: await readFile(
        assertWithin(sourceCacheDirectory, resolve(sourceCacheDirectory, cached.bodyFile)),
        "utf8",
      ),
      fingerprint: cached.fingerprint,
      fromCache: true,
    };
  }
  if (!response.ok) {
    throw new Error(`Source returned HTTP ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type") ?? "application/octet-stream";
  if (
    !source.fetch.expectedContentTypes.some((expected) =>
      contentType.toLowerCase().includes(expected.toLowerCase()),
    )
  ) {
    throw new Error(
      `Unexpected content type "${contentType}"; expected ${source.fetch.expectedContentTypes.join(", ")}`,
    );
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > source.fetch.maxBytes) {
    throw new Error(
      `Source response is ${bytes.byteLength} bytes; limit is ${source.fetch.maxBytes} bytes`,
    );
  }

  const body = new TextDecoder().decode(bytes);
  const fingerprint: SourceFingerprint = {
    sha256: sha256(bytes),
    bytes: bytes.byteLength,
    contentType,
    retrievedAt: new Date().toISOString(),
    etag: response.headers.get("etag") ?? undefined,
    lastModified: response.headers.get("last-modified") ?? undefined,
    finalUrl: response.url,
  };
  const bodyFile = `${fingerprint.sha256}.raw`;
  await writeFile(resolve(sourceCacheDirectory, bodyFile), body, "utf8");
  await writeJsonAtomic(metadataPath, { fingerprint, bodyFile });
  return { body, fingerprint, fromCache: false };
}

async function fetchWithLimits(source: SourceManifest, headers: Headers): Promise<Response> {
  let url = new URL(source.fetchUrl);
  for (let redirectCount = 0; redirectCount <= source.fetch.maxRedirects; redirectCount += 1) {
    if (url.protocol !== "https:" || !source.fetch.allowedHosts.includes(url.hostname)) {
      throw new Error(`Source URL host is not allowlisted: ${url.hostname}`);
    }
    const response = await fetch(url, {
      headers,
      redirect: "manual",
      signal: AbortSignal.timeout(source.fetch.timeoutMs),
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) {
      return response;
    }
    const location = response.headers.get("location");
    if (!location) {
      throw new Error(`Redirect ${response.status} did not provide a location header`);
    }
    url = new URL(location, url);
  }
  throw new Error(`Source exceeded the ${source.fetch.maxRedirects} redirect limit`);
}
