import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test('Notion setup is reachable without leaving the compact daily workflow', async ({
  page,
}) => {
  await openApp(page);
  await page
    .getByRole('button', { name: 'Synchronizacja z Notion', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Notion', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Jeden miesiąc, jedna tabela')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Otwórz RoutineLog w Notion' }),
  ).toBeVisible();
  await expect(
    page.getByText(
      'Połączenie jest dostępne w aplikacji na Androidzie i Expo Go. Podgląd w przeglądarce nie przechowuje tokenów.',
    ),
  ).toBeVisible();
  await expect(
    page.getByLabel('Osobisty token Notion', { exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Wróć', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Dzisiaj', exact: true }),
  ).toBeVisible();
  await page.getByTestId('occurrence-preset-dog').getByRole('checkbox').click();
  await expect(
    page.getByTestId('occurrence-preset-dog').getByRole('checkbox'),
  ).toBeChecked();
});
