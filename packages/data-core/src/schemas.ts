import { z } from "zod";

export const stateCodes = [
  "DE-BW",
  "DE-BY",
  "DE-BE",
  "DE-BB",
  "DE-HB",
  "DE-HH",
  "DE-HE",
  "DE-MV",
  "DE-NI",
  "DE-NW",
  "DE-RP",
  "DE-SL",
  "DE-SN",
  "DE-ST",
  "DE-SH",
  "DE-TH",
] as const;

export const StateCodeSchema = z.enum(stateCodes);
export type StateCode = z.infer<typeof StateCodeSchema>;

export const IsoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a YYYY-MM-DD all-day date");

export const LocalizedNamesSchema = z.object({
  de: z.string().min(1),
  en: z.string().min(1),
  zh: z.string().min(1),
});

export const PeriodSchema = z.object({
  kind: z.enum(["schoolYear", "calendarYear"]),
  id: z.string().min(1),
  startDate: IsoDateSchema,
  endDate: IsoDateSchema,
});
export type Period = z.infer<typeof PeriodSchema>;

export const RedistributionSchema = z.enum(["allowed", "prohibited", "unknown"]);

export const FetchPolicySchema = z.object({
  expectedContentTypes: z.array(z.string().min(1)).min(1),
  allowedHosts: z.array(z.string().min(1)).min(1),
  timeoutMs: z.number().int().positive().max(120_000),
  maxBytes: z.number().int().positive().max(20_000_000),
  maxRedirects: z.number().int().min(0).max(5),
});

export const FreshnessSchema = z.object({
  retrievalCadenceDays: z.number().int().positive(),
  reviewBy: IsoDateSchema,
});

export const SourceDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  homepageUrl: z.url(),
  fetchUrl: z.url(),
  format: z.enum(["ics", "pdf", "html", "json"]),
  license: z.object({
    note: z.string().min(1),
    redistribution: RedistributionSchema,
  }),
  fetch: FetchPolicySchema,
  freshness: FreshnessSchema,
});
export type SourceDocument = z.infer<typeof SourceDocumentSchema>;

export const SourceManifestSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  authority: z.enum(["official", "cross-check"]),
  category: z.enum(["school", "public"]),
  jurisdiction: StateCodeSchema,
  documentId: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  crossCheckDocumentId: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  crossCheckDocument: SourceDocumentSchema.optional(),
  homepageUrl: z.url(),
  fetchUrl: z.url(),
  format: z.enum(["ics", "pdf", "html", "json"]),
  adapter: z.enum(["kmk-ics", "kmk-pdf", "public-rules", "holiday-json"]),
  enabled: z.boolean().default(true),
  period: PeriodSchema,
  license: z.object({
    note: z.string().min(1),
    redistribution: RedistributionSchema,
  }),
  fetch: FetchPolicySchema,
  freshness: FreshnessSchema,
});
export type SourceManifest = z.infer<typeof SourceManifestSchema>;

export const SourceMatrixSchema = z
  .object({
    schemaVersion: z.literal(1),
    idPrefix: z.string().regex(/^[a-z0-9-]+$/),
    name: z.string().min(1),
    authority: z.enum(["official", "cross-check"]),
    category: z.enum(["school", "public"]),
    adapter: z.enum(["kmk-ics", "kmk-pdf", "public-rules", "holiday-json"]),
    documentId: z
      .string()
      .regex(/^[a-z0-9-]+$/)
      .optional(),
    documents: z.record(StateCodeSchema, z.string().regex(/^[a-z0-9-]+$/)).optional(),
    crossCheckDocumentId: z
      .string()
      .regex(/^[a-z0-9-]+$/)
      .optional(),
    crossCheckDocuments: z.record(StateCodeSchema, z.string().regex(/^[a-z0-9-]+$/)).optional(),
    enabled: z.boolean().default(true),
    period: PeriodSchema,
    jurisdictions: z.union([z.literal("all"), z.array(StateCodeSchema).min(1)]),
  })
  .refine((matrix) => Boolean(matrix.documentId || matrix.documents), {
    message: "A source matrix requires documentId or jurisdiction-specific documents.",
  });
