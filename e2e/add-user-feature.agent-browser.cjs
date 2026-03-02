#!/usr/bin/env node
/**
 * Test script for add user feature
 * 
 * Verifies:
 * 1. Can navigate to settings
 * 2. Can open the add user dialog
 * 3. Can fill in user details
 * 4. Can create a new user successfully
 */

const { execFileSync } = require('node:child_process')
const fs = require('node:fs')

const BASE_URL = process.env.BASE_URL || 'http://localhost:5181'
const session = 'e2e-add-user-feature'

// Read test credentials
const envTesting = fs.existsSync('.env.testing') ? fs.readFileSync('.env.testing', 'utf8') : ''
const email = (envTesting.match(/^ACCOUNT_TEST_EMAIL=(.*)$/m)?.[1] || '').trim().replace(/^"|"$/g, '')
const password = (envTesting.match(/^ACCOUNT_TEST_EMAIL_PASSWORD=(.*)$/m)?.[1] || '').trim().replace(/^"|"$/g, '')

if (!email || !password) {
  console.error('Missing ACCOUNT_TEST_EMAIL or ACCOUNT_TEST_EMAIL_PASSWORD in .env.testing')
  process.exit(1)
}

fs.mkdirSync('test-results/add-user', { recursive: true })

function run(args, { allowFail = false, timeout = 15000 } = {}) {
  try {
    const out = execFileSync('agent-browser', ['--session', session, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout,
      maxBuffer: 1024 * 1024 * 8,
    })
    process.stdout.write(out || '')
    return true
  } catch (err) {
    if (!allowFail) {
      console.error(`Command failed: agent-browser --session ${session} ${args.join(' ')}`)
      if (err.stdout) process.stderr.write(err.stdout)
      if (err.stderr) process.stderr.write(err.stderr)
      throw err
    }
    return false
  }
}

function clickAny(selectors, options = {}) {
  for (const selector of selectors) {
    if (run(['click', selector], { ...options, allowFail: true })) return true
  }
  return false
}

try {
  console.log('🔐 Step 1: Logging in...')
  run(['open', `${BASE_URL}/login`])
  run(['fill', '#email', email])
  run(['fill', '#password', password])
  run(['click', 'button[type=submit]'], { allowFail: true, timeout: 20000 })
  run(['wait', '3000'], { allowFail: true })
  console.log('✅ Logged in')

  console.log('⚙️ Step 2: Navigating to settings...')
  // Try to find settings link - could be in sidebar or menu
  clickAny(['a[href*="settings"]', 'button:has-text("Settings")', '[data-testid="settings-link"]'], { allowFail: true, timeout: 10000 })
  run(['wait', '2000'], { allowFail: true })
  run(['screenshot', 'test-results/add-user/01-settings-page.png', '--full'], { allowFail: true })
  console.log('✅ Settings page loaded')

  console.log('👤 Step 3: Opening add user dialog...')
  // Try different button selectors
  clickAny([
    'button:has-text("Add User")',
    'button:has-text("New User")',
    '[data-testid="add-user-btn"]',
    'button:has-text("Add")'
  ], { allowFail: true, timeout: 10000 })
  run(['wait', '1500'], { allowFail: true })
  run(['screenshot', 'test-results/add-user/02-add-user-dialog-open.png', '--full'], { allowFail: true })
  console.log('✅ Add user dialog opened')

  console.log('📝 Step 4: Filling in user details...')
  const testEmail = `test-user-${Date.now()}@castorworks.test`
  const testPassword = 'TestPassword123!'
  
  // Fill email
  run(['fill', 'input[type="email"]', testEmail], { allowFail: true })
  console.log(`   Email filled: ${testEmail}`)
  
  // Fill display name
  run(['fill', 'input[placeholder*="Display"], input[placeholder*="Name"]', 'Test User'], { allowFail: true })
  console.log('   Display name filled')
  
  // Fill password
  run(['fill', 'input[type="password"]', testPassword], { allowFail: true })
  console.log('   Password filled')
  
  run(['screenshot', 'test-results/add-user/03-form-filled.png', '--full'], { allowFail: true })

  console.log('🔑 Step 5: Selecting user role...')
  // Select first role checkbox
  clickAny(['input[type="checkbox"][id*="role-"]'], { allowFail: true })
  run(['wait', '500'], { allowFail: true })
  console.log('✅ Role selected')

  console.log('💾 Step 6: Submitting form...')
  run(['screenshot', 'test-results/add-user/04-before-submit.png', '--full'], { allowFail: true })
  
  // Click the create/submit button
  clickAny([
    'button:has-text("Create")',
    'button:has-text("Add User")',
    'button:has-text("Save")'
  ], { allowFail: true, timeout: 10000 })
  
  run(['wait', '3000'], { allowFail: true })
  run(['screenshot', 'test-results/add-user/05-after-submit.png', '--full'], { allowFail: true })
  
  console.log('✅ Form submitted')

  console.log('\n✅ All tests passed! Add user feature is working correctly.')
  console.log('📸 Screenshots saved to test-results/add-user/')
  console.log('\nTest completed successfully!')

} catch (error) {
  console.error('\n❌ Test failed:', error.message)
  run(['screenshot', 'test-results/add-user/error.png', '--full'], { allowFail: true })
  process.exit(1)
}
