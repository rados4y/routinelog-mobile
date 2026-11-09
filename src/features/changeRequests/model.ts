import { z } from 'zod';
import { findScreen, guideVersion, repositoryUrl } from './catalog';
export const maxChanges = 20;
export const changeSchema = z.object({
  id: z.string().min(1).max(100),
  screenId: z.string().min(1).max(10),
  sectionId: z.string().min(1).max(10),
  screenName: z.string().min(1).max(100),
  sectionName: z.string().min(1).max(100),
  baseline: z.string().max(2000),
  change: z.string().trim().min(1, 'Describe what should change.').max(2000),
});
export type RequestedChange = z.infer<typeof changeSchema>;
export const changeDraftSchema = z.object({
  version: z.literal(1),
  selectedScreen: z.string().max(10),
  selectedSection: z.string().max(10),
  entry: z.string().max(2000),
  editingId: z.string().max(100).nullable(),
  items: z
    .array(changeSchema)
    .max(maxChanges)
    .refine(
      (items) => new Set(items.map((item) => item.id)).size === items.length,
    ),
  constraints: z.string().max(1000),
  view: z.enum(['compose', 'review']),
});
export type ChangeDraft = z.infer<typeof changeDraftSchema>;
export const emptyChangeDraft = (): ChangeDraft => ({
  version: 1,
  selectedScreen: 'T',
  selectedSection: 'T3',
  entry: '',
  editingId: null,
  items: [],
  constraints: '',
  view: 'compose',
});
export function restoreChangeDraft(raw: unknown): ChangeDraft {
  const draft = changeDraftSchema.parse(raw);
  const screen = findScreen(draft.selectedScreen);
  if (
    !screen ||
    !screen.sections.some((section) => section.id === draft.selectedSection)
  ) {
    draft.selectedScreen = 'T';
    draft.selectedSection = 'T3';
  }
  if (
    draft.editingId &&
    !draft.items.some((item) => item.id === draft.editingId)
  )
    draft.editingId = null;
  if (!draft.items.length) draft.view = 'compose';
  return draft;
}
export function addRequestedChange(
  draft: ChangeDraft,
  id: string,
): ChangeDraft {
  const screen = findScreen(draft.selectedScreen);
  const section = screen?.sections.find(
    (item) => item.id === draft.selectedSection,
  );
  if (!screen || !section) throw new Error('Choose a screen and section.');
  if (!draft.editingId && draft.items.length >= maxChanges)
    throw new Error(`A request can contain up to ${maxChanges} changes.`);
  const item = changeSchema.parse({
    id: draft.editingId ?? id,
    screenId: screen.id,
    sectionId: section.id,
    screenName: screen.name,
    sectionName: section.name,
    baseline: `${section.logic} ${screen.logic}`,
    change: draft.entry,
  });
  const items = draft.editingId
    ? draft.items.map((existing) =>
        existing.id === draft.editingId ? item : existing,
      )
    : [...draft.items, item];
  return { ...draft, items, entry: '', editingId: null };
}
export function generateChangePrompt(
  raw: ChangeDraft,
  appVersion: string,
): string {
  const draft = changeDraftSchema.parse(raw);
  if (!draft.items.length) throw new Error('Add at least one change first.');
  return [
    'Update RoutineLog.',
    `Repository: ${repositoryUrl}`,
    `App version: ${appVersion}. Screen guide: ${guideVersion}.`,
    '',
    ...draft.items.flatMap((item, index) => [
      `${index + 1}. ${item.screenName} · ${item.sectionId} · ${item.sectionName}`,
      `Current behavior: ${item.baseline}`,
      `Requested change: ${item.change}`,
      '',
    ]),
    ...(draft.constraints.trim()
      ? ['Constraints / keep unchanged:', draft.constraints.trim(), '']
      : []),
    'Inspect the latest main branch and implement these changes. Preserve existing routines, results, notes and Notion sync. Run typecheck, lint, tests and relevant interaction checks; fix failures. Commit, push, create/update a PR and wait for green GitHub Actions. Deploy through EAS Update when runtime-compatible; build Android only when the native runtime changes. Report the result and any necessary Android action. Handle technical steps yourself.',
  ].join('\n');
}