export type SourceMatrix = z.infer<typeof SourceMatrixSchema>;

export const SourceCatalogSchema = z.object({
  schemaVersion: z.literal(1),
  documents: z.array(SourceDocumentSchema),
  matrices: z.array(SourceMatrixSchema),
});
export type SourceCatalog = z.infer<typeof SourceCatalogSchema>;

export const ReleaseConfigSchema = z.object({
  schemaVersion: z.literal(1),
  targetYears: z.array(z.number().int().min(2000).max(2200)).min(1),
  jurisdictions: z.array(StateCodeSchema).min(1),
  categories: z.array(z.enum(["school", "public"])).min(1),
});
export type ReleaseConfig = z.infer<typeof ReleaseConfigSchema>;

export const HolidayRecordSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  jurisdiction: StateCodeSchema,
  category: z.enum(["school", "public"]),
  scope: z.enum(["statewide", "regional", "schoolSpecific"]),
  regions: z.array(z.string().min(1)).default([]),
  startDate: IsoDateSchema,
  endDate: IsoDateSchema,
  names: LocalizedNamesSchema,
  periodId: z.string().min(1),
  source: z.object({
    sourceId: z.string().min(1),
    sourceEventId: z.string().optional(),
  }),
});
export type HolidayRecord = z.infer<typeof HolidayRecordSchema>;

export const SourceFingerprintSchema = z.object({
  sha256: z.string().length(64),
  bytes: z.number().int().nonnegative(),
  contentType: z.string(),
  retrievedAt: z.iso.datetime(),
  etag: z.string().optional(),
  lastModified: z.string().optional(),
  finalUrl: z.url(),
  documents: z
    .array(
      z.object({
        documentId: z.string().min(1),
        sha256: z.string().length(64),
        bytes: z.number().int().nonnegative(),
        contentType: z.string(),
        finalUrl: z.url(),
      }),
    )
    .optional(),
});
export type SourceFingerprint = z.infer<typeof SourceFingerprintSchema>;

export const ValidationIssueSchema = z.object({
  code: z.string().min(1),
  severity: z.enum(["info", "warning", "error", "blocker"]),
  stage: z.enum([
    "fetched",
    "normalized",
    "overridden",
    "validated",
    "compared",
    "reviewed",
    "published",
  ]),
  sourceId: z.string().optional(),
  jurisdiction: StateCodeSchema.optional(),
  periodId: z.string().optional(),
  recordId: z.string().optional(),
  message: z.string().min(1),
  expected: z.string().optional(),
  actual: z.string().optional(),
  suggestedAction: z.string().min(1),
  decisionRequired: z.boolean().default(false),
  technicalDetails: z.string().optional(),
});
export type ValidationIssue = z.infer<typeof ValidationIssueSchema>;

export const OverrideSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().regex(/^[a-z0-9-]+$/),
  sourceId: z.string().min(1),
  operation: z.enum(["add", "update", "remove"]),
  targetRecordId: z.string().optional(),
  record: HolidayRecordSchema.partial().optional(),
  rationale: z.string().min(1),
  evidenceUrl: z.url(),
  createdAt: z.iso.datetime(),
  reviewBy: IsoDateSchema,
});
export type HolidayOverride = z.infer<typeof OverrideSchema>;

export const DiffEntrySchema = z.object({
  kind: z.enum(["added", "removed", "changed"]),
  recordId: z.string(),
  before: HolidayRecordSchema.optional(),
  after: HolidayRecordSchema.optional(),
  changedFields: z.array(z.string()).default([]),
  decisionRequired: z.boolean(),
});
export type DiffEntry = z.infer<typeof DiffEntrySchema>;

