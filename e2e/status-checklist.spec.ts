import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test('daily checkbox and routine calendars share the four-state cycle', async ({
  page,
}) => {
  await openApp(page);
  const daily = page.getByTestId('occurrence-preset-dog').getByRole('checkbox');
  for (const status of [
    'Wykonane',
    'Niewykonane',
    'Pominięte',
    'Bez oznaczenia',
  ]) {
    await daily.click();
    await expect(daily).toHaveAccessibleName(new RegExp(`\\. ${status}\\.`));
    await page.reload();
    await expect(daily).toHaveAccessibleName(new RegExp(`\\. ${status}\\.`));
  }
  await page.getByRole('tab', { name: 'Rutyny', exact: true }).click();
  await expect(
    page
      .getByTestId('routine-preset-book')
      .getByRole('button', { name: /^Status:.*\b2 listopada/ }),
  ).toBeDisabled();
  const card = page.getByTestId('routine-preset-dog');
  const date = card.getByRole('button', { name: /^Status:.*\b2 listopada/ });
  for (const status of [
    'Wykonane',
    'Niewykonane',
    'Pominięte',
    'Bez oznaczenia',
  ]) {
    await date.click();
    await expect(date).toHaveAccessibleName(new RegExp(`\\. ${status}\\.`));
  }
  await card
    .getByRole('button', {
      name: 'Otwórz kalendarz: Wyjście na spacer z psem',
      exact: true,
    })
    .click();
  const monthDate = page
    .getByRole('button', { name: /^Status:.*\b2 listopada/ })
    .last();
  for (const status of [
    'Wykonane',
    'Niewykonane',
    'Pominięte',
    'Bez oznaczenia',
  ]) {
    await monthDate.click();
    await expect(monthDate).toHaveAccessibleName(
      new RegExp(`\\. ${status}\\.`),
    );
  }
  await expect(
    page.getByRole('button', { name: /^Status:.*\b3 listopada/ }).last(),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Zamknij', exact: true }).click();
});

test('checklists require every step, cancel safely, persist and protect every completion entry point', async ({
  page,
}) => {
  await openApp(page, '/routines');
  await page.getByRole('button', { name: 'Dodaj rutynę', exact: true }).click();
  await page
    .getByLabel('Nazwa rutyny', { exact: true })
    .fill('Wieczorne kroki');
  await page.getByRole('button', { name: 'Dodaj krok', exact: true }).click();
  await page.getByLabel('Krok 1', { exact: true }).fill('Rozciąganie');
  await page.getByRole('button', { name: 'Dodaj krok', exact: true }).click();
  await page.getByLabel('Krok 2', { exact: true }).fill('Oddech');
  await page
    .getByRole('button', { name: 'Zapisz rutynę', exact: true })
    .click();
  const card = page
    .locator('[data-testid^="routine-"]')
    .filter({ hasText: 'Wieczorne kroki' });
  await card.getByRole('button', { name: /^Status:.*\b2 listopada/ }).click();
  await expect(
    page.getByRole('button', { name: 'Potwierdź wykonanie', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Anuluj', exact: true }).click();
  await expect(
    card.getByRole('button', { name: /^Status:.*\b2 listopada/ }),
  ).toHaveAccessibleName(/\. Bez oznaczenia\./);
  await page.getByRole('tab', { name: 'Dzisiaj', exact: true }).click();
  const row = page
    .locator('[data-testid^="occurrence-"]')
    .filter({ hasText: 'Wieczorne kroki' });
  await row.getByRole('checkbox').click();
  await page
    .getByRole('checkbox', { name: 'Rozciąganie', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Potwierdź wykonanie', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Anuluj', exact: true }).click();
  await expect(row.getByRole('checkbox')).not.toBeChecked();
  await row.getByRole('checkbox').click();
  await expect(
    page.getByRole('checkbox', { name: 'Rozciąganie', exact: true }),
  ).not.toBeChecked();
  await page
    .getByRole('checkbox', { name: 'Rozciąganie', exact: true })
    .click();
  await page.getByRole('checkbox', { name: 'Oddech', exact: true }).click();
  await page
    .getByRole('button', { name: 'Potwierdź wykonanie', exact: true })
    .click();
  await expect(row.getByRole('checkbox')).toBeChecked();
  await page.reload();
  await expect(row.getByRole('checkbox')).toBeChecked();
  await page.getByRole('tab', { name: 'Historia', exact: true }).click();
  const history = page
    .locator('[data-testid^="history-entry-"]')
    .filter({ hasText: 'Wieczorne kroki' });
  await expect(history).toContainText('✓ Rozciąganie');
  await expect(history).toContainText('✓ Oddech');
  await page.getByRole('tab', { name: 'Rutyny', exact: true }).click();
  await card
    .getByRole('button', {
      name: 'Otwórz kalendarz: Wieczorne kroki',
      exact: true,
    })
    .click();
  await page
    .getByRole('button', { name: 'Cofnij status', exact: true })
    .click();
  await page
    .getByRole('button', { name: /^Status: Wieczorne kroki,.*\b2 listopada/ })
    .last()
    .click();
  await expect(
    page.getByRole('button', { name: 'Potwierdź wykonanie', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Anuluj', exact: true }).click();
  await page.getByRole('button', { name: 'Wykonane', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Potwierdź wykonanie', exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole('checkbox', { name: 'Rozciąganie', exact: true }),
  ).not.toBeChecked();
  await page
    .getByRole('checkbox', { name: 'Rozciąganie', exact: true })
    .click();
  await page.getByRole('checkbox', { name: 'Oddech', exact: true }).click();
  await page
    .getByRole('button', { name: 'Potwierdź wykonanie', exact: true })
    .click();
  await page.getByRole('button', { name: 'Zamknij', exact: true }).click();
  await card
    .getByRole('button', { name: 'Opcje rutyny: Wieczorne kroki', exact: true })
    .click();
  await page.getByRole('button', { name: 'Edytuj', exact: true }).click();
  await expect(page.getByLabel('Krok 1', { exact: true })).toHaveValue(
    'Rozciąganie',
  );
  await page.getByLabel('Krok 1', { exact: true }).fill('Nowy krok');
  await page.getByRole('button', { name: 'Usuń krok 2', exact: true }).click();
  await page
    .getByRole('button', { name: 'Zapisz rutynę', exact: true })
    .click();
  await page.getByRole('tab', { name: 'Historia', exact: true }).click();
  await expect(history).toContainText('✓ Rozciąganie');
  await expect(history).toContainText('✓ Oddech');
  await expect(history).not.toContainText('Nowy krok');
});
