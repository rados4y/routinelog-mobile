import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test('reference cards, calendar, statistics and search use real routines', async ({
  page,
}) => {
  await openApp(page, '/routines');
  const cards = page.locator('[data-testid^="routine-"]');
  await expect(cards).toHaveCount(5);
  await expect(cards.first()).toContainText('Book: umysł ponad nastrojem');
  await page.screenshot({ path: 'test-results/routines-reference.png' });
  await page
    .getByRole('button', { name: 'Search routines', exact: true })
    .click();
  await page
    .getByRole('textbox', { name: 'Search routines', exact: true })
    .fill('Piotrkiem');
  await expect(cards).toHaveCount(1);
  await page
    .getByRole('textbox', { name: 'Search routines', exact: true })
    .fill('');
  await expect(cards).toHaveCount(5);
  await page
    .getByRole('button', {
      name: 'Open calendar: Book: umysł ponad nastrojem',
      exact: true,
    })
    .click();
  await expect(
    page.getByRole('button', { name: 'Previous month', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Previous month', exact: true })
    .click();
  await expect(page.getByText('October 2026', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page
    .getByRole('button', {
      name: 'Insights: Book: umysł ponad nastrojem',
      exact: true,
    })
    .click();
  await expect(page.getByText('Last 30 days', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
});

test('monthly day grid, Last, Flexible, confirm and cancel persist the chosen frequency', async ({
  page,
}) => {
  await openApp(page, '/routines');
  await page.getByRole('button', { name: 'Add routine', exact: true }).click();
  await page
    .getByLabel('Routine name', { exact: true })
    .fill('Test miesięczny');
  await page
    .getByRole('button', { name: 'Set frequency', exact: true })
    .click();
  await page
    .getByRole('radio', { name: 'Specific days of the month', exact: true })
    .click();
  await expect(
    page.getByRole('switch', { name: 'Flexible', exact: true }),
  ).toBeChecked();
  await page.getByRole('button', { name: 'Day 15', exact: true }).click();
  await page.screenshot({ path: 'test-results/frequency-reference.png' });
  await page
    .getByRole('button', { name: 'Confirm frequency', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Set frequency', exact: true }),
  ).toContainText('15, last');
  await page
    .getByRole('button', { name: 'Set frequency', exact: true })
    .click();
  await page.getByRole('radio', { name: 'Every day', exact: true }).click();
  await page
    .getByRole('button', { name: 'Cancel frequency', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Set frequency', exact: true }),
  ).toContainText('15, last');
  await page.getByRole('button', { name: 'Save routine', exact: true }).click();
  await page.reload();
  const card = page
    .locator('[data-testid^="routine-"]')
    .filter({ hasText: 'Test miesięczny' });
  await expect(card).toContainText('15, last');
  await page
    .getByRole('button', { name: 'Edit routine: Test miesięczny', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Set frequency', exact: true }),
  ).toContainText('15, last');
});
