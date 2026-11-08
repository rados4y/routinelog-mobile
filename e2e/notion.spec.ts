import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test('Notion setup is reachable without leaving the compact daily workflow', async ({
  page,
}) => {
  await openApp(page);
  await page.getByRole('button', { name: 'Notion sync', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Notion', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Routines + monthly tables')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Open RoutineLog in Notion' }),
  ).toBeVisible();
  await expect(
    page.getByText(
      'Connect using the Android app or Expo Go. The browser preview does not store tokens.',
    ),
  ).toBeVisible();
  await expect(
    page.getByLabel('Personal Notion token', { exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Today', exact: true }),
  ).toBeVisible();
  await page.getByTestId('occurrence-preset-dog').getByRole('checkbox').click();
  await expect(
    page.getByTestId('occurrence-preset-dog').getByRole('checkbox'),
  ).toBeChecked();
});
