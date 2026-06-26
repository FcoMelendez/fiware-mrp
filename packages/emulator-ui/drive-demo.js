const { chromium } = require('playwright');
const path = require('path');
const fs   = require('fs');

const SCRDIR = '/home/francisco/mrp-screenshots';
fs.mkdirSync(SCRDIR, { recursive: true });

async function shot(page, name) {
  await page.screenshot({ path: path.join(SCRDIR, name), fullPage: false });
  console.log('  → ' + name);
}

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const page    = await browser.newPage();
  await page.setViewportSize({ width: 1400, height: 900 });

  console.log('Navigating to emulator…');
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await shot(page, '01-initial.png');

  console.log('Switching to Tutorial 04…');
  await page.selectOption('#tutorial-selector', 'tutorial-04');
  await page.waitForTimeout(1000);
  await shot(page, '02-t04-loaded.png');

  for (let i = 0; i < 6; i++) {
    console.log('  Executing step ' + (i+1) + '…');
    const btn = page.locator('.btn-execute').first();
    const visible = await btn.isVisible({ timeout: 3000 }).catch(() => false);
    if (visible) { await btn.click(); await page.waitForTimeout(1500); }
    else console.log('    (no button at step ' + (i+1) + ')');
  }
  await shot(page, '03-all-steps-done.png');

  const dashEl = await page.$('#dashboard-bar');
  if (dashEl) { await dashEl.screenshot({ path: path.join(SCRDIR, '04-dashboard-bar.png') }); console.log('  → 04-dashboard-bar.png'); }

  await page.click('.rp-tab[data-tab="explorer"]');
  await page.waitForTimeout(800);
  await shot(page, '05-broker-explorer.png');

  await browser.close();
  console.log('Done.');
})().catch(e => { console.error(e); process.exit(1); });
