import { expect, test } from '@playwright/test';

test('phone-sized UI: status, history, stats, CRUD and persistence', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByText('Twój plan dnia')).toBeVisible();
  await page.screenshot({ path: 'test-results/today.png' });
  const medicine = page.getByTestId('occurrence-seed-1');
  await medicine.getByRole('button', { name: 'Wykonane', exact: true }).click();
  await expect(
    medicine.getByRole('button', { name: 'Cofnij status' }),
  ).toBeVisible();
  await page.reload();
  await expect(
    medicine.getByRole('button', { name: 'Cofnij status' }),
  ).toBeVisible();
  await medicine.getByRole('button', { name: 'Cofnij status' }).click();
  await medicine.getByRole('button', { name: 'Pomiń', exact: true }).click();
  await expect(medicine.getByText('Pominięte', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Historia', exact: true }).click();
  await expect(
    page
      .locator('[data-testid^="history-entry-"]')
      .getByText('Wziąć lek', { exact: true }),
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
  const card = page
    .locator('[data-testid^="routine-"]')
    .filter({ hasText: 'Rutyna testowa telefonu' });
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'Edytuj', exact: true }).click();
  await page
    .getByLabel('Nazwa rutyny', { exact: true })
    .fill('Zmieniona rutyna telefonu');
  await page.getByRole('button', { name: 'Zapisz rutynę' }).click();
  const edited = page
    .locator('[data-testid^="routine-"]')
    .filter({ hasText: 'Zmieniona rutyna telefonu' });
  await edited.getByRole('button', { name: 'Wyłącz', exact: true }).click();
  await expect(edited.getByText('Wyłączona', { exact: true })).toBeVisible();
  await page.reload();
  await expect(edited.getByText('Wyłączona', { exact: true })).toBeVisible();
  await edited.getByRole('button', { name: 'Włącz', exact: true }).click();
  await edited.getByRole('button', { name: 'Usuń', exact: true }).click();
  await page.getByRole('button', { name: 'Usuń rutynę', exact: true }).click();
  await expect(edited).toHaveCount(0);
  await page.reload();
  await expect(edited).toHaveCount(0);
  await expect(page.locator('[data-testid^="routine-"]')).toHaveCount(5);
  expect(errors).toEqual([]);
});
