import type { DiffEntry, HolidayRecord } from "./schemas";

const comparableFields = [
  "jurisdiction",
  "category",
  "scope",
  "regions",
  "startDate",
  "endDate",
  "names",
  "periodId",
] as const;

export function compareRecords(
  beforeRecords: HolidayRecord[],
  afterRecords: HolidayRecord[],
): DiffEntry[] {
  const before = new Map(beforeRecords.map((record) => [record.id, record]));
  const after = new Map(afterRecords.map((record) => [record.id, record]));
  const entries: DiffEntry[] = [];

  for (const record of afterRecords) {
    const previous = before.get(record.id);
    if (!previous) {
      entries.push({
        kind: "added",
        recordId: record.id,
        after: record,
        changedFields: [],
        decisionRequired: false,
      });
      continue;
    }

    const changedFields = comparableFields.filter(
      (field) => JSON.stringify(previous[field]) !== JSON.stringify(record[field]),
    );
    if (changedFields.length > 0) {
      entries.push({
        kind: "changed",
        recordId: record.id,
        before: previous,
        after: record,
        changedFields,
        decisionRequired: changedFields.some((field) =>
          ["startDate", "endDate", "scope", "regions"].includes(field),
        ),
      });
    }
  }

  for (const record of beforeRecords) {
    if (!after.has(record.id)) {
      entries.push({
        kind: "removed",
        recordId: record.id,
        before: record,
        changedFields: [],
        decisionRequired: true,
      });
    }
  }

  return entries.sort(
    (left, right) =>
      (left.after?.startDate ?? left.before?.startDate ?? "").localeCompare(
        right.after?.startDate ?? right.before?.startDate ?? "",
      ) || left.recordId.localeCompare(right.recordId),
  );
}
