import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test('task editing stays single-line with all four actions on one row at phone widths', async ({
  page,
}) => {
  await openApp(page);
  await page.getByRole('button', { name: 'Add task', exact: true }).click();
  const input = page.getByRole('textbox', {
    name: 'Task description',
    exact: true,
  });
  await expect(input).toBeFocused();
  expect(await input.evaluate((element) => element.tagName)).toBe('INPUT');
  const description =
    'A longer task description that should stay compact without losing any saved text';
  await input.fill(description);
  await page
    .getByRole('button', { name: 'Add task', exact: true })
    .last()
    .click();
  await page
    .getByRole('button', { name: `Edit task: ${description}`, exact: true })
    .click();
  await expect(input).toHaveValue(description);
  for (const width of [320, 360, 393]) {
    await page.setViewportSize({ width, height: 851 });
    const field = (await input.boundingBox())!;
    expect(field.height).toBeLessThanOrEqual(48);
    const actions = page.getByTestId('task-editor-actions').getByRole('button');
    await expect(actions).toHaveCount(4);
    const boxes = await Promise.all(
      (await actions.all()).map((action) => action.boundingBox()),
    );
    for (const box of boxes) {
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(Math.abs(box!.y - boxes[0]!.y)).toBeLessThan(1);
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    }
    await page.screenshot({
      path: `test-results/task-editor-compact-${width}.png`,
    });
  }
});

for (const viewport of [
  { width: 393, height: 851 },
  { width: 360, height: 740 },
]) {
  test(`reference daily plan fits ${viewport.width}×${viewport.height} with quick completion`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await openApp(page);
    const rows = page.locator('[data-testid^="occurrence-"]');
    await expect(rows).toHaveCount(3);
    await expect(
      page.getByRole('heading', { name: 'Today', exact: true }),
    ).toBeVisible();
    const navigation = await page.getByRole('tablist').boundingBox();
    for (let index = 0; index < 3; index++) {
      const checkbox = rows.nth(index).getByRole('checkbox');
      await expect(checkbox).toBeInViewport({ ratio: 1 });
      const bounds = (await checkbox.boundingBox())!;
      expect(bounds.width).toBeGreaterThanOrEqual(44);
      expect(bounds.height).toBeGreaterThanOrEqual(44);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(navigation!.y);
    }
    const action = rows.nth(2).getByRole('checkbox');
    await action.click();
    await expect(action).toBeChecked();
    await action.click();
    await expect(action).not.toBeChecked();
    await page.screenshot({
      path: `test-results/today-${viewport.width}x${viewport.height}.png`,
    });
  });
}
