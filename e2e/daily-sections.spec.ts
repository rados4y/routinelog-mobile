import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test('unsubmitted task descriptions stay on their selected date through navigation', async ({
  page,
}) => {
  await openApp(page);
  await page.getByRole('button', { name: 'Add task', exact: true }).click();
  const input = page.getByRole('textbox', {
    name: 'Task description',
    exact: true,
  });
  await input.fill('Today draft');
  await page
    .getByRole('button', { name: 'Tuesday 3 November', exact: true })
    .click();
  await page.getByRole('button', { name: 'Add task', exact: true }).click();
  await expect(input).toHaveValue('');
  await input.fill('Tomorrow draft');
  await page
    .getByRole('button', { name: 'Monday 2 November', exact: true })
    .click();
  await page.getByRole('button', { name: 'Add task', exact: true }).click();
  await expect(input).toHaveValue('Today draft');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(
    page.getByText('Discard unsaved task changes?', { exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Discard changes', exact: true })
    .click();
  await page.getByRole('button', { name: 'Add task', exact: true }).click();
  await expect(input).toHaveValue('');
});

test('matching sections expand inline; postpone moves one record, Undo and day markers react', async ({
  page,
}) => {
  await openApp(page);
  for (const heading of ['Routines', 'Tasks', 'Daily note'])
    await expect(
      page.getByRole('heading', { name: heading, exact: true }),
    ).toBeVisible();
  for (const label of ['Add routine', 'Add task', 'Add or edit daily note'])
    await expect(
      page.getByRole('button', { name: label, exact: true }),
    ).toBeVisible();
  await page.getByRole('button', { name: 'Add task', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Task description', exact: true })
    .fill('Postpone me');
  await page
    .getByRole('button', { name: 'Add task', exact: true })
    .last()
    .click();
  const row = page
    .locator('[data-testid^="task-"]')
    .filter({ hasText: 'Postpone me' });
  const taskId = await row.getAttribute('data-testid');
  await row.getByRole('button').first().click();
  await page.getByRole('button', { name: /^Postpone →/ }).click();
  await expect(row).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Tuesday 3 November', exact: true })
    .click();
  await expect(row).toHaveCount(1);
  await expect(row).toHaveAttribute('data-testid', taskId!);
  await expect(row.getByRole('checkbox')).toBeDisabled();
  await page
    .getByRole('button', { name: 'Undo postpone', exact: true })
    .click();
  await expect(row).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Monday 2 November', exact: true })
    .click();
  await expect(row).toHaveCount(1);
  await row.getByRole('checkbox').check();
  await expect(page.getByTestId('strip-task-done-2026-11-02')).toBeVisible();
  await page
    .getByRole('button', { name: 'Add or edit daily note', exact: true })
    .click();
  await page
    .getByRole('textbox', { name: 'Daily note for 2026-11-02', exact: true })
    .fill('Marked day');
  await expect(page.getByTestId('strip-note-2026-11-02')).toBeVisible();
  await expect(page.getByTestId('strip-task-missed-2026-11-02')).toHaveCount(0);
  await page.getByRole('button', { name: 'Add task', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Task description', exact: true })
    .fill('Unfinished task');
  await page
    .getByRole('button', { name: 'Add task', exact: true })
    .last()
    .click();
  await page.clock.setSystemTime(new Date('2026-11-03T12:00:00Z'));
  await page.reload();
  await expect(page.getByTestId('strip-task-missed-2026-11-02')).toBeVisible();
  await expect(page.getByTestId('strip-task-done-2026-11-02')).toBeVisible();
  await expect(page.getByTestId('strip-note-2026-11-02')).toBeVisible();
  await page.getByRole('button', { name: 'Choose date', exact: true }).click();
  for (const flag of ['note', 'task-done', 'task-missed'])
    await expect(page.getByTestId(`calendar-${flag}-2026-11-02`)).toBeVisible();
});
