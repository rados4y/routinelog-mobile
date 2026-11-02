import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test('phone-sized UI: status, history, stats, CRUD and persistence', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openApp(page);
  const dog = page.getByTestId('occurrence-preset-dog');
  await dog.getByRole('checkbox').click();
  await expect(dog.getByRole('checkbox')).toBeChecked();
  await page.reload();
  await expect(dog.getByRole('checkbox')).toBeChecked();
  await dog.getByRole('checkbox').click();
  await dog
    .getByRole('button', {
      name: 'Szczegóły rutyny: Wyjście na spacer z psem',
      exact: true,
    })
    .click();
  await dog.getByRole('button', { name: 'Pomiń', exact: true }).click();
  await expect(dog).toContainText('Pominięte');
  await page.getByRole('tab', { name: 'Historia', exact: true }).click();
  await expect(
    page
      .locator('[data-testid^="history-entry-"]')
      .getByText('Wyjście na spacer z psem', { exact: true }),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Statystyki', exact: true }).click();
  await expect(page.getByText('Regularność', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Rutyny', exact: true }).click();
  await page.getByRole('button', { name: 'Dodaj rutynę', exact: true }).click();
  await page
    .getByLabel('Nazwa rutyny', { exact: true })
    .fill('Rutyna testowa telefonu');
  await page
    .getByLabel('Notatka', { exact: true })
    .fill('Zapisana po ponownym uruchomieniu');
  await page.getByRole('button', { name: 'Zapisz rutynę' }).click();
  await page
    .getByRole('button', {
      name: 'Opcje rutyny: Rutyna testowa telefonu',
      exact: true,
    })
    .click();
  await page.getByRole('button', { name: 'Edytuj', exact: true }).click();
  await page
    .getByLabel('Nazwa rutyny', { exact: true })
    .fill('Zmieniona rutyna telefonu');
  await page.getByRole('button', { name: 'Zapisz rutynę' }).click();
  const edited = page
    .locator('[data-testid^="routine-"]')
    .filter({ hasText: 'Zmieniona rutyna telefonu' });
  await page
    .getByRole('button', {
      name: 'Opcje rutyny: Zmieniona rutyna telefonu',
      exact: true,
    })
    .click();
  await page.getByRole('button', { name: 'Wyłącz', exact: true }).click();
  await expect(edited.getByText('Wyłączona', { exact: true })).toBeVisible();
  await page.reload();
  await expect(edited.getByText('Wyłączona', { exact: true })).toBeVisible();
  await page
    .getByRole('button', {
      name: 'Opcje rutyny: Zmieniona rutyna telefonu',
      exact: true,
    })
    .click();
  await page.getByRole('button', { name: 'Włącz', exact: true }).click();
  await page
    .getByRole('button', {
      name: 'Opcje rutyny: Zmieniona rutyna telefonu',
      exact: true,
    })
    .click();
  await page.getByRole('button', { name: 'Usuń', exact: true }).click();
  await page.getByRole('button', { name: 'Usuń rutynę', exact: true }).click();
  await expect(edited).toHaveCount(0);
  await page.reload();
  await expect(edited).toHaveCount(0);
  await expect(page.locator('[data-testid^="routine-"]')).toHaveCount(5);
  expect(errors).toEqual([]);
});
