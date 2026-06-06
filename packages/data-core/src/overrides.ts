import type { HolidayOverride, HolidayRecord, ValidationIssue } from "./schemas";

export function applyOverrides(
  records: HolidayRecord[],
  overrides: HolidayOverride[],
  sourceId: string,
): { records: HolidayRecord[]; issues: ValidationIssue[]; overrideIds: string[] } {
  const byId = new Map(records.map((record) => [record.id, record]));
  const issues: ValidationIssue[] = [];
  const applied: string[] = [];

  for (const override of overrides.filter((item) => item.sourceId === sourceId)) {
    if (override.operation === "add") {
      if (!override.record) {
        issues.push(overrideIssue(override.id, sourceId, "An add override has no record payload."));
        continue;
      }
      const parsed = override.record as HolidayRecord;
      if (!parsed.id) {
        issues.push(overrideIssue(override.id, sourceId, "An add override has no record ID."));
        continue;
      }
      byId.set(parsed.id, parsed);
      applied.push(override.id);
      continue;
    }

    if (!override.targetRecordId) {
      issues.push(overrideIssue(override.id, sourceId, "The override has no target record ID."));
      continue;
    }

    const current = byId.get(override.targetRecordId);
    if (!current) {
      issues.push(
        overrideIssue(
          override.id,
          sourceId,
          `The target record ${override.targetRecordId} does not exist.`,
        ),
      );
      continue;
    }

    if (override.operation === "remove") {
      byId.delete(override.targetRecordId);
    } else {
      byId.set(override.targetRecordId, {
        ...current,
        ...override.record,
        source: current.source,
      });
    }
    applied.push(override.id);
  }

  return {
    records: [...byId.values()].sort(
      (left, right) =>
        left.startDate.localeCompare(right.startDate) || left.id.localeCompare(right.id),
    ),
    issues,
    overrideIds: applied,
  };
}

function overrideIssue(overrideId: string, sourceId: string, message: string): ValidationIssue {
  return {
    code: "INVALID_OVERRIDE",
    severity: "blocker",
    stage: "overridden",
    sourceId,
    recordId: overrideId,
    message,
    suggestedAction: "Correct the override YAML and rerun validation.",
    decisionRequired: false,
  };
}
