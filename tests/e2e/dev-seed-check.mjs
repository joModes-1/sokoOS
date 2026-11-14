// Dev helper: clicks the "Load demo data" button and confirms data lands in the catalogue.
// Usage: node dev-seed-check.mjs [outdir]
import { chromium } from '@playwright/test';

const out = process.argv[2] ?? 'screenshots';
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
page.on('dialog', (d) => d.accept());

await page.goto('http://localhost:3000/login');
await page.getByLabel('Email address').fill('owner01@sokoos.test');
await page.getByLabel('Password', { exact: true }).fill('Soko01Pass!2026');
await page.getByRole('button', { name: 'Sign in' }).click();
await page.waitForURL(/dashboard/, { timeout: 120000 });

const button = page.getByRole('button', { name: /Load demo data/ });
await button.waitFor({ timeout: 60000 });
await page.screenshot({ path: `${out}/dev-button.png` });

await button.click();
await page.locator('text=/products, .*sales/').waitFor({ timeout: 300000 });
console.log('result:', (await page.locator('text=/products, .*sales/').innerText()).replace(/\s+/g, ' '));
await page.screenshot({ path: `${out}/dev-button-done.png` });

await page.goto('http://localhost:3000/catalogue/products');
await page.waitForTimeout(3000);
const body = await page.locator('main').innerText();
console.log('catalogue shows products:', !/No products yet/i.test(body), '| rows:', await page.locator('table tbody tr').count());
await page.screenshot({ path: `${out}/dev-button-catalogue.png`, fullPage: true });

await browser.close();
console.log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'no console/page errors');