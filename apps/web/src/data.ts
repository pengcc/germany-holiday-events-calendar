import {
  type HolidayRecord,
  type PublishedDatasetManifest,
  PublishedDatasetManifestSchema,
  PublishedHolidayRecordsSchema,
} from "@hsg/data-core/schemas";

export async function loadPublishedData(): Promise<{
  records: HolidayRecord[];
  manifest: PublishedDatasetManifest;
}> {
  const [recordsResponse, manifestResponse] = await Promise.all([
    fetch("/data/holidays.json"),
    fetch("/data/manifest.json"),
  ]);
  if (!recordsResponse.ok || !manifestResponse.ok) {
    throw new Error("Published holiday data could not be loaded.");
  }
  return parsePublishedData(await recordsResponse.json(), await manifestResponse.json());
}

export function parsePublishedData(
  recordsValue: unknown,
  manifestValue: unknown,
): {
  records: HolidayRecord[];
  manifest: PublishedDatasetManifest;
} {
  const recordsResult = PublishedHolidayRecordsSchema.safeParse(recordsValue);
  const manifestResult = PublishedDatasetManifestSchema.safeParse(manifestValue);
  if (!recordsResult.success || !manifestResult.success) {
    throw new Error("Published holiday data is invalid.");
  }
  if (manifestResult.data.recordCount !== recordsResult.data.records.length) {
    throw new Error("Published holiday data does not match its manifest.");
  }
  return { records: recordsResult.data.records, manifest: manifestResult.data };
}
