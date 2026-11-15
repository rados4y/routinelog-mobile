import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test('Today + creates description-only tasks with durable edit, completion, undo and delete', async ({
  page,
}) => {
  await openApp(page);
  await expect(
    page.getByRole('button', { name: 'Add routine', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Add task', exact: true }).click();
  const input = page.getByRole('textbox', {
    name: 'Task description',
    exact: true,
  });
  await expect(input).toBeFocused();
  await expect(page.getByLabel('Task title', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Task date', { exact: true })).toHaveCount(0);
  await input.fill('Collect parcel');
  await page
    .getByRole('button', { name: 'Add task', exact: true })
    .last()
    .click();
  const status = page.getByRole('checkbox', {
    name: 'Task status: Collect parcel',
    exact: true,
  });
  await status.check();
  await page.reload();
  await expect(status).toBeChecked();
  await status.uncheck();
  await page
    .getByRole('button', { name: 'Edit task: Collect parcel', exact: true })
    .click();
  await input.fill('Collect two parcels');
  await page.getByRole('button', { name: 'Save task', exact: true }).click();
  await expect(
    page.getByRole('checkbox', {
      name: 'Task status: Collect two parcels',
      exact: true,
    }),
  ).not.toBeChecked();
  await page
    .getByRole('button', {
      name: 'Edit task: Collect two parcels',
      exact: true,
    })
    .click();
  await page.getByRole('button', { name: 'Delete task', exact: true }).click();
  await page
    .getByRole('button', { name: 'Confirm delete task', exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByRole('button', {
      name: 'Edit task: Collect two parcels',
      exact: true,
    }),
  ).toHaveCount(0);
  await page.getByRole('tab', { name: 'Routines', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Add routine', exact: true }),
  ).toBeVisible();
});

test('widget task links use the selected day, preserve one-off dates and never complete future tasks', async ({
  page,
}) => {
  await openApp(page, '/widget-open?focus=new-task&date=2026-11-03');
  const input = page.getByRole('textbox', {
    name: 'Task description',
    exact: true,
  });
  await input.fill('Tomorrow task');
  await page
    .getByRole('button', { name: 'Add task', exact: true })
    .last()
    .click();
  const row = page
    .locator('[data-testid^="task-"]')
    .filter({ hasText: 'Tomorrow task' });
  const id = (await row.getAttribute('data-testid'))!.slice('task-'.length);
  await expect(row.getByRole('checkbox')).toBeDisabled();
  await page.goto('/widget-open?focus=note&date=2026-11-02');
  await expect(
    page.getByRole('button', { name: 'Edit task: Tomorrow task', exact: true }),
  ).toHaveCount(0);
  await page.goto(
    `/widget-open?focus=task&date=2026-11-03&taskId=${encodeURIComponent(id)}`,
  );
  await expect(input).toHaveValue('Tomorrow task');
  await input.fill('Tomorrow task edited');
  await page.getByRole('button', { name: 'Save task', exact: true }).click();
  await page.clock.setSystemTime(new Date('2026-11-04T12:00:00Z'));
  await page.goto('/widget-open?focus=note&date=2026-11-04');
  await expect(
    page.getByRole('button', {
      name: 'Edit task: Tomorrow task edited',
      exact: true,
    }),
  ).toHaveCount(0);
  await page.goto(
    `/widget-open?focus=task&date=2026-11-03&taskId=${encodeURIComponent(id)}`,
  );
  await expect(input).toHaveValue('Tomorrow task edited');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(row.getByRole('checkbox')).not.toBeChecked();
  await row.getByRole('checkbox').check();
  await page.reload();
  // Restart returns to today; the completed task stays on its original date.
  await page.goto('/widget-open?focus=note&date=2026-11-03');
  await expect(row.getByRole('checkbox')).toBeChecked();
});
