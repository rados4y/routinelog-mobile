import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test('daily checkbox and routine calendars share the four-state cycle', async ({
  page,
}) => {
  await openApp(page);
  const daily = page.getByTestId('occurrence-preset-dog').getByRole('checkbox');
  for (const status of ['Done', 'Not done', 'Skipped', 'Unchecked']) {
    await daily.click();
    await expect(daily).toHaveAccessibleName(new RegExp(`\\. ${status}\\.`));
    await page.reload();
    await expect(daily).toHaveAccessibleName(new RegExp(`\\. ${status}\\.`));
  }
  await page.getByRole('tab', { name: 'Routines', exact: true }).click();
  await expect(
    page
      .getByTestId('routine-preset-book')
      .getByRole('button', { name: /^Status:.*\b2 November/ }),
  ).toBeEnabled();
  const card = page.getByTestId('routine-preset-dog');
  const date = card.getByRole('button', { name: /^Status:.*\b2 November/ });
  for (const status of ['Done', 'Not done', 'Skipped', 'Unchecked']) {
    await date.click();
    await expect(date).toHaveAccessibleName(new RegExp(`\\. ${status}\\.`));
  }
  await card
    .getByRole('button', {
      name: 'Open calendar: Wyjście na spacer z psem',
      exact: true,
    })
    .click();
  const monthDate = page
    .getByRole('button', { name: /^Status:.*\b2 November/ })
    .last();
  for (const status of ['Done', 'Not done', 'Skipped', 'Unchecked']) {
    await monthDate.click();
    await expect(monthDate).toHaveAccessibleName(
      new RegExp(`\\. ${status}\\.`),
    );
  }
  await page
    .getByRole('button', { name: /^Status:.*\b3 November/ })
    .last()
    .click();
  await expect(
    page.getByText(
      'Future date — you can record a status on that day or later.',
      { exact: true },
    ),
  ).toBeInViewport({ ratio: 1 });
  await expect(
    page.getByRole('button', { name: 'Done', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
});

test('checklists require every step, cancel safely, persist and protect every completion entry point', async ({
  page,
}) => {
  await openApp(page, '/routines');
  await page.getByRole('button', { name: 'Add routine', exact: true }).click();
  await page
    .getByLabel('Routine name', { exact: true })
    .fill('Wieczorne kroki');
  await page.getByRole('button', { name: 'Add step', exact: true }).click();
  await page.getByLabel('Step 1', { exact: true }).fill('Rozciąganie');
  await page.getByRole('button', { name: 'Add step', exact: true }).click();
  await page.getByLabel('Step 2', { exact: true }).fill('Oddech');
  await page.getByRole('button', { name: 'Save routine', exact: true }).click();
  const card = page
    .locator('[data-testid^="routine-"]')
    .filter({ hasText: 'Wieczorne kroki' });
  await card.getByRole('button', { name: /^Status:.*\b2 November/ }).click();
  await expect(
    page.getByRole('button', { name: 'Confirm completion', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(
    card.getByRole('button', { name: /^Status:.*\b2 November/ }),
  ).toHaveAccessibleName(/\. Unchecked\./);
  await page.getByRole('tab', { name: 'Today', exact: true }).click();
  const row = page
    .locator('[data-testid^="occurrence-"]')
    .filter({ hasText: 'Wieczorne kroki' });
  await row.getByRole('checkbox').click();
  await page
    .getByRole('checkbox', { name: 'Rozciąganie', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Confirm completion', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
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
    .getByRole('button', { name: 'Confirm completion', exact: true })
    .click();
  await expect(row.getByRole('checkbox')).toBeChecked();
  await page.reload();
  await expect(row.getByRole('checkbox')).toBeChecked();
  await page.goto('/history');
  const history = page
    .locator('[data-testid^="history-entry-"]')
    .filter({ hasText: 'Wieczorne kroki' });
  await history.getByRole('button', { name: /^History details:/ }).click();
  await expect(page.getByText('✓ Rozciąganie', { exact: true })).toBeVisible();
  await expect(page.getByText('✓ Oddech', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('tab', { name: 'Routines', exact: true }).click();
  await card
    .getByRole('button', {
      name: 'Open calendar: Wieczorne kroki',
      exact: true,
    })
    .click();
  const calendarDate = page
    .getByRole('button', { name: /^Status: Wieczorne kroki,.*\b2 November/ })
    .last();
  for (let i = 0; i < 4; i++) await calendarDate.click();
  await expect(
    page.getByRole('button', { name: 'Confirm completion', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await calendarDate.click();
  await expect(
    page.getByRole('button', { name: 'Confirm completion', exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole('checkbox', { name: 'Rozciąganie', exact: true }),
  ).not.toBeChecked();
  await page
    .getByRole('checkbox', { name: 'Rozciąganie', exact: true })
    .click();
  await page.getByRole('checkbox', { name: 'Oddech', exact: true }).click();
  await page
    .getByRole('button', { name: 'Confirm completion', exact: true })
    .click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await card
    .getByRole('button', { name: 'Edit routine: Wieczorne kroki', exact: true })
    .click();
  await expect(page.getByLabel('Step 1', { exact: true })).toHaveValue(
    'Rozciąganie',
  );
  await page.getByLabel('Step 1', { exact: true }).fill('Nowy krok');
  await page
    .getByRole('button', { name: 'Remove step 2', exact: true })
    .click();
  await page.getByRole('button', { name: 'Save routine', exact: true }).click();
  await page.goto('/history');
  await history.getByRole('button', { name: /^History details:/ }).click();
  await expect(page.getByText('✓ Rozciąganie', { exact: true })).toBeVisible();
  await expect(page.getByText('✓ Oddech', { exact: true })).toBeVisible();
  await expect(page.getByText('✓ Nowy krok', { exact: true })).toHaveCount(0);
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
      card.getByRole('button', { name: /^Status:.*\b1 November/ });
    for (const card of [book, pawel]) {
      for (const status of ['Done', 'Not done', 'Skipped', 'Unchecked']) {
        await day(card).tap();
        await expect(day(card)).toHaveAccessibleName(
          new RegExp(`\\. ${status}\\.`),
        );
      }
    }
    await day(book).tap();
    await expect(
      pawel.getByRole('button', { name: /^Progress:.*consistency 0%/ }),
    ).toBeVisible();
    await page.reload();
    await expect(day(book)).toHaveAccessibleName(/\. Done\./);
    await book
      .getByRole('button', {
        name: 'Open calendar: Book: umysł ponad nastrojem',
        exact: true,
      })
      .tap();
    const date = page
      .getByRole('button', { name: /^Status: Book:.*\b1 November/ })
      .last();
    for (const status of ['Not done', 'Skipped', 'Unchecked', 'Done']) {
      await date.tap();
      await expect(date).toHaveAccessibleName(new RegExp(`\\. ${status}\\.`));
    }
    await page.getByRole('button', { name: 'Close', exact: true }).tap();
    await page.getByRole('tab', { name: 'Today', exact: true }).tap();
    await page.getByRole('button', { name: /Sunday,? 1 November/ }).tap();
    await expect(
      page.getByTestId('occurrence-preset-book').getByRole('checkbox'),
    ).toBeChecked();
  });
});
