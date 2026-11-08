import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test('routine date ranges validate, persist and control the daily plan', async ({
  page,
}) => {
  await openApp(page);
  await page.getByRole('button', { name: 'Add routine', exact: true }).click();
  await page
    .getByLabel('Routine name', { exact: true })
    .fill('Range test routine');
  await page.getByLabel('Start date', { exact: true }).fill('2026-11-01');
  await page.getByLabel('End date', { exact: true }).fill('2026-10-31');
  await page.getByRole('button', { name: 'Save routine', exact: true }).click();
  await expect(
    page.getByText('End date must be on or after the start date.'),
  ).toBeVisible();
  await page.getByLabel('Start date', { exact: true }).fill('2026-11-03');
  await page.getByLabel('End date', { exact: true }).fill('2026-11-04');
  await page.getByRole('button', { name: 'Save routine', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Today', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', {
      name: 'Routine details: Range test routine',
      exact: true,
    }),
  ).toHaveCount(0);
  await page.getByRole('tab', { name: 'Routines', exact: true }).click();
  await page
    .getByRole('button', {
      name: 'Edit routine: Range test routine',
      exact: true,
    })
    .click();
  await expect(page.getByLabel('Start date', { exact: true })).toHaveValue(
    '2026-11-03',
  );
  await expect(page.getByLabel('End date', { exact: true })).toHaveValue(
    '2026-11-04',
  );
  await page.getByLabel('Start date', { exact: true }).fill('2026-11-02');
  await page.getByRole('button', { name: 'Save routine', exact: true }).click();
  await page.getByRole('tab', { name: 'Today', exact: true }).click();
  await expect(
    page.getByRole('button', {
      name: 'Routine details: Range test routine',
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('button', {
      name: 'Routine details: Range test routine',
      exact: true,
    }),
  ).toBeVisible();
});
