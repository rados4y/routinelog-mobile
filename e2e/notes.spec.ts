import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test('note dates are marked in the daily strip and every calendar, without changing date selection or results', async ({
  page,
}) => {
  await openApp(page);
  const input = page.getByRole('textbox', {
    name: 'Daily note for 2026-11-02',
    exact: true,
  });
  await expect(page.getByTestId('strip-note-2026-11-02')).toHaveCount(0);
  await input.fill('A day to remember');
  await expect(page.getByTestId('strip-note-2026-11-02')).toBeVisible();
  await expect(page.getByTestId('daily-note-2026-11-02')).toContainText(
    'Saved on device',
  );
  await page.reload();
  await expect(page.getByTestId('strip-note-2026-11-02')).toBeVisible();
  await page.getByRole('button', { name: 'Choose date', exact: true }).click();
  await expect(page.getByTestId('calendar-note-2026-11-02')).toBeVisible();
  await page
    .getByRole('button', { name: 'Monday 2 November', exact: true })
    .last()
    .click();
  await expect(input).toHaveValue('A day to remember');
  await page.getByRole('tab', { name: 'Routines', exact: true }).click();
  await page
    .getByTestId('routine-preset-dog')
    .getByRole('button', { name: /^Open calendar:/ })
    .click();
  const day = page
    .getByRole('button', { name: /^Status:.*\b2 November/ })
    .last();
  await day.click();
  await expect(day).toHaveAccessibleName(/\. Done\./);
  await expect(page.getByTestId('calendar-note-2026-11-02')).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('tab', { name: 'Notes', exact: true }).click();
  await page
    .getByRole('button', { name: 'Choose note date', exact: true })
    .click();
  await expect(page.getByTestId('calendar-note-2026-11-02')).toBeVisible();
  await page
    .getByRole('button', { name: 'Monday 2 November', exact: true })
    .click();
  await input.fill(' \n ');
  await expect(page.getByTestId('daily-note-2026-11-02').last()).toContainText(
    'Saved on device',
  );
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('tab', { name: 'Today', exact: true }).click();
  await expect(page.getByTestId('strip-note-2026-11-02')).toHaveCount(0);
  await page.getByRole('button', { name: 'Choose date', exact: true }).click();
  await expect(page.getByTestId('calendar-note-2026-11-02')).toHaveCount(0);
});

test('daily notes edit inline, autosave, remain date-specific and appear in the Notes tab', async ({
  page,
}) => {
  await openApp(page);
  const today = page.getByRole('textbox', {
    name: 'Daily note for 2026-11-02',
    exact: true,
  });
  const noteBounds = await page
    .getByTestId('daily-note-2026-11-02')
    .boundingBox();
  const lastRoutine = await page
    .getByTestId('occurrence-preset-dog')
    .boundingBox();
  expect(noteBounds!.y).toBeGreaterThanOrEqual(
    lastRoutine!.y + lastRoutine!.height,
  );
  await today.fill('Today: a useful conversation.\nA second line 💛');
  await expect(page.getByTestId('daily-note-2026-11-02')).toContainText(
    'Saved on device',
  );
  await page.getByRole('tab', { name: 'Notes', exact: true }).click();
  await expect(
    page.getByRole('tab', { name: 'History', exact: true }),
  ).toHaveCount(0);
  await expect(page.getByTestId('note-entry-2026-11-02')).toContainText(
    'a useful conversation',
  );
  await page
    .getByRole('button', { name: 'Choose note date', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Sunday 1 November', exact: true })
    .click();
  await page
    .getByRole('textbox', { name: 'Daily note for 2026-11-01', exact: true })
    .fill('Yesterday: went walking.');
  await expect(page.getByTestId('daily-note-2026-11-01')).toContainText(
    'Saved on device',
  );
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  const entries = page.locator('[data-testid^="note-entry-"]');
  await expect(entries).toHaveCount(2);
  await expect(entries.first()).toHaveAttribute(
    'data-testid',
    'note-entry-2026-11-02',
  );
  await page.reload();
  await expect(page.getByTestId('note-entry-2026-11-01')).toContainText(
    'went walking',
  );
  await page
    .getByRole('textbox', { name: 'Search daily notes', exact: true })
    .fill('walking');
  await expect(entries).toHaveCount(1);
  await page
    .getByRole('textbox', { name: 'Search daily notes', exact: true })
    .fill('');
  await page
    .getByRole('button', { name: 'Edit note for 2026-11-01', exact: true })
    .click();
  await page
    .getByRole('textbox', { name: 'Daily note for 2026-11-01', exact: true })
    .fill('');
  await expect(page.getByTestId('daily-note-2026-11-01')).toContainText(
    'Saved on device',
  );
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByTestId('note-entry-2026-11-01')).toHaveCount(0);
  await page.getByRole('tab', { name: 'Today', exact: true }).click();
  await expect(today).toHaveValue(
    'Today: a useful conversation.\nA second line 💛',
  );
  await page.screenshot({ path: 'test-results/daily-notes.png' });
});

test('a failed autosave keeps the text visible and can be retried without losing it', async ({
  page,
}) => {
  await openApp(page);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith('@routinelog/v1/note/'))
        throw new Error('Simulated storage failure');
      original.call(this, key, value);
    };
    Object.defineProperty(window, 'restoreNoteStorage', {
      configurable: true,
      value: () => {
        Storage.prototype.setItem = original;
      },
    });
  });
  const input = page.getByRole('textbox', {
    name: 'Daily note for 2026-11-02',
    exact: true,
  });
  await input.fill('Keep this text after a failed save');
  await expect(
    page.getByRole('button', { name: 'Retry saving note', exact: true }),
  ).toBeVisible();
  await expect(input).toHaveValue('Keep this text after a failed save');
  await page.evaluate(() => {
    const state = window as Window & { restoreNoteStorage?: () => void };
    state.restoreNoteStorage?.();
    delete state.restoreNoteStorage;
  });
  await page
    .getByRole('button', { name: 'Retry saving note', exact: true })
    .click();
  await expect(page.getByTestId('daily-note-2026-11-02')).toContainText(
    'Saved on device',
  );
  await page.reload();
  await expect(input).toHaveValue('Keep this text after a failed save');
});
