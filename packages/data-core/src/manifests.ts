import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parse } from "yaml";
import {
  type HolidayOverride,
  OverrideSchema,
  type ReleaseConfig,
  ReleaseConfigSchema,
  type SourceCatalog,
  SourceCatalogSchema,
  type SourceDocument,
  type SourceManifest,
  SourceManifestSchema,
  type SourceMatrix,
  stateCodes,
} from "./schemas";

export async function loadSourceManifests(directory: string): Promise<SourceManifest[]> {
  const files = (await readdir(directory))
    .filter((file) => file.endsWith(".yaml") || file.endsWith(".yml"))
    .sort();
  const parsed = await Promise.all(
    files.map(
      async (file) =>
        parse(await readFile(resolve(directory, file), "utf8"), { merge: true }) as unknown,
    ),
  );
  const catalogs = parsed
    .map((value) => SourceCatalogSchema.safeParse(value))
    .filter((result): result is { success: true; data: SourceCatalog } => result.success)
    .map((result) => result.data);
  const legacy = parsed
    .map((value) => SourceManifestSchema.safeParse(value))
    .filter((result): result is { success: true; data: SourceManifest } => result.success)
    .map((result) => result.data);
  const documents = new Map(
    catalogs.flatMap((catalog) => catalog.documents).map((document) => [document.id, document]),
  );
  const expanded = catalogs.flatMap((catalog) =>
    catalog.matrices.flatMap((matrix) => expandMatrix(matrix, documents)),
  );
  if (legacy.length + catalogs.length !== parsed.length) {
    const invalid = parsed.find(
      (value) =>
        !SourceCatalogSchema.safeParse(value).success &&
        !SourceManifestSchema.safeParse(value).success,
    );
    SourceManifestSchema.parse(invalid);
  }
  return [...legacy, ...expanded].sort((left, right) => left.id.localeCompare(right.id));
}

export async function loadReleaseConfig(path: string): Promise<ReleaseConfig> {
  return ReleaseConfigSchema.parse(parse(await readFile(path, "utf8")));
}

export async function loadOverrides(directory: string): Promise<HolidayOverride[]> {
  let files: string[];
  try {
    files = (await readdir(directory))
      .filter((file) => file.endsWith(".yaml") || file.endsWith(".yml"))
      .sort();
  } catch {
    return [];
  }

  return Promise.all(
    files.map(async (file) =>
      OverrideSchema.parse(parse(await readFile(resolve(directory, file), "utf8"))),
    ),
  );
}

function expandMatrix(
  matrix: SourceMatrix,
  documents: Map<string, SourceDocument>,
): SourceManifest[] {
  const jurisdictions = matrix.jurisdictions === "all" ? stateCodes : matrix.jurisdictions;
  return jurisdictions.map((jurisdiction) => {
    const primaryDocumentId =
      matrix.adapter === "kmk-ics"
        ? (matrix.crossCheckDocuments?.[jurisdiction] ?? matrix.documentId)
        : (matrix.documents?.[jurisdiction] ?? matrix.documentId);
    if (!primaryDocumentId) {
      throw new Error(`Source matrix ${matrix.idPrefix} has no document for ${jurisdiction}.`);
    }
    const primary = requireDocument(documents, primaryDocumentId);
    const crossCheckDocumentId =
      matrix.adapter === "kmk-ics" ? matrix.documentId : matrix.crossCheckDocumentId;
    const crossCheckDocument = crossCheckDocumentId
      ? requireDocument(documents, crossCheckDocumentId)
      : undefined;
    return SourceManifestSchema.parse({
      schemaVersion: 1,
      id: `${matrix.idPrefix}-${jurisdiction.toLowerCase()}-${matrix.period.id}`,
      name: `${matrix.name} ${jurisdiction} ${matrix.period.id}`,
      authority: matrix.authority,
      category: matrix.category,
      jurisdiction,
      documentId: primary.id,
      crossCheckDocumentId,
      crossCheckDocument,
      homepageUrl: primary.homepageUrl,
      fetchUrl: primary.fetchUrl,
      format: primary.format,
      adapter: matrix.adapter,
      enabled: matrix.enabled,
      period: matrix.period,
      license: primary.license,
      fetch: primary.fetch,
      freshness: primary.freshness,
    });
  });
}

function requireDocument(
  documents: Map<string, SourceDocument>,
  documentId: string,
): SourceDocument {
  const document = documents.get(documentId);
  if (!document) {
    throw new Error(`Unknown source document: ${documentId}`);
  }
  return document;
}
