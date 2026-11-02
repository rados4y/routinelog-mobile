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
  await page.getByRole('button', { name: 'Szukaj rutyn', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Szukaj rutyn', exact: true })
    .fill('Piotrkiem');
  await expect(cards).toHaveCount(1);
  await page
    .getByRole('textbox', { name: 'Szukaj rutyn', exact: true })
    .fill('');
  await expect(cards).toHaveCount(5);
  await page
    .getByRole('button', {
      name: 'Otwórz kalendarz: Book: umysł ponad nastrojem',
      exact: true,
    })
    .click();
  await expect(
    page.getByRole('button', { name: 'Poprzedni miesiąc', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Poprzedni miesiąc', exact: true })
    .click();
  await expect(
    page.getByText('październik 2026', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Zamknij', exact: true }).click();
  await page
    .getByRole('button', {
      name: 'Statystyki: Book: umysł ponad nastrojem',
      exact: true,
    })
    .click();
  await expect(
    page.getByText('Ostatnie 30 dni', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Zamknij', exact: true }).click();
});

test('monthly day grid, Last, Flexible, confirm and cancel persist the chosen frequency', async ({
  page,
}) => {
  await openApp(page, '/routines');
  await page.getByRole('button', { name: 'Dodaj rutynę', exact: true }).click();
  await page
    .getByLabel('Nazwa rutyny', { exact: true })
    .fill('Test miesięczny');
  await page
    .getByRole('button', { name: 'Ustaw częstotliwość', exact: true })
    .click();
  await page
    .getByRole('radio', { name: 'Wybrane dni miesiąca', exact: true })
    .click();
  await expect(
    page.getByRole('switch', { name: 'Elastycznie', exact: true }),
  ).toBeChecked();
  await page.getByRole('button', { name: 'Dzień 15', exact: true }).click();
  await page.screenshot({ path: 'test-results/frequency-reference.png' });
  await page
    .getByRole('button', { name: 'Potwierdź częstotliwość', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Ustaw częstotliwość', exact: true }),
  ).toContainText('15, ostatni');
  await page
    .getByRole('button', { name: 'Ustaw częstotliwość', exact: true })
    .click();
  await page.getByRole('radio', { name: 'Codziennie', exact: true }).click();
  await page
    .getByRole('button', { name: 'Anuluj częstotliwość', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Ustaw częstotliwość', exact: true }),
  ).toContainText('15, ostatni');
  await page
    .getByRole('button', { name: 'Zapisz rutynę', exact: true })
    .click();
  await page.reload();
  const card = page
    .locator('[data-testid^="routine-"]')
    .filter({ hasText: 'Test miesięczny' });
  await expect(card).toContainText('15, ostatni');
  await page
    .getByRole('button', { name: 'Opcje rutyny: Test miesięczny', exact: true })
    .click();
  await page.getByRole('button', { name: 'Edytuj', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Ustaw częstotliwość', exact: true }),
  ).toContainText('15, ostatni');
});
