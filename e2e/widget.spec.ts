import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test('widget view links select dates, expand routines, focus notes and never change results', async ({
  page,
}) => {
  await openApp(
    page,
    '/widget-open?focus=routine&date=2026-11-02&routineId=preset-dog',
  );
  const row = page.getByTestId('occurrence-preset-dog');
  await expect(
    row.getByRole('button', { name: /^Routine details:/ }),
  ).toHaveAttribute('aria-expanded', 'true');
  await expect(row).toBeInViewport();
  await expect(row.getByRole('checkbox')).not.toBeChecked();
  await expect(page).toHaveURL('http://127.0.0.1:8081/');
  await page.getByRole('button', { name: /^Routine details: Wyjście/ }).click();
  await page.goto(
    '/widget-open?focus=routine&date=2026-11-02&routineId=preset-dog',
  );
  await expect(
    row.getByRole('button', { name: /^Routine details:/ }),
  ).toHaveAttribute('aria-expanded', 'true');
  await page.goto('/widget-open?focus=note&date=2026-11-01');
  const note = page.getByRole('textbox', {
    name: 'Daily note for 2026-11-01',
    exact: true,
  });
  await expect(note).toBeFocused();
  await expect(note).toBeInViewport();
  await note.fill('Opened from the widget');
  await expect(page.getByTestId('daily-note-2026-11-01')).toContainText(
    'Saved on device',
  );
  await page.goto('/widget-open?focus=note&date=2026-11-02');
  const today = page.getByRole('textbox', {
    name: 'Daily note for 2026-11-02',
    exact: true,
  });
  await expect(today).toBeFocused();
  await expect(today).toHaveValue('');
  await expect(row.getByRole('checkbox')).not.toBeChecked();
  await page.goto(
    '/widget-open?focus=routine&date=2026-11-02&routineId=removed',
  );
  await expect(page.getByRole('alert')).toContainText('no longer scheduled');
  await page.goto('/widget-open?focus=note&date=invalid');
  await expect(today).toBeVisible();
});

test('widget setup explains Android availability without breaking the browser preview', async ({
  page,
}) => {
  await openApp(page);
  await page
    .getByRole('button', { name: 'Add home-screen widget', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Today widget', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Home-screen widgets are available in the Android app.', {
      exact: false,
    }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.goto(
    '/widget-action?routineId=preset-dog&date=2026-11-02&expectedStatus=pending',
  );
  await expect(
    page.getByRole('heading', { name: 'Today', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByTestId('occurrence-preset-dog').getByRole('checkbox'),
  ).not.toBeChecked();
});

test('widget deep links require checklist confirmation and allow skipping without a false completion', async ({
  page,
}) => {
  await openApp(page, '/routines');
  await page.getByRole('button', { name: 'Add routine', exact: true }).click();
  await page
    .getByLabel('Routine name', { exact: true })
    .fill('Widget checklist');
  await page.getByRole('button', { name: 'Add step', exact: true }).click();
  await page.getByLabel('Step 1', { exact: true }).fill('Read a chapter');
  await page.getByRole('button', { name: 'Save routine', exact: true }).click();
  const card = page
    .locator('[data-testid^="routine-"]')
    .filter({ hasText: 'Widget checklist' });
  const id = (await card.getAttribute('data-testid'))!.slice('routine-'.length);
  const url = `/widget-action?routineId=${encodeURIComponent(id)}&date=2026-11-02&expectedStatus=pending`;
  await page.goto(url);
  await expect(
    page.getByRole('button', { name: 'Confirm completion', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  const row = page.getByTestId(`occurrence-${id}`);
  await expect(row.getByRole('checkbox')).toHaveAccessibleName(/\. Skipped\./);
  await row.getByRole('checkbox').click();
  await expect(row.getByRole('checkbox')).toHaveAccessibleName(
    /\. Unchecked\./,
  );
  await page.goto(url);
  await page
    .getByRole('checkbox', { name: 'Read a chapter', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Confirm completion', exact: true })
    .click();
  await expect(row.getByRole('checkbox')).toBeChecked();
  await page.reload();
  await expect(row.getByRole('checkbox')).toBeChecked();
});
