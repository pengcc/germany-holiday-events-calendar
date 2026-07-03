import { z } from "zod";
import { IsoDateSchema } from "./schemas";

export const cityEventSources = [
  "messe_berlin",
  "scc_events",
  "berlinale",
  "karneval_der_kulturen",
  "festival_of_lights",
  "csd_berlin",
] as const;

export const cityEventCategories = ["trade_fair", "sport", "major_culture"] as const;
export const cityEventImpactLevels = ["none", "medium", "high"] as const;
export const cityCodes = ["berlin"] as const;

export const CityEventSourceSchema = z.enum(cityEventSources);
export const CityEventCategorySchema = z.enum(cityEventCategories);
export const CityEventImpactLevelSchema = z.enum(cityEventImpactLevels);
export const CityCodeSchema = z.enum(cityCodes);

export type CityEventSource = z.infer<typeof CityEventSourceSchema>;
export type CityEventCategory = z.infer<typeof CityEventCategorySchema>;
export type CityEventImpactLevel = z.infer<typeof CityEventImpactLevelSchema>;
export type CityCode = z.infer<typeof CityCodeSchema>;

export const cityEventCategoryBySource = {
  messe_berlin: "trade_fair",
  scc_events: "sport",
  berlinale: "major_culture",
  karneval_der_kulturen: "major_culture",
  festival_of_lights: "major_culture",
  csd_berlin: "major_culture",
} as const satisfies Record<CityEventSource, CityEventCategory>;

export function getCityEventCategoryForSource(source: CityEventSource): CityEventCategory {
  return cityEventCategoryBySource[source];
}

const CityEventDateSchema = IsoDateSchema.refine(isValidIsoCalendarDate, {
  message: "Expected a valid YYYY-MM-DD calendar date",
});

const CityEventSourceUrlSchema = z
  .url()
  .refine((value) => /^https:\/\//i.test(value), "Expected an HTTPS source URL");

const ImportedCityEventBaseSchema = z
  .object({
    id: z.string().trim().min(1),
    sourceEventKey: z.string().trim().min(1),
    source: CityEventSourceSchema,
    category: CityEventCategorySchema,
    title: z.string().trim().min(1),
    startDate: CityEventDateSchema,
    endDate: CityEventDateSchema,
    city: CityCodeSchema,
    venue: z.string().trim().min(1).optional(),
    sourceUrl: CityEventSourceUrlSchema,
  })
  .strict();

export const ImportedCityEventSchema = ImportedCityEventBaseSchema.superRefine((event, context) => {
  if (event.category !== getCityEventCategoryForSource(event.source)) {
    context.addIssue({
      code: "custom",
      path: ["category"],
      message: `Expected category ${getCityEventCategoryForSource(event.source)} for ${event.source}`,
    });
  }
  if (event.endDate < event.startDate) {
    context.addIssue({
      code: "custom",
      path: ["endDate"],
      message: "Expected endDate to be on or after startDate",
    });
  }
});
export type ImportedCityEvent = z.infer<typeof ImportedCityEventSchema>;

export const CityEventCurationSchema = z
  .object({
    eventId: z.string().trim().min(1),
    impactLevel: CityEventImpactLevelSchema,
    hidden: z.boolean(),
  })
  .strict();
export type CityEventCuration = z.infer<typeof CityEventCurationSchema>;

export const AcceptedCityEventSourceFactSchema = z
  .object({
    schemaVersion: z.literal(1),
    event: ImportedCityEventSchema,
    evidenceCheckedAt: z.iso.datetime(),
    review: z
      .object({
        reviewedAt: z.iso.datetime(),
        reviewer: z.string().trim().min(1),
        rationale: z.string().trim().min(1),
      })
      .strict(),
  })
  .strict();
export type AcceptedCityEventSourceFact = z.infer<typeof AcceptedCityEventSourceFactSchema>;

export const CityEventCurationSetSchema = z
  .object({
    schemaVersion: z.literal(1),
    curations: z.array(CityEventCurationSchema),
  })
  .strict()
  .superRefine((curationSet, context) => {
    addDuplicateIssues(
      curationSet.curations,
      (curation) => curation.eventId,
      context,
      "curations",
      "city event curation id",
    );
  });
export type CityEventCurationSet = z.infer<typeof CityEventCurationSetSchema>;

export const PublishedCityEventSchema = ImportedCityEventBaseSchema.omit({
  sourceEventKey: true,
})
  .extend({
    impactLevel: CityEventImpactLevelSchema,
  })
  .superRefine((event, context) => {
    if (event.category !== getCityEventCategoryForSource(event.source)) {
      context.addIssue({
        code: "custom",
        path: ["category"],
        message: `Expected category ${getCityEventCategoryForSource(event.source)} for ${event.source}`,
      });
    }
    if (event.endDate < event.startDate) {
      context.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "Expected endDate to be on or after startDate",
      });
    }
  });
export type PublishedCityEvent = z.infer<typeof PublishedCityEventSchema>;

