import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

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
