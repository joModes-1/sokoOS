// Dev helper: full-page screenshot of the dashboard. node shot.mjs <outfile> [width]
import { chromium } from '@playwright/test';

const out = process.argv[2] ?? 'dashboard.png';
const width = Number(process.argv[3] ?? 1440);
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width, height: Number(process.argv[4] ?? 900) } });
await page.goto('http://localhost:3000/login');
await page.getByLabel('Email address').fill(process.env.EMAIL ?? 'owner01@sokoos.test');
await page.getByLabel('Password').fill(process.env.PASSWORD ?? 'Soko01Pass!2026');
await page.getByRole('button', { name: 'Sign in' }).click();
await page.waitForURL(/dashboard/, { timeout: 120000 });
await page.getByText("What's happening").waitFor({ timeout: 60000 });
await page.waitForTimeout(1200);
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log('saved', out);
