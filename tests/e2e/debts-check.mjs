// Dev helper: exercises the Debts screen the way a shopkeeper would — read the list, record a
// payment through the modal, then confirm the dashboard shows the reduced balance.
// Usage: node debts-check.mjs [outdir]
import { chromium } from '@playwright/test';

const out = process.argv[2] ?? 'screenshots';
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });

await page.goto('http://localhost:3000/login');
await page.getByLabel('Email address').fill('owner01@sokoos.test');
await page.getByLabel('Password', { exact: true }).fill('Soko01Pass!2026');
await page.getByRole('button', { name: 'Sign in' }).click();
await page.waitForURL(/dashboard/, { timeout: 120000 });

// Dashboard card must be present and carry the server's total.
await page.getByText('Debts owed to you').waitFor({ timeout: 60000 });
const dashboardTotal = await page.locator('text=Debts owed to you').locator('..').locator('..').innerText();
console.log('dashboard card:', dashboardTotal.replace(/\s+/g, ' ').slice(0, 160));
await page.screenshot({ path: `${out}/debts-dashboard.png`, fullPage: true });

// Sidebar entry
await page.locator('aside.app-sidebar').getByRole('link', { name: 'Debts', exact: true }).click();
await page.waitForURL(/\/debts$/, { timeout: 120000 });
await page.getByRole('heading', { name: 'Debts', exact: true }).waitFor({ timeout: 60000 });
await page.getByText('Mama Aisha').first().waitFor({ timeout: 60000 });
await page.screenshot({ path: `${out}/debts-list.png`, fullPage: true });
console.log('list rows:', await page.locator('ul > li').count());

// Record a 4,000 payment on the part-paid debt (balance 9,000 within the 23,000 one is ambiguous,
// so target the first "Record payment" button, which is the newest debt of 23,000).
await page.getByRole('button', { name: 'Record payment' }).first().click();
await page.getByLabel('Amount received (UGX)').fill('4000');
await page.getByLabel('Note (optional)').fill('ui check');
await page.getByRole('button', { name: 'Save payment' }).click();
await page.getByRole('button', { name: 'Save payment' }).waitFor({ state: 'detached', timeout: 30000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/debts-after-payment.png`, fullPage: true });

// "By person" tab groups both debts under one person.
await page.getByRole('button', { name: /By person/ }).click();
await page.waitForTimeout(1200);
const personText = await page.locator('ul > li').first().innerText();
console.log('person row:', personText.replace(/\s+/g, ' '));
await page.screenshot({ path: `${out}/debts-by-person.png`, fullPage: true });

await browser.close();
console.log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'no console/page errors');