#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const URL = process.env.URL || 'http://localhost:5173/';
const OUT_DIR = path.resolve(process.cwd(), 'tmp-capture');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

(async () => {
  console.log('Launching headless Chromium to capture console logs...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    const location = msg.location ? `${msg.location().url}:${msg.location().lineNumber}` : '';
    const entry = { type, text, location, timestamp: new Date().toISOString() };
    logs.push(entry);
    console.log('[BROWSER]', type, text);
  });

  page.on('pageerror', err => {
    const entry = { type: 'pageerror', text: String(err), timestamp: new Date().toISOString() };
    logs.push(entry);
    console.error('[PAGE ERROR]', err);
  });

  try {
    await page.goto(URL, { waitUntil: 'networkidle' });
    // Give app some time to boot and for React to mount
    await page.waitForTimeout(3000);
    const screenshotPath = path.join(OUT_DIR, 'capture.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log('Saved screenshot to', screenshotPath);
  } catch (err) {
    console.error('Error while loading page:', err);
  } finally {
    const logPath = path.join(OUT_DIR, 'console-log.json');
    fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));
    console.log('Saved console log to', logPath);
    await browser.close();
    console.log('Browser closed');
  }
})().catch(err => {
  console.error('Fatal error in capture script:', err);
  process.exit(1);
});
