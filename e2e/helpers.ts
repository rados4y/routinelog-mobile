import type { Page } from '@playwright/test';
export async function openApp(page: Page, path = '/') {
  await page.clock.install({ time: new Date('2026-11-02T12:00:00Z') });
  await page.goto(path);
}
