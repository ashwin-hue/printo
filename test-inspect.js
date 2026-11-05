import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

async function run() {
  console.log('Starting preview server...');
  const server = spawn('cmd.exe', ['/c', 'npm.cmd', 'run', 'preview', '--', '--port', '4173'], {
    cwd: process.cwd(),
    stdio: 'pipe',
  });

  server.stdout.on('data', (d) => console.log('server:', d.toString()));
  server.stderr.on('data', (d) => console.log('server err:', d.toString()));

  // Wait 3 seconds for server to boot
  await new Promise((r) => setTimeout(r, 3500));

  console.log('Launching Playwright Chromium...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  const screenshotsDir = path.join(process.cwd(), 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir);
  }

  try {
    console.log('Navigating to http://localhost:4173...');
    await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });

    // Screenshot 1: Hero & Problem Section
    await page.screenshot({ path: path.join(screenshotsDir, '1-hero-landing.png'), fullPage: false });
    console.log('Captured 1-hero-landing.png');

    // Scroll to interactive calculator
    await page.evaluate(() => window.scrollBy(0, 1100));
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(screenshotsDir, '2-calculator-howitworks.png'), fullPage: false });
    console.log('Captured 2-calculator-howitworks.png');

    // Navigate to Find Shops
    await page.click('text=Find Shops');
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(screenshotsDir, '3-shops.png'), fullPage: false });
    console.log('Captured 3-shops.png');

    // Click Map View in Shops
    await page.click('text=Campus Map');
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(screenshotsDir, '4-campus-map.png'), fullPage: false });
    console.log('Captured 4-campus-map.png');

    // Navigate to Upload & Print Wizard
    await page.click('text=Upload & Print');
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(screenshotsDir, '5-order-wizard.png'), fullPage: false });
    console.log('Captured 5-order-wizard.png');

    // Navigate to Shop Dashboard
    await page.click('text=Shop Dashboard');
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(screenshotsDir, '6-shop-dashboard.png'), fullPage: false });
    console.log('Captured 6-shop-dashboard.png');

    // Open PDF Preview in Shop Dashboard
    const previewBtn = await page.$('text=Preview PDF in Browser');
    if (previewBtn) {
      await previewBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(screenshotsDir, '7-pdf-preview-modal.png'), fullPage: false });
      console.log('Captured 7-pdf-preview-modal.png');
      await page.click('text=Print Document Now'); // verifies button is clickable
    }

    // Mobile Viewport test
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotsDir, '8-mobile-hero.png'), fullPage: false });
    console.log('Captured 8-mobile-hero.png');

    console.log('All screenshots captured successfully!');
  } catch (err) {
    console.error('Playwright inspection error:', err);
  } finally {
    await browser.close();
    server.kill();
    process.exit(0);
  }
}

run();

