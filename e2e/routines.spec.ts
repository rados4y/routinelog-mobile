import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test('compact English UI preserves status, history, editing, pause and delete', async ({
  page,
}) => {
  await openApp(page);
  const dog = page.getByTestId('occurrence-preset-dog');
  await dog.getByRole('checkbox').click();
  await page.reload();
  await expect(dog.getByRole('checkbox')).toBeChecked();
  await dog
    .getByRole('button', {
      name: 'Routine details: Wyjście na spacer z psem',
      exact: true,
    })
    .click();
  await expect(
    dog.getByRole('button', { name: 'Skip', exact: true }),
  ).toHaveCount(0);
  await expect(
    dog.getByRole('button', {
      name: 'Edit routine: Wyjście na spacer z psem',
      exact: true,
    }),
  ).toBeVisible();
  await dog.getByRole('checkbox').click();
  await dog.getByRole('checkbox').click();
  await expect(dog).toContainText('Skipped');
  await page.goto('/history');
  await expect(
    page
      .locator('[data-testid^="history-entry-"]')
      .getByText('Wyjście na spacer z psem', { exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: 'test-results/history-english.png' });
  await page.getByRole('tab', { name: 'Insights', exact: true }).click();
  await expect(page.getByText('Consistency', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Routines', exact: true }).click();
  await page.getByRole('button', { name: 'Add routine', exact: true }).click();
  await page
    .getByLabel('Routine name', { exact: true })
    .fill('Phone test routine');
  await page.getByLabel('Note', { exact: true }).fill('Persisted note');
  await page.getByRole('button', { name: 'Save routine', exact: true }).click();
  await page
    .getByRole('button', {
      name: 'Edit routine: Phone test routine',
      exact: true,
    })
    .click();
  await expect(page.getByLabel('Note', { exact: true })).toHaveValue(
    'Persisted note',
  );
  await page
    .getByLabel('Routine name', { exact: true })
    .fill('Updated phone routine');
  await page
    .getByRole('switch', { name: 'Routine active', exact: true })
    .uncheck();
  await page.getByRole('button', { name: 'Save routine', exact: true }).click();
  const edited = page
    .locator('[data-testid^="routine-"]')
    .filter({ hasText: 'Updated phone routine' });
  await expect(edited).toContainText('Paused');
  await page.reload();
  await expect(edited).toContainText('Paused');
  await page
    .getByRole('button', {
      name: 'Edit routine: Updated phone routine',
      exact: true,
    })
    .click();
  await page
    .getByRole('switch', { name: 'Routine active', exact: true })
    .check();
  await page.getByRole('button', { name: 'Save routine', exact: true }).click();
  await expect(edited.getByText('Paused', { exact: true })).toHaveCount(0);
  await page
    .getByRole('button', {
      name: 'Edit routine: Updated phone routine',
      exact: true,
    })
    .click();
  await page
    .getByRole('button', { name: 'Delete routine', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Confirm delete', exact: true })
    .click();
  await expect(edited).toHaveCount(0);
  await page.reload();
  await expect(page.locator('[data-testid^="routine-"]')).toHaveCount(5);
});
