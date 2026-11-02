import type { ChecklistItem, ChecklistResult } from './models';

export class ChecklistIncompleteError extends Error {
  constructor() {
    super(
      'Potwierdź wszystkie pozycje aktualnej listy kroków przed oznaczeniem wykonania.',
    );
    this.name = 'ChecklistIncompleteError';
  }
}
export function checklistIsComplete(
  items: ChecklistItem[] = [],
  results: ChecklistResult[] = [],
): boolean {
  return (
    results.length === items.length &&
    new Set(results.map((item) => item.id)).size === items.length &&
    items.every((item) =>
      results.some(
        (result) =>
          result.id === item.id && result.text === item.text && result.checked,
      ),
    )
  );
}
export function requireCompleteChecklist(
  items: ChecklistItem[] = [],
  results: ChecklistResult[] = [],
): ChecklistResult[] {
  if (!items.length) return [];
  if (!checklistIsComplete(items, results))
    throw new ChecklistIncompleteError();
  return items.map((item) => ({ ...item, checked: true }));
}
