import { test, expect } from '@playwright/test';

const OWNER = { email: 'owner01@sokoos.test', password: 'Soko01Pass!2026' };

test.describe('Dashboard summary', () => {
  test('shows KPIs, charts and stock alerts from real sales data', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));

    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.getByLabel('Email address').fill(OWNER.email);
    await page.getByLabel('Password', { exact: true }).fill(OWNER.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // Summary + KPIs
    await expect(page.getByText("What's happening")).toBeVisible();
    await expect(page.getByText('Revenue · last 7 days')).toBeVisible();
    await expect(page.getByText('Average basket')).toBeVisible();
    await expect(page.getByText(/\bNaN\b/)).toHaveCount(0);

    // Charts render as accessible SVGs
    await expect(page.getByRole('img', { name: /Revenue and gross profit per day/ })).toBeVisible();
    await expect(page.getByRole('img', { name: /Number of sales by hour/ })).toBeVisible();
    await expect(page.getByText('Top products')).toBeVisible();
    await expect(page.getByText('How customers pay')).toBeVisible();
    await expect(page.getByText('Stock to reorder')).toBeVisible();

    // Hover shows a tooltip with the day's numbers
    const chart = page.getByRole('img', { name: /Revenue and gross profit per day/ });
    // The chart sits below the fold at Playwright's default 720px-high viewport. `mouse.move`
    // takes viewport coordinates and does not scroll, so without this the hover lands outside the
    // window and never reaches the SVG.
    await chart.scrollIntoViewIfNeeded();
    const box = (await chart.boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5);
    await expect(page.getByRole('status')).toContainText('Revenue');

    // Range switch changes the series length
    await page.getByRole('tab', { name: '7D' }).click();
    await expect(page.getByRole('tab', { name: '7D' })).toHaveAttribute('aria-selected', 'true');

    // Table view alternative
    await page.getByRole('button', { name: 'View as table' }).click();
    await expect(page.getByRole('columnheader', { name: 'Revenue' })).toBeVisible();

    expect(errors).toEqual([]);
  });
});
