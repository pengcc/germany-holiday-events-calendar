import type { HolidayRecord, PublishedDatasetManifest } from "@hsg/data-core";

export interface PublishedRecords {
  schemaVersion: 1;
  records: HolidayRecord[];
}

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
  const records = (await recordsResponse.json()) as PublishedRecords;
  const manifest = (await manifestResponse.json()) as PublishedDatasetManifest;
  return { records: records.records, manifest };
}
