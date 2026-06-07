import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";

export function projectPaths(workspaceRoot: string) {
  const root = resolve(workspaceRoot);
  return {
    root,
    sources: resolve(root, "data/sources"),
    releaseConfig: resolve(root, "data/release.yaml"),
    publicRules: resolve(root, "data/public-holiday-rules.yaml"),
    overrides: resolve(root, "data/overrides"),
    accepted: resolve(root, "data/accepted/batches"),
    reviews: resolve(root, "data/reviews"),
    snapshots: resolve(root, "data/snapshots/accepted"),
    publicData: resolve(root, "apps/web/public/data"),
    runs: resolve(root, "dev_locals/data-runs"),
    cache: resolve(root, "dev_locals/source-cache"),
  };
}

export function assertWithin(parent: string, candidate: string): string {
  const resolvedParent = resolve(parent);
  const resolvedCandidate = resolve(candidate);
  const pathFromParent = relative(resolvedParent, resolvedCandidate);
  if (pathFromParent.startsWith("..") || pathFromParent === "") {
    if (resolvedCandidate !== resolvedParent) {
      throw new Error(`Path escapes allowed root: ${resolvedCandidate}`);
    }
  }
  return resolvedCandidate;
}

export async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

export async function writeJsonAtomic(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}-${randomUUID()}`;
  const serialized = `${stableStringify(value)}\n`;
  await writeFile(temporary, serialized, "utf8");
  await rename(temporary, path);
}

export async function writeTextAtomic(path: string, value: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}-${randomUUID()}`;
  await writeFile(temporary, value, "utf8");
  await rename(temporary, path);
}

export async function writeBytesAtomic(path: string, value: Uint8Array): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}-${randomUUID()}`;
  await writeFile(temporary, value);
  await rename(temporary, path);
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value), null, 2);
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, sortValue(child)]),
    );
  }
  return value;
}

export function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}
