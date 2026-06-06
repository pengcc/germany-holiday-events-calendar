import { compareDates } from "./dates";
import {
  type HolidayRecord,
  HolidayRecordSchema,
  type SourceManifest,
  type ValidationIssue,
} from "./schemas";

export function validateRecords(
  records: HolidayRecord[],
  source: SourceManifest,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const ids = new Set<string>();
  const semanticKeys = new Set<string>();

  if (records.length === 0) {
    issues.push({
      code: "EMPTY_BATCH",
      severity: "blocker",
      stage: "validated",
      sourceId: source.id,
      jurisdiction: source.jurisdiction,
      periodId: source.period.id,
      message: "The source produced no holiday records.",
      expected: "At least one record",
      actual: "0 records",
      suggestedAction: "Inspect the raw source and parser output before approving this batch.",
      decisionRequired: false,
    });
  }

  for (const record of records) {
    const parsed = HolidayRecordSchema.safeParse(record);
    if (!parsed.success) {
      issues.push({
        code: "SCHEMA_INVALID",
        severity: "blocker",
        stage: "validated",
        sourceId: source.id,
        jurisdiction: source.jurisdiction,
        periodId: source.period.id,
        recordId: record.id,
        message: "A normalized record does not match the persisted data contract.",
        actual: parsed.error.issues.map((item) => item.message).join("; "),
        suggestedAction: "Fix the adapter or create a reviewed override, then rerun validation.",
        decisionRequired: false,
      });
      continue;
    }

    if (compareDates(record.startDate, record.endDate) > 0) {
      issues.push({
        code: "INVALID_DATE_RANGE",
        severity: "blocker",
        stage: "validated",
        sourceId: source.id,
        jurisdiction: source.jurisdiction,
        periodId: source.period.id,
        recordId: record.id,
        message: "A holiday starts after its inclusive end date.",
        expected: "startDate <= endDate",
        actual: `${record.startDate} > ${record.endDate}`,
        suggestedAction: "Inspect DTEND handling or correct the record with a reviewed override.",
        decisionRequired: false,
      });
    }

    if (record.jurisdiction !== source.jurisdiction || record.category !== source.category) {
      issues.push({
        code: "SOURCE_SCOPE_MISMATCH",
        severity: "blocker",
        stage: "validated",
        sourceId: source.id,
        jurisdiction: source.jurisdiction,
        periodId: source.period.id,
        recordId: record.id,
        message: "A record falls outside the state or category declared by its source.",
        suggestedAction: "Correct the source manifest or adapter mapping.",
        decisionRequired: false,
      });
    }

    if (ids.has(record.id)) {
      issues.push({
        code: "DUPLICATE_ID",
        severity: "blocker",
        stage: "validated",
        sourceId: source.id,
        jurisdiction: source.jurisdiction,
        periodId: source.period.id,
        recordId: record.id,
        message: "Multiple normalized records share the same stable ID.",
        suggestedAction: "Fix the adapter stable-ID rule before approval.",
        decisionRequired: false,
      });
    }
    ids.add(record.id);

    const semanticKey = [
      record.jurisdiction,
      record.category,
      record.scope,
      record.startDate,
      record.endDate,
      record.names.de,
    ].join("|");
    if (semanticKeys.has(semanticKey)) {
      issues.push({
        code: "DUPLICATE_HOLIDAY",
        severity: "error",
        stage: "validated",
        sourceId: source.id,
        jurisdiction: source.jurisdiction,
        periodId: source.period.id,
        recordId: record.id,
        message: "The batch contains a duplicate holiday range.",
        suggestedAction: "Inspect the source events and remove the duplicate through the adapter.",
        decisionRequired: false,
      });
    }
    semanticKeys.add(semanticKey);

    if (
      compareDates(record.endDate, source.period.startDate) < 0 ||
      compareDates(record.startDate, source.period.endDate) > 0
    ) {
      issues.push({
        code: "OUTSIDE_DECLARED_PERIOD",
        severity: "warning",
        stage: "validated",
        sourceId: source.id,
        jurisdiction: source.jurisdiction,
        periodId: source.period.id,
        recordId: record.id,
        message: "A holiday is outside the period declared in the source manifest.",
        expected: `${source.period.startDate} to ${source.period.endDate}`,
        actual: `${record.startDate} to ${record.endDate}`,
        suggestedAction: "Confirm the source period or update the manifest before its review date.",
        decisionRequired: false,
      });
    }
  }

  return issues;
}

export function hasBlockingIssues(issues: ValidationIssue[]): boolean {
  return issues.some((issue) => issue.severity === "blocker");
}
