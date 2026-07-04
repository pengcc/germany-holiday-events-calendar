import {
  type CityEventsManifest,
  CityEventsManifestSchema,
  type PublishedCityEvent,
  PublishedCityEventsSchema,
} from "../../../packages/data-core/src/city-events-schemas";

export async function loadPublishedCityEvents(): Promise<{
  records: PublishedCityEvent[];
  manifest: CityEventsManifest;
}> {
  const [recordsResponse, manifestResponse] = await Promise.all([
    fetch("/data/city-events.json"),
    fetch("/data/city-events-manifest.json"),
  ]);
  if (!recordsResponse.ok || !manifestResponse.ok) {
    throw new Error("Published City Events data could not be loaded.");
  }
  return parsePublishedCityEvents(await recordsResponse.json(), await manifestResponse.json());
}

export function parsePublishedCityEvents(
  recordsValue: unknown,
  manifestValue: unknown,
): {
  records: PublishedCityEvent[];
  manifest: CityEventsManifest;
} {
  const recordsResult = PublishedCityEventsSchema.safeParse(recordsValue);
  const manifestResult = CityEventsManifestSchema.safeParse(manifestValue);
  if (!recordsResult.success || !manifestResult.success) {
    throw new Error("Published City Events data is invalid.");
  }
  const records = recordsResult.data.records;
  const manifest = manifestResult.data;
  if (manifest.recordCount !== records.length) {
    throw new Error("Published City Events data does not match its manifest.");
  }
  if (
    records.some(
      (record) =>
        !manifest.coveredCities.includes(record.city) ||
        !manifest.coveredSources.includes(record.source),
    )
  ) {
    throw new Error("Published City Events data exceeds its declared coverage.");
  }
  return { records, manifest };
}