export const BatchReviewDecisionSchema = z.object({
  schemaVersion: z.literal(1),
  runId: z.string().min(1),
  sourceId: z.string().min(1),
  jurisdiction: StateCodeSchema,
  periodId: z.string().min(1),
  decision: z.enum(["approved", "rejected"]),
  reviewer: z.string().min(1),
  reviewedAt: z.iso.datetime(),
  notes: z.string().default(""),
  fingerprintSha256: z.string().length(64),
  overrideIds: z.array(z.string()).default([]),
  resolutionIds: z.array(z.string()).default([]),
});
export type BatchReviewDecision = z.infer<typeof BatchReviewDecisionSchema>;

export const DecisionResolutionSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().regex(/^[a-zA-Z0-9-]+$/),
  runId: z.string().min(1),
  sourceId: z.string().min(1),
  issueKey: z.string().min(1),
  resolution: z.enum(["accept-source-change", "override", "reject"]),
  rationale: z.string().min(1),
  evidenceUrl: z.url(),
  resolvedBy: z.string().min(1),
  resolvedAt: z.iso.datetime(),
});
export type DecisionResolution = z.infer<typeof DecisionResolutionSchema>;

export const AcceptedBatchSchema = z.object({
  schemaVersion: z.literal(1),
  source: SourceManifestSchema,
  fingerprint: SourceFingerprintSchema,
  records: z.array(HolidayRecordSchema),
  review: BatchReviewDecisionSchema,
});
export type AcceptedBatch = z.infer<typeof AcceptedBatchSchema>;

export const PublishedDatasetManifestSchema = z.object({
  schemaVersion: z.literal(1),
  datasetVersion: z.string().min(1),
  generatedAt: z.iso.datetime(),
  recordsFile: z.string().min(1),
  recordsSha256: z.string().length(64),
  recordCount: z.number().int().nonnegative(),
  targetYears: z.array(z.number().int()).default([]),
  jurisdictions: z.array(StateCodeSchema).default([]),
  categories: z.array(z.enum(["school", "public"])).default([]),
  regionalRecordCount: z.number().int().nonnegative().default(0),
  coverageMatrix: z
    .array(
      z.object({
        jurisdiction: StateCodeSchema,
        year: z.number().int(),
        category: z.enum(["school", "public"]),
        covered: z.boolean(),
        sourceIds: z.array(z.string()),
      }),
    )
    .default([]),
  coverage: z.array(
    z.object({
      sourceId: z.string(),
      jurisdiction: StateCodeSchema,
      periodId: z.string(),
      reviewBy: IsoDateSchema,
      stale: z.boolean(),
    }),
  ),
  warnings: z.array(z.string()),
  overrideIds: z.array(z.string()),
});
export type PublishedDatasetManifest = z.infer<typeof PublishedDatasetManifestSchema>;

export const RunStageSchema = z.enum([
  "fetched",
  "normalized",
  "overridden",
  "validated",
  "compared",
  "reviewed",
  "published",
]);
export type RunStage = z.infer<typeof RunStageSchema>;

export const SourceRunSchema = z.object({
  sourceId: z.string(),
  jurisdiction: StateCodeSchema,
  periodId: z.string(),
  status: z.enum(["completed", "blocked"]),
  stage: RunStageSchema,
  fingerprint: SourceFingerprintSchema.optional(),
  recordCount: z.number().int().nonnegative().default(0),
  issueCount: z.number().int().nonnegative().default(0),
  decisionRequiredCount: z.number().int().nonnegative().default(0),
  error: z.string().optional(),
});
export type SourceRun = z.infer<typeof SourceRunSchema>;

export const DataRunSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  parentRunId: z.string().optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  stage: RunStageSchema,
  sources: z.array(SourceRunSchema),
});
export type DataRun = z.infer<typeof DataRunSchema>;

export const SourceRunArtifactsSchema = z.object({
  schemaVersion: z.literal(1),
  source: SourceManifestSchema,
  fingerprint: SourceFingerprintSchema,
  records: z.array(HolidayRecordSchema),
  issues: z.array(ValidationIssueSchema),
  diff: z.array(DiffEntrySchema),
  overrideIds: z.array(z.string()),
});
export type SourceRunArtifacts = z.infer<typeof SourceRunArtifactsSchema>;
