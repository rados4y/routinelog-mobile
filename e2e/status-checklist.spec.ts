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
  ).toBeEnabled();
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
  await page
    .getByRole('button', { name: /^Status:.*\b3 listopada/ })
    .last()
    .click();
  await expect(
    page.getByText(
      'Przyszły termin — status możesz zapisać najwcześniej tego dnia.',
      { exact: true },
    ),
  ).toBeInViewport({ ratio: 1 });
  await expect(
    page.getByRole('button', { name: 'Wykonane', exact: true }),
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

test.describe('touchscreen date buttons', () => {
  test.use({ hasTouch: true });
  test('records the screenshot book and family routines on past dates without changing their schedules', async ({
    page,
  }) => {
    await openApp(page, '/routines');
    const book = page.getByTestId('routine-preset-book');
    const pawel = page.getByTestId('routine-preset-pawel');
    const day = (card: typeof book) =>
      card.getByRole('button', { name: /^Status:.*\b1 listopada/ });
    for (const card of [book, pawel]) {
      for (const status of [
        'Wykonane',
        'Niewykonane',
        'Pominięte',
        'Bez oznaczenia',
      ]) {
        await day(card).tap();
        await expect(day(card)).toHaveAccessibleName(
          new RegExp(`\\. ${status}\\.`),
        );
      }
    }
    await day(book).tap();
    await expect(
      pawel.getByRole('button', { name: /^Postępy:.*regularność 0%/ }),
    ).toBeVisible();
    await page.reload();
    await expect(day(book)).toHaveAccessibleName(/\. Wykonane\./);
    await book
      .getByRole('button', {
        name: 'Otwórz kalendarz: Book: umysł ponad nastrojem',
        exact: true,
      })
      .tap();
    const date = page
      .getByRole('button', { name: /^Status: Book:.*\b1 listopada/ })
      .last();
    for (const status of [
      'Niewykonane',
      'Pominięte',
      'Bez oznaczenia',
      'Wykonane',
    ]) {
      await date.tap();
      await expect(date).toHaveAccessibleName(new RegExp(`\\. ${status}\\.`));
    }
    await page.getByRole('button', { name: 'Zamknij', exact: true }).tap();
    await page.getByRole('tab', { name: 'Dzisiaj', exact: true }).tap();
    await page.getByRole('button', { name: /niedziela, 1 listopada/ }).tap();
    await expect(
      page.getByTestId('occurrence-preset-book').getByRole('checkbox'),
    ).toBeChecked();
  });
});
