import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';

const OWNER = { email: 'owner01@sokoos.test', password: 'Soko01Pass!2026' };
const SHOTS = 'screenshots';

async function login(page: Page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.getByLabel('Email address').fill(OWNER.email);
  await page.getByLabel('Password', { exact: true }).fill(OWNER.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

/**
 * Regression test for the reported defect: the sidebar rendered links to routes that did not
 * exist (`/catalogue`, `/inventory`, `/purchasing`, `/finance`, `/reports`, `/settings`), so
 * clicking a top-level section produced "404 — This page could not be found".
 *
 * The fix resolves every nav path through `lib/routes.ts`. This test walks every link the
 * sidebar actually renders and fails if any of them is not a real screen.
 */
test.describe('App shell navigation integrity', () => {
  test('every sidebar link opens a real screen (no 404)', async ({ page }, testInfo) => {
    // This test walks ~11 sidebar links with a full `goto`, a network settle and a full-page
    // screenshot each. In `next dev` every route compiles on first visit (1-6s apiece), which
    // overran the 120s default. The work is legitimate; the cap was simply too tight.
    test.setTimeout(300_000);
    const consoleErrors: string[] = [];
    const failedRequests: string[] = [];
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', e => consoleErrors.push(`pageerror: ${e.message}`));
    page.on('requestfailed', r => failedRequests.push(`${r.method()} ${r.url()} — ${r.failure()?.errorText ?? ''}`));

    await login(page);

    const links = await page
      .locator('aside.app-sidebar a[href^="/"]')
      .evaluateAll(els => Array.from(new Set(els.map(e => (e as HTMLAnchorElement).getAttribute('href')!))));

    expect(links.length, 'sidebar rendered no links').toBeGreaterThan(0);

    const missing: string[] = [];
    for (const href of links) {
      const res = await page.goto(href);
      const status = res?.status() ?? 0;
      const notFoundCopy = await page.getByText('This page could not be found').count();
      if (status >= 400 || notFoundCopy > 0) missing.push(`${href} (HTTP ${status})`);
      // Let the page's data queries settle so the screenshot (and any console noise) reflects a
      // loaded screen rather than a mid-flight spinner.
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(800);
      await page.screenshot({
        path: path.join(SHOTS, `nav${href.replace(/\//g, '_')}.png`),
        fullPage: true,
      });
    }

    await testInfo.attach('sidebar-console-errors.txt', {
      body: consoleErrors.join('\n') || '(none)', contentType: 'text/plain',
    });
    await testInfo.attach('sidebar-failed-requests.txt', {
      body: failedRequests.join('\n') || '(none)', contentType: 'text/plain',
    });

    expect(missing, `Sidebar links that did not resolve to a real screen:\n${missing.join('\n')}`).toEqual([]);
  });

  test('top-level sections open their real first screen', async ({ page }) => {
    await login(page);

    const sections: Array<[string, RegExp]> = [
      ['Catalogue', /\/catalogue\/products/],
      ['Inventory', /\/inventory\/balances/],
      ['Purchasing', /\/purchasing\/purchase-orders/],
      ['Finance', /\/finance\/payments/],
      ['Reports', /\/reports\/sales/],
      ['Settings', /\/settings\/business/],
    ];

    for (const [label, expected] of sections) {
      await page.locator('aside.app-sidebar', { hasText: label }).getByRole('link', { name: label, exact: true }).click();
      await expect(page).toHaveURL(expected);
      await expect(page.getByText('This page could not be found')).toHaveCount(0);
      await page.screenshot({ path: path.join(SHOTS, `section-${label.toLowerCase()}.png`), fullPage: true });
    }
  });

  /**
   * The sidebar carries a single "Settings" entry, so the settings sections (`/settings/branches`,
   * `/settings/roles`, `/settings/notifications`, `/settings/appearance`) are reached through the
   * settings sub-nav the shell now renders on every `/settings/*` screen. This walks it, then
   * checks the Appearance screen's accent colour actually reaches components that share the
   * `sunset` token.
   */
  test('settings sections are reachable and the accent colour re-skins the app', async ({ page }) => {
    await login(page);

    await page.goto('/settings/business');
    const tabs = await page
      .locator('[data-testid="settings-nav"] a')
      .evaluateAll(els => els.map(e => (e as HTMLAnchorElement).getAttribute('href')!));
    expect(tabs.length, 'settings sub-nav rendered no links').toBeGreaterThan(1);

    for (const href of tabs) {
      const res = await page.goto(href);
      expect(res?.status() ?? 0, `${href} did not resolve`).toBeLessThan(400);
      await expect(page.getByText('This page could not be found')).toHaveCount(0);
      await expect(page.locator('[data-testid="settings-nav"] a[aria-current="page"]')).toHaveAttribute('href', href);
    }

    // ── Appearance: pick a colour, confirm the shared token moved with it ──
    const accentToken = () =>
      page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--brand').trim().toLowerCase());
    const backgroundOf = (selector: string) =>
      page.locator(selector).first().evaluate(el => getComputedStyle(el).backgroundColor);

    await page.goto('/settings/appearance');
    await expect(page).toHaveURL(/\/settings\/appearance/);
    expect(await accentToken()).toBe('#c2410c');
    await page.screenshot({ path: path.join(SHOTS, 'settings-appearance.png'), fullPage: true });

    await page.getByRole('button', { name: /Ocean/i }).click();

    expect(await accentToken()).toBe('#1d4ed8');
    expect(await page.locator('html').getAttribute('data-brand')).toBe('ocean');
    // two independent components that share the token must both have followed
    expect(await backgroundOf('[data-testid="settings-nav"] a[aria-current="page"]')).toBe('rgb(29, 78, 216)');
    expect(await backgroundOf('[data-testid="accent-preview-button"]')).toBe('rgb(29, 78, 216)');
    await page.screenshot({ path: path.join(SHOTS, 'settings-appearance-ocean.png'), fullPage: true });

    // the preference is applied before first paint, so a reload keeps it
    await page.reload();
    expect(await accentToken()).toBe('#1d4ed8');
    expect(await page.locator('html').getAttribute('data-brand')).toBe('ocean');
  });
});
