import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test('settings opens the interactive guide, which persists a multi-screen draft and copies one prompt', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await openApp(page);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page
    .getByRole('button', { name: 'Request changes', exact: true })
    .click();
  const guide = page.frameLocator('iframe[title="Interactive change guide"]');
  await expect(
    guide.getByRole('heading', { name: 'What would you change?' }),
  ).toBeVisible();
  await guide
    .getByLabel('Requested change', { exact: true })
    .fill('Show completion time under each routine.');
  await guide.getByRole('button', { name: 'Add change', exact: true }).click();
  await guide.getByLabel('Screen', { exact: true }).selectOption('W');
  await guide
    .getByRole('button', { name: 'W3 Daily note', exact: true })
    .click();
  await guide
    .getByLabel('Requested change', { exact: true })
    .fill('Show three lines of the daily note.');
  await guide.getByRole('button', { name: 'Add change', exact: true }).click();
  await guide
    .getByLabel('Constraints', { exact: true })
    .fill('Keep all existing routine data.');
  await page.reload();
  await expect(guide.getByLabel('Change 1', { exact: true })).toContainText(
    'Show completion time',
  );
  await expect(guide.getByLabel('Change 2', { exact: true })).toContainText(
    'Show three lines',
  );
  await expect(guide.getByLabel('Constraints', { exact: true })).toHaveValue(
    'Keep all existing routine data.',
  );
  await guide
    .getByRole('button', { name: 'Generate prompt', exact: true })
    .click();
  const prompt = guide.getByLabel('Generated instructions', { exact: true });
  await expect(prompt).toHaveValue(/Today · T3/);
  await expect(prompt).toHaveValue(/Android widget · W3/);
  await expect(prompt).toHaveValue(/rados4y\/routinelog-mobile/);
  await guide
    .getByRole('button', { name: 'Copy instructions', exact: true })
    .click();
  await expect(
    guide.getByRole('status').filter({ hasText: 'Copied.' }),
  ).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    'Show three lines of the daily note.',
  );
  await page.screenshot({ path: 'test-results/change-request-prompt.png' });
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Settings', exact: true }),
  ).toBeVisible();
});

test('guide validates edits, preserves unsaved text, removes changes and clears only after confirmation', async ({
  page,
}) => {
  await openApp(page, '/request-changes');
  const guide = page.frameLocator('iframe[title="Interactive change guide"]');
  await expect(
    guide.getByRole('button', { name: 'Generate prompt', exact: true }),
  ).toBeDisabled();
  await guide.getByRole('button', { name: 'Add change', exact: true }).click();
  await expect(guide.getByRole('alert')).toContainText(
    'Describe what should change',
  );
  await guide
    .getByLabel('Requested change', { exact: true })
    .fill('Keep this unsaved text');
  await page.reload();
  await expect(
    guide.getByLabel('Requested change', { exact: true }),
  ).toHaveValue('Keep this unsaved text');
  await guide.getByRole('button', { name: 'Add change', exact: true }).click();
  await guide
    .getByRole('button', { name: 'Edit change 1', exact: true })
    .click();
  await guide
    .getByLabel('Requested change', { exact: true })
    .fill('Edited request');
  await guide
    .getByRole('button', { name: 'Generate prompt', exact: true })
    .click();
  await expect(guide.getByRole('alert')).toContainText(
    'Add your current change',
  );
  await guide.getByRole('button', { name: 'Save change', exact: true }).click();
  await expect(guide.getByLabel('Change 1', { exact: true })).toContainText(
    'Edited request',
  );
  await guide.getByRole('button', { name: 'Clear draft', exact: true }).click();
  await guide.getByRole('button', { name: 'Keep draft', exact: true }).click();
  await expect(guide.getByLabel('Change 1', { exact: true })).toBeVisible();
  await guide
    .getByRole('button', { name: 'Remove change 1', exact: true })
    .click();
  await expect(
    guide.getByRole('button', { name: 'Generate prompt', exact: true }),
  ).toBeDisabled();
  await guide
    .getByLabel('Requested change', { exact: true })
    .fill('A new item');
  await guide.getByRole('button', { name: 'Add change', exact: true }).click();
  await guide.getByRole('button', { name: 'Clear draft', exact: true }).click();
  await guide
    .getByRole('button', { name: 'Clear all changes', exact: true })
    .click();
  await expect(
    guide.getByText('No changes yet. Add the first one above.'),
  ).toBeVisible();
  await page.reload();
  await expect(
    guide.getByRole('button', { name: 'Generate prompt', exact: true }),
  ).toBeDisabled();
});
