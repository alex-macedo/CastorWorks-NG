import { chromium } from 'playwright';
import fs from 'fs';

async function run() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const logs: string[] = [];

  page.on('console', (msg) => {
    logs.push(`[console:${msg.type()}] ${msg.text()}`);
  });

  page.on('pageerror', (err) => {
    logs.push(`[pageerror] ${err.message}`);
  });

  const urls = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'];
  let loaded = false;
  for (const base of urls) {
    try {
      const res = await page.goto(base, { waitUntil: 'networkidle', timeout: 5000 });
      if (res && res.ok()) {
        loaded = true;
        break;
      }
    } catch (e) {
      // try next
    }
  }

  if (!loaded) {
    console.error('Could not reach dev server on ports 5173-5175');
    await browser.close();
    process.exit(2);
  }

  // navigate to procurement route
  try {
    await page.goto((await page.url()).replace(/\/$/, '') + '/procurement', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
  } catch (e) {
    // ignore
  }

  // take screenshot
  const outDir = 'test-results';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
  await page.screenshot({ path: `${outDir}/procurement.png`, fullPage: true });

  // save logs
  fs.writeFileSync(`${outDir}/console.log`, logs.join('\n'));

  await browser.close();
  console.log('Smoke test complete. Artifacts in test-results/');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
