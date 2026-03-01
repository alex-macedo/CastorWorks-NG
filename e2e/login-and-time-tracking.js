const fs = require('fs');

module.exports = async (page, context) => {
  const base = process.env.BASE_URL || 'http://localhost:5173';
  const email = process.env.ACCOUNT_TEST_EMAIL;
  const pass = process.env.ACCOUNT_TEST_EMAIL_PASSWORD;

  if (!email || !pass) {
    throw new Error('Missing ACCOUNT_TEST_EMAIL or ACCOUNT_TEST_EMAIL_PASSWORD in environment');
  }

  const logs = [];
  page.on('console', msg => logs.push(`${msg.type()}: ${msg.text()}`));

  // Go to login
  await page.goto(`${base}/login`, { waitUntil: 'networkidle' });

  // Fill login form (common selectors used in CastorWorks)
  await page.fill('#email', email).catch(() => {});
  await page.fill('#password', pass).catch(() => {});

  // Submit
  const submitSel = 'button[type=submit], button:has-text("Sign in"), button:has-text("Sign In")';
  const submit = await page.$(submitSel);
  if (submit) {
    await submit.click();
  } else {
    // try clicking by text
    await page.click('text="Sign in"').catch(() => {});
  }

  // Wait for navigation to complete and auth to settle
  await page.waitForTimeout(2000);
  try {
    await page.waitForNavigation({ timeout: 10000 });
  } catch (e) {
    // continue even if navigation didn't occur
  }

  // Go to time-tracking page
  await page.goto(`${base}/architect/time-tracking`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Try Start -> Stop timer flow
  try {
    const startBtn = await page.waitForSelector('button:has-text("Start"), button:has-text("Start timer"), button:has-text("Iniciar")', { timeout: 4000 });
    await startBtn.click();
    await page.waitForTimeout(1500);
    const stopBtn = await page.waitForSelector('button:has-text("Stop"), button:has-text("Stop timer"), button:has-text("Parar")', { timeout: 4000 });
    await stopBtn.click();
  } catch (e) {
    // If start/stop not present, ignore
  }

  // Take screenshot after interaction
  const outDir = 'artifacts';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  await page.screenshot({ path: `${outDir}/time-tracking-after-interaction.png`, fullPage: true });

  // Save console logs
  fs.writeFileSync(`${outDir}/agent-browser-time-tracking-console.log`, logs.join('\n'));

  return { success: true };
};
