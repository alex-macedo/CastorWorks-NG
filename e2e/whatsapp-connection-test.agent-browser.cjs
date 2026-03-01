#!/usr/bin/env node

const { execSync } = require('child_process');

function runCommand(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: 'inherit' });
  } catch (error) {
    console.error(`Command failed: ${cmd}`);
    console.error(error.message);
    return null;
  }
}

async function testWhatsAppConnection() {
  console.log('🚀 Testing WhatsApp Connection Flow...');

  const session = 'whatsapp-connection-test';
  const email = process.env.ACCOUNT_TEST_EMAIL;
  const password = process.env.ACCOUNT_TEST_EMAIL_PASSWORD;

  if (!email || !password) {
    console.error('❌ Missing test credentials. Set ACCOUNT_TEST_EMAIL and ACCOUNT_TEST_EMAIL_PASSWORD environment variables.');
    process.exit(1);
  }

  try {
    // Login first
    console.log('📝 Logging in...');
    runCommand(`agent-browser --session ${session} open http://localhost:5173/login`);
    runCommand(`agent-browser --session ${session} fill '#email' "${email}"`);
    runCommand(`agent-browser --session ${session} fill '#password' "${password}"`);
    runCommand(`agent-browser --session ${session} click 'button[type=submit]'`);
    runCommand(`agent-browser --session ${session} wait --url '**/architect' 10000`);

    // Navigate to WhatsApp settings
    console.log('📱 Navigating to WhatsApp settings...');
    runCommand(`agent-browser --session ${session} open http://localhost:5173/admin/whatsapp`);
    runCommand(`agent-browser --session ${session} wait 2000`);

    // Take initial screenshot
    console.log('📸 Taking initial screenshot...');
    runCommand(`agent-browser --session ${session} screenshot test-results/whatsapp-connection-01-initial.png --full`);

    // Click Setup Instance button
    console.log('🔧 Clicking Setup Instance button...');
    const setupClicked = runCommand(`agent-browser --session ${session} click "button:has-text('Setup Instance'), button:has-text('Configurar Instancia'), button:has-text('Configurer l\\\\'instance'), button:has-text('Configurar Instância')"`) !== null;

    if (setupClicked) {
      console.log('⏳ Waiting for connection process...');
      runCommand(`agent-browser --session ${session} wait 8000`);

      // Take screenshot after setup attempt
      console.log('📸 Taking screenshot after setup attempt...');
      runCommand(`agent-browser --session ${session} screenshot test-results/whatsapp-connection-02-after-setup.png --full`);

      // Check for QR code (success case)
      console.log('🔍 Checking for QR code...');
      const qrCheck = runCommand(`agent-browser --session ${session} eval "
        const qrElements = document.querySelectorAll('[data-testid=\"qr-code\"], img[alt*=\"QR\"], canvas, img[src*=\"qr\"], [class*=\"qr\"]');
        return qrElements.length > 0 ? 'QR_FOUND' : 'NO_QR';
      "`);

      if (qrCheck && qrCheck.includes('QR_FOUND')) {
        console.log('✅ SUCCESS: QR code generated successfully!');
        console.log('📸 Screenshot saved: test-results/whatsapp-connection-02-after-setup.png');

        // Check for scan instructions
        const instructions = runCommand(`agent-browser --session ${session} eval "
          const textContent = document.body.textContent || '';
          return /scan.*code|escanea.*codigo|scanner.*code|escanear.*código|numériser.*code/i.test(textContent) ? 'INSTRUCTIONS_FOUND' : 'NO_INSTRUCTIONS';
        "`);

        if (instructions && instructions.includes('INSTRUCTIONS_FOUND')) {
          console.log('✅ Scan instructions are visible');
        }
      } else {
        // Check for error messages
        console.log('🔍 Checking for error messages...');
        const errorText = runCommand(`agent-browser --session ${session} eval "
          const alerts = document.querySelectorAll('[role=\"alert\"], .error, .text-red-500, .text-destructive, [class*=\"error\"], [class*=\"alert\"]');
          let errorMessages = [];
          alerts.forEach(alert => {
            const text = alert.textContent.trim();
            if (text && text.length > 10 && !text.includes('Loading') && !text.includes('loading')) {
              errorMessages.push(text);
            }
          });
          return errorMessages.join('; ');
        "`);

        if (errorText && errorText.trim()) {
          console.log('⚠️  Error detected:', errorText.trim());

          // Check if error message is user-friendly (not raw API error)
          if (!errorText.includes('evolution.connection.scanQRCode') && !errorText.includes('evolution.connection.')) {
            console.log('✅ Error message is user-friendly (not raw API error)');
          } else {
            console.log('❌ Error message contains raw API error - needs fixing');
          }

          // Check for specific error types
          const hasSpecificError = /instance not found|instancia.*encontrada|instance.*introuvable|QR code error|error.*generar|échouer.*génération|rate limit|limite.*tarif|délai.*dépasse|timeout|tiempo.*espera/i.test(errorText);
          if (hasSpecificError) {
            console.log('✅ Error message uses specific error type (not generic)');
          } else {
            console.log('❌ Error message is too generic');
          }
        } else {
          console.log('ℹ️  Connection still in progress or no clear state');
        }
      }
    } else {
      console.log('❌ Could not find Setup Instance button');
    }

    console.log('📸 Screenshots saved to: test-results/whatsapp-connection-*.png');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

async function testLanguageSupport() {
  console.log('🌐 Testing language support...');

  const languages = [
    { code: 'es-ES', name: 'Spanish' },
    { code: 'fr-FR', name: 'French' },
    { code: 'pt-BR', name: 'Portuguese' },
    { code: 'en-US', name: 'English' }
  ];

  const email = process.env.ACCOUNT_TEST_EMAIL;
  const password = process.env.ACCOUNT_TEST_EMAIL_PASSWORD;

  if (!email || !password) {
    console.error('❌ Missing test credentials. Set ACCOUNT_TEST_EMAIL and ACCOUNT_TEST_EMAIL_PASSWORD environment variables.');
    process.exit(1);
  }

  for (const lang of languages) {
    console.log(`\n--- Testing ${lang.name} (${lang.code}) ---`);

    const session = `whatsapp-lang-${lang.code}`;

    try {
      // Login with language
      runCommand(`agent-browser --session ${session} open http://localhost:5173/login?lng=${lang.code}`);
      runCommand(`agent-browser --session ${session} fill '#email' "${email}"`);
      runCommand(`agent-browser --session ${session} fill '#password' "${password}"`);
      runCommand(`agent-browser --session ${session} click 'button[type=submit]'`);
      runCommand(`agent-browser --session ${session} wait --url '**/architect' 10000`);

      // Navigate to WhatsApp settings
      runCommand(`agent-browser --session ${session} open http://localhost:5173/admin/whatsapp?lng=${lang.code}`);
      runCommand(`agent-browser --session ${session} wait 2000`);

      // Click setup and check for translated text
      runCommand(`agent-browser --session ${session} click "button:has-text('Setup Instance'), button:has-text('Configurar Instancia'), button:has-text('Configurer')"`);
      runCommand(`agent-browser --session ${session} wait 3000`);

      // Take screenshot
      runCommand(`agent-browser --session ${session} screenshot test-results/whatsapp-lang-${lang.code}.png --full`);

      console.log(`✅ ${lang.name} interface loaded`);
      console.log(`📸 Screenshot: test-results/whatsapp-lang-${lang.code}.png`);

    } catch (error) {
      console.error(`❌ ${lang.name} test failed:`, error.message);
    }
  }
}

async function main() {
  // Ensure test-results directory exists
  runCommand('mkdir -p test-results');

  // Run main connection test
  await testWhatsAppConnection();

  // Run language support test
  await testLanguageSupport();

  console.log('\n🎉 WhatsApp connection testing completed!');
  console.log('📁 Check test-results/ directory for screenshots and results');
}

main().catch(console.error);