export const PublishedCityEventsSchema = z
  .object({
    schemaVersion: z.literal(1),
    records: z.array(PublishedCityEventSchema),
  })
  .strict()
  .superRefine((dataset, context) => {
    const seenIds = new Set<string>();
    dataset.records.forEach((record, index) => {
      if (seenIds.has(record.id)) {
        context.addIssue({
          code: "custom",
          path: ["records", index, "id"],
          message: `Duplicate city event id: ${record.id}`,
        });
      }
      seenIds.add(record.id);
    });
  });
export type PublishedCityEvents = z.infer<typeof PublishedCityEventsSchema>;

export const CityEventSourceCoverageSchema = z
  .object({
    source: CityEventSourceSchema,
    city: CityCodeSchema,
    status: z.enum(["covered", "partial", "manual"]),
    retrievedAt: z.iso.datetime(),
    sourceUpdatedAt: z.iso.datetime().optional(),
    reviewedAt: z.iso.datetime(),
    reviewStatus: z.enum(["current", "review_due", "partial"]),
    reviewPolicyVersion: z.string().trim().min(1),
    stale: z.boolean(),
    publishedRecordCount: z.number().int().nonnegative(),
    warnings: z.array(z.string()),
  })
  .strict();
export type CityEventSourceCoverage = z.infer<typeof CityEventSourceCoverageSchema>;

export const CityEventsManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    datasetVersion: z.string().trim().min(1),
    generatedAt: z.iso.datetime(),
    recordsFile: z.literal("city-events.json"),
    recordsSha256: z.string().regex(/^[a-f0-9]{64}$/),
    recordCount: z.number().int().nonnegative(),
    coverageKind: z.literal("selected_official_sources"),
    coveredCities: z.array(CityCodeSchema),
    coveredSources: z.array(CityEventSourceSchema),
    sourceCoverage: z.array(CityEventSourceCoverageSchema),
    warnings: z.array(z.string()),
  })
  .strict()
  .superRefine((manifest, context) => {
    addDuplicateIssues(
      manifest.coveredSources,
      (source) => source,
      context,
      "coveredSources",
      "covered source",
    );
    addDuplicateIssues(
      manifest.coveredCities,
      (city) => city,
      context,
      "coveredCities",
      "covered city",
    );
    addDuplicateIssues(
      manifest.sourceCoverage,
      (coverage) => `${coverage.source}:${coverage.city}`,
      context,
      "sourceCoverage",
      "source coverage pair",
    );

    const coveredSources = new Set(manifest.coveredSources);
    const coveredCities = new Set(manifest.coveredCities);
    const coverageSources = new Set<CityEventSource>();
    const coverageCities = new Set<CityCode>();

    manifest.sourceCoverage.forEach((coverage, index) => {
      coverageSources.add(coverage.source);
      coverageCities.add(coverage.city);
      if (!coveredSources.has(coverage.source)) {
        context.addIssue({
          code: "custom",
          path: ["sourceCoverage", index, "source"],
          message: `Source coverage source is not declared in coveredSources: ${coverage.source}`,
        });
      }
      if (!coveredCities.has(coverage.city)) {
        context.addIssue({
          code: "custom",
          path: ["sourceCoverage", index, "city"],
          message: `Source coverage city is not declared in coveredCities: ${coverage.city}`,
        });
      }
    });

    manifest.coveredSources.forEach((source, index) => {
      if (!coverageSources.has(source)) {
        context.addIssue({
          code: "custom",
          path: ["coveredSources", index],
          message: `Covered source has no sourceCoverage entry: ${source}`,
        });
      }
    });
    manifest.coveredCities.forEach((city, index) => {
      if (!coverageCities.has(city)) {
        context.addIssue({
          code: "custom",
          path: ["coveredCities", index],
          message: `Covered city has no sourceCoverage entry: ${city}`,
        });
      }
    });

    const coverageRecordCount = manifest.sourceCoverage.reduce(
      (total, coverage) => total + coverage.publishedRecordCount,
      0,
    );
    if (manifest.recordCount !== coverageRecordCount) {
      context.addIssue({
        code: "custom",
        path: ["recordCount"],
        message: `Expected recordCount to equal source coverage count ${coverageRecordCount}`,
      });
    }
  });
export type CityEventsManifest = z.infer<typeof CityEventsManifestSchema>;

function addDuplicateIssues<T>(
  values: T[],
  getKey: (value: T) => string,
  context: z.RefinementCtx,
  path: string,
  label: string,
): void {
  const seenKeys = new Set<string>();
  values.forEach((value, index) => {
    const key = getKey(value);
    if (seenKeys.has(key)) {
      context.addIssue({
        code: "custom",
        path: [path, index],
        message: `Duplicate ${label}: ${key}`,
      });
    }
    seenKeys.add(key);
  });
}

function isValidIsoCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return month >= 1 && month <= 12 && day >= 1 && day <= (daysInMonth[month - 1] ?? 0);
}
