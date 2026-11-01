import { expect, test } from '@playwright/test';

for (const viewport of [
  { width: 393, height: 851, visibleRoutines: 5 },
  { width: 360, height: 740, visibleRoutines: 4 },
]) {
  test(`quick completion fits the initial ${viewport.width}×${viewport.height} phone screen`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    const rows = page.locator('[data-testid^="occurrence-"]');
    await expect(rows).toHaveCount(5);
    const navigation = await page.getByRole('tablist').boundingBox();
    expect(navigation).not.toBeNull();

    for (let index = 0; index < viewport.visibleRoutines; index++) {
      const checkbox = rows.nth(index).getByRole('checkbox');
      await expect(checkbox).toBeInViewport({ ratio: 1 });
      const bounds = await checkbox.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.width).toBeGreaterThanOrEqual(44);
      expect(bounds!.height).toBeGreaterThanOrEqual(44);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(navigation!.y);
    }

    const quickAction = rows
      .nth(viewport.visibleRoutines - 1)
      .getByRole('checkbox');
    await quickAction.click();
    await expect(quickAction).toBeChecked();
    await expect(page.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '20',
    );
    await page.screenshot({
      path: `test-results/today-${viewport.width}x${viewport.height}.png`,
    });
    await quickAction.click();
    await expect(quickAction).not.toBeChecked();
  });
}
