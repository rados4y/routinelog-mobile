export const guideVersion = '2026-11-16';
export const repositoryUrl = 'https://github.com/rados4y/routinelog-mobile';
export interface GuideSection {
  id: string;
  name: string;
  logic: string;
}
export interface GuideScreen {
  id: string;
  name: string;
  purpose: string;
  logic: string;
  image?: string;
  sections: GuideSection[];
}
const section = (id: string, name: string, logic: string): GuideSection => ({
  id,
  name,
  logic,
});
export const screens: GuideScreen[] = [
  {
    id: 'T',
    name: 'Today',
    image: 'today',
    purpose:
      "The selected day's routines, one-off tasks and editable daily note.",
    logic:
      'The schedule and date range determine the plan. Status cycles unchecked → done → not done → skipped → unchecked. Future results are blocked; future notes are allowed. Required steps open the checklist before completion.',
    sections: [
      section(
        'T1',
        'Toolbar',
        'Settings, search, category filter, date picker, widget and Notion shortcuts.',
      ),
      section(
        'T2',
        'Date strip',
        'Select a date to change all three sections. Blue note, red missed-task and green completed-task markers can coexist in the strip and calendar. Unfinished tasks become missed only after their assigned day ends.',
      ),
      section(
        'T3',
        'Routine rows',
        'Routines section has a heading, done/total count and +. Dense rows and reduced section spacing keep more content visible. Rows expand for quick name editing and additional actions; the separate status control cycles results.',
      ),
      section(
        'T4',
        'Expanded details',
        'Inline name edit, frequency, time, category, period progress and description, with Save/Cancel, Pause and full editor actions.',
      ),
      section(
        'T5',
        'Daily note',
        'Daily note section has a heading and + that edits the same single note. Tap its preview to expand the inline autosave editor; clearing needs confirmation. Drafts and save failures remain protected above the keyboard.',
      ),
      section(
        'T6',
        'Add task (+)',
        'Each of Routines, Tasks and Daily note has its own +. Tasks + opens an inline description-only composer for the selected day (today/future); there is no global Today FAB.',
      ),
      section(
        'T7',
        'Daily tasks',
        'Single-line task rows expand into a one-line editor and one action row: Save/Close, confirmed Delete and Postpone. Full descriptions are preserved. Postpone moves the same unfinished task one assigned day forward, offers guarded Undo and syncs Date to Notion. Tasks never roll over automatically or change routine statistics. Future completion is blocked.',
      ),
    ],
  },
  {
    id: 'R',
    name: 'Routines',
    image: 'routines',
    purpose: 'All routines, recent results and management.',
    logic:
      'Pausing or retiring a routine preserves recorded results. Manual calendar entries can be outside the schedule without changing future planning.',
    sections: [
      section(
        'R1',
        'Toolbar',
        'Settings, name search, category filter, paused-only toggle and Notion shortcut.',
      ),
      section(
        'R2',
        'Routine cards',
        'Name, category icon, frequency badge and paused state.',
      ),
      section(
        'R3',
        'Week strip',
        'Seven days through today; tap a date to cycle that routine’s result.',
      ),
      section(
        'R4',
        'Card footer',
        '30-day streak/consistency, calendar, routine insights and direct edit icons.',
      ),
      section(
        'R5',
        'Routine insights sheet',
        '30-day result counts and consistency, plus seven-day activity.',
      ),
      section(
        'R6',
        'Add routine (+)',
        'Creates a new routine through the editor.',
      ),
    ],
  },
  {
    id: 'E',
    name: 'Routine editor',
    image: 'editor',
    purpose: 'Create or edit a routine definition.',
    logic:
      'Save validates and persists the form. Cancel discards form edits. Deletion requires confirmation and keeps past results.',
    sections: [
      section('E1', 'Identity', 'Name, emoji and category.'),
      section(
        'E2',
        'Frequency and time',
        'Frequency picker and HH:MM time. Time orders the plan; reminders are not enabled.',
      ),
      section(
        'E3',
        'Description and active state',
        'Reusable instruction/note and pause/resume switch.',
      ),
      section(
        'E4',
        'Checklist',
        'Add or remove up to 30 steps. Every new completion requires all required steps.',
      ),
      section(
        'E6',
        'Date range',
        'Inclusive start and optional end date. Existing results are kept outside a revised range.',
      ),
      section(
        'E5',
        'Save, cancel and delete',
        'Persist valid edits, discard unsaved edits or confirm retirement.',
      ),
    ],
  },
  {
    id: 'F',
    name: 'Frequency',
    image: 'frequency',
    purpose: 'Choose when a routine is due.',
    logic:
      'Confirm applies to the editor; Save routine persists it. Flexible schedules stay available until due work is resolved. Period targets are assessed after the window ends, without daily failures during an open window.',
    sections: [
      section(
        'F1',
        'Frequency mode',
        'Daily, weekdays, month days/Last, ordinal weekdays, yearly dates, N per week/month or every N days.',
      ),
      section(
        'F2',
        'Frequency options',
        'Day grid, flexible toggle, target count or interval and anchor date.',
      ),
      section(
        'F3',
        'Confirm and cancel',
        'Apply the choice to the form or leave its previous frequency unchanged.',
      ),
    ],
  },
  {
    id: 'C',
    name: 'Routine calendar',
    image: 'calendar',
    purpose: 'View and edit dated routine results.',
    logic:
      'Tap a day to cycle its result directly. Future results are blocked. Past/today manual entries do not change the schedule. This calendar edits results; the general date picker only selects a day.',
    sections: [
      section('C1', 'Month navigation', 'Previous/next month and title.'),
      section(
        'C2',
        'Day grid',
        'Due dates and result colors; direct status cycling on day taps.',
      ),
      section(
        'C3',
        'Date context',
        'Selected date, result and blocked-entry explanation, if any.',
      ),
    ],
  },
  {
    id: 'K',
    name: 'Completion checklist',
    image: 'checklist',
    purpose: 'Confirm every required step before completing a routine.',
    logic:
      'Each new completion starts fresh. Cancel leaves the result unchanged. Definitions sync with Notion; confirmation evidence stays local.',
    sections: [
      section(
        'K1',
        'Step list',
        'Check each step; checked/total progress updates.',
      ),
      section(
        'K2',
        'Completion actions',
        'Confirm unlocks after all steps. Not done, Skip and Cancel are also available.',
      ),
    ],
  },
  {
    id: 'N',
    name: 'Notes',
    image: 'notes',
    purpose: 'Browse and edit daily notes.',
    logic:
      'One note per date, including past and future dates, up to 20,000 characters. Clearing text removes it from the list and syncs the clear. Failed saves retain the draft for retry. Notes do not affect statistics.',
    sections: [
      section(
        'N1',
        'Toolbar',
        'Settings, today’s note, note-date calendar and Notion shortcut.',
      ),
      section('N2', 'Search', 'Matches note text or date.'),
      section(
        'N3',
        'Note list',
        'Newest dates first, content previews and edit icons.',
      ),
      section(
        'N4',
        'Note editor sheet',
        'The same date-bound autosave editor as Today, with keyboard-aware placement.',
      ),
    ],
  },
  {
    id: 'I',
    name: 'Insights',
    image: 'insights',
    purpose: 'Overall activity and consistency.',
    logic:
      'Results update statistics immediately. Consistency = done ÷ (done + skipped + missed + today’s pending fixed deadlines). Activity uses the assigned date. Open flexible targets do not create daily failures.',
    sections: [
      section(
        'I1',
        'Your last week',
        'Seven days through today: done, skipped and not-done counts.',
      ),
      section(
        'I2',
        'Activity',
        'Seven bars showing daily completed-routine counts.',
      ),
      section(
        'I3',
        'Consistency',
        'Percentage ring for applicable results/deadlines.',
      ),
    ],
  },
  {
    id: 'S',
    name: 'Notion',
    purpose:
      'Connect and synchronize routine definitions, results, daily tasks and notes.',
    logic:
      'Sync runs on app open, after saves and every minute while open. Offline changes stay local. Conflicts ask which version to keep. First sync migrates existing definitions; monthly-column removal never deletes a routine.',
    sections: [
      section(
        'S1',
        'Master Routines database',
        'One row per routine: stable ID, frequency, inclusive dates, full description, checklist, active/archive flags and optional target/unit.',
      ),
      section(
        'S2',
        'Connection and sync',
        'Connect/disconnect, last sync, Sync now, errors and conflict choices.',
      ),
      section(
        'S3',
        'Monthly tables',
        'Days are rows; routine columns are generated from date ranges. Daily results and Notes sync both ways. Retired/history columns are preserved.',
      ),
      section(
        'S4',
        'Tasks database',
        'One row per one-off task: Description, Date, Done, stable Task ID and Archived. Edits and deletions sync both ways; no task columns are added to monthly tables. New Notion rows default to their creation day when Date is empty.',
      ),
    ],
  },
  {
    id: 'W',
    name: 'Android widget',
    purpose: 'Current-day actions and date browsing from the home screen.',
    logic:
      'The light panel fills its allocated height. Date navigation updates one instance once. Statuses outside today are read-only; the heading returns to today. Adding tasks is allowed for today/future dates. Stale taps refresh without recording an old result. Requires the Android APK.',
    sections: [
      section(
        'W1',
        'Header',
        'Compact current-date header with previous/next arrows only; no date strip or legend. Tap the title to return to today. Each instance resets after midnight. Three section headings have their own + actions that open the app.',
      ),
      section(
        'W2',
        'Routine rows',
        'Routines heading with +. Tap a row to expand Edit in app; the separate status control cycles today only. Required checklists open the app for confirmation.',
      ),
      section(
        'W3',
        'Daily note',
        'Daily note heading with + and compact text preview. Tap to expand Edit in app; + and Edit open the same selected-day note. Saved changes refresh the preview.',
      ),
      section(
        'W4',
        'Task rows',
        'Tasks heading with + opens the app composer for today/future dates. Rows expand Edit in app and, today only, Postpone for unfinished tasks. Status icons toggle directly today; Postpone moves the same task one day forward and offers guarded Undo.',
      ),
    ],
  },
  {
    id: 'D',
    name: 'Task editor',
    purpose: 'Add or edit one ad-hoc task.',
    logic:
      'One description field, no title, date input, time, recurrence or checklist. The day comes from Today or the widget. Save persists locally and schedules Notion sync. Cancel keeps the previous record; discarding typed text requires confirmation.',
    sections: [
      section(
        'D1',
        'Description',
        'Required single-line text field up to 2,000 characters; keyboard-ready on opening, with horizontal scrolling for long descriptions.',
      ),
      section(
        'D2',
        'Save and delete',
        'One compact action row: Save, Close icon, Postpone and Delete icon. Deletion and discarding edits still require confirmation. Postpone changes the assigned date by one day with guarded Undo; there is no automatic carryover.',
      ),
    ],
  },
  {
    id: 'P',
    name: 'Settings',
    purpose: 'Configuration and application tools.',
    logic:
      'Settings is opened using the gear in the main screen toolbar. The four bottom tabs remain Today, Routines, Notes and Insights.',
    sections: [
      section(
        'P1',
        'Request changes',
        'Opens this interactive guide and persistent change-request draft.',
      ),
      section(
        'P2',
        'Notion integration',
        'Opens the existing connection and synchronization page.',
      ),
    ],
  },
  {
    id: 'G',
    name: 'Request changes',
    purpose: 'Collect screen-specific changes and prepare one prompt.',
    logic:
      'Choose a screen and section, read the current behavior, add/edit/remove requested changes, then generate and copy the prompt into ChatGPT. The draft stays on this device. Nothing is submitted automatically.',
    sections: [
      section(
        'G1',
        'Screen and section guide',
        'Named sections, concise logic and optional reference layouts.',
      ),
      section(
        'G2',
        'Change editor and list',
        'A desired change per section, persistent draft, edit/remove and optional constraints.',
      ),
      section(
        'G3',
        'Generated prompt',
        'Repository, app/guide version, targets, current behavior, requested changes and implementation workflow. Copy it and paste into ChatGPT.',
      ),
    ],
  },
  {
    id: 'X',
    name: 'Other / new feature',
    purpose: 'Request something that has no existing screen or section.',
    logic:
      'Explain the desired behavior and where it should appear. Codex reviews the existing app before choosing the implementation.',
    sections: [
      section(
        'X1',
        'New screen or behavior',
        'Describe the new capability, expected interactions and any constraints.',
      ),
    ],
  },
];
export const findScreen = (id: string) =>
  screens.find((screen) => screen.id === id);
export const findSection = (id: string) =>
  screens
    .flatMap((screen) => screen.sections)
    .find((section) => section.id === id);
