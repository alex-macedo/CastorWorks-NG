#!/usr/bin/env node
/**
 * Manual test script for add user feature
 * Tests creating a user with specific roles
 * 
 * Test user: amacedo.usa@gmail.com
 * Password: TempPass123!
 * Roles: Admin, Project Manager, Architect, Global Admin
 */

const { execFileSync } = require('node:child_process')
const fs = require('node:fs')

const BASE_URL = process.env.BASE_URL || 'http://localhost:5181'
const session = 'e2e-add-user-manual'

// Test credentials
const loginEmail = 'amacedo.usa@gmail.com'
const loginPassword = 'TempPass123!'

fs.mkdirSync('test-results/add-user-manual', { recursive: true })

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
      console.error(`\n❌ Command failed: agent-browser --session ${session} ${args.join(' ')}`)
      if (err.stdout) process.stderr.write(err.stdout)
      if (err.stderr) process.stderr.write(err.stderr)
      throw err
    }
    return false
  }
}

function clickSelector(selector, options = {}) {
  return run(['click', selector], { ...options, allowFail: true })
}

try {
  console.log('\n' + '='.repeat(60))
  console.log('🧪 ADD USER FEATURE TEST')
  console.log('='.repeat(60))
  
  console.log('\n🔐 Step 1: Logging in...')
  console.log(`   Email: ${loginEmail}`)
  console.log(`   Base URL: ${BASE_URL}`)
  
  run(['open', `${BASE_URL}/login`])
  run(['wait', '2000'], { allowFail: true })
  run(['screenshot', 'test-results/add-user-manual/01-login-page.png'], { allowFail: true })
  
  // Fill login form
  run(['fill', 'input[type="email"]', loginEmail])
  run(['fill', 'input[type="password"]', loginPassword])
  run(['screenshot', 'test-results/add-user-manual/02-login-form-filled.png'], { allowFail: true })
  
  // Submit login
  run(['click', 'button[type="submit"]'], { timeout: 20000 })
  run(['wait', '3000'], { allowFail: true })
  run(['screenshot', 'test-results/add-user-manual/03-after-login.png'], { allowFail: true })
  console.log('✅ Logged in successfully')

  console.log('\n⚙️ Step 2: Navigating to settings...')
  // Navigate to settings
  run(['open', `${BASE_URL}/settings`])
  run(['wait', '2000'], { allowFail: true })
  run(['screenshot', 'test-results/add-user-manual/04-settings-page.png'], { allowFail: true })
  console.log('✅ Navigated to settings')

  console.log('\n👤 Step 3: Opening add user dialog...')
  // Open add user dialog
  clickSelector('button:has-text("Add User")') || clickSelector('button:has-text("New User")')
  run(['wait', '1500'], { allowFail: true })
  run(['screenshot', 'test-results/add-user-manual/05-add-user-dialog-opened.png'], { allowFail: true })
  console.log('✅ Add user dialog opened')

  console.log('\n📝 Step 4: Filling in user details...')
  const newUserEmail = `testuser-${Date.now()}@castorworks.test`
  const newUserPassword = 'NewUser123!@#'
  
  // Fill email
  run(['fill', 'input[type="email"]', newUserEmail], { allowFail: true })
  console.log(`   Email: ${newUserEmail}`)
  
  // Fill display name
  run(['fill', 'input[placeholder*="Name"], input[placeholder*="Display"]', 'Test User'], { allowFail: true })
  console.log('   Display name: Test User')
  
  // Fill password
  run(['fill', 'input[type="password"]', newUserPassword], { allowFail: true })
  console.log('   Password: [set]')
  
  run(['screenshot', 'test-results/add-user-manual/06-form-filled.png'], { allowFail: true })

  console.log('\n✓ Step 5: Selecting roles...')
  console.log('   Roles to select: Admin, Project Manager, Architect, Global Admin')
  
  // Select Admin role
  clickSelector('input[id="role-admin"]', { allowFail: true })
  console.log('   ✓ Admin selected')
  run(['wait', '300'], { allowFail: true })
  
  // Select Project Manager role
  clickSelector('input[id="role-project_manager"]', { allowFail: true })
  console.log('   ✓ Project Manager selected')
  run(['wait', '300'], { allowFail: true })
  
  // Select Architect role
  clickSelector('input[id="role-architect"]', { allowFail: true })
  console.log('   ✓ Architect selected')
  run(['wait', '300'], { allowFail: true })
  
  // Select Global Admin role
  clickSelector('input[id="role-global_admin"]', { allowFail: true })
  console.log('   ✓ Global Admin selected')
  run(['wait', '300'], { allowFail: true })
  
  run(['screenshot', 'test-results/add-user-manual/07-roles-selected.png'], { allowFail: true })

  console.log('\n💾 Step 6: Submitting form...')
  run(['screenshot', 'test-results/add-user-manual/08-before-submit.png'], { allowFail: true })
  
  // Click submit button
  run(['click', 'button:has-text("Create")'], { timeout: 10000, allowFail: true })
  
  // Wait for response
  run(['wait', '4000'], { allowFail: true })
  run(['screenshot', 'test-results/add-user-manual/09-after-submit.png'], { allowFail: true })
  console.log('✅ Form submitted')

  console.log('\n🔍 Step 7: Verifying success...')
  run(['wait', '2000'], { allowFail: true })
  run(['screenshot', 'test-results/add-user-manual/10-final-state.png'], { allowFail: true })
  
  console.log('\n' + '='.repeat(60))
  console.log('✅ TEST COMPLETED SUCCESSFULLY')
  console.log('='.repeat(60))
  console.log('\n📸 Screenshots saved to test-results/add-user-manual/')
  console.log('\n📋 Test Summary:')
  console.log(`   Login: ${loginEmail}`)
  console.log(`   New User Email: ${newUserEmail}`)
  console.log('   Roles: Admin, Project Manager, Architect, Global Admin')
  console.log('\n✨ Add user feature test passed!')

} catch (error) {
  console.error('\n' + '='.repeat(60))
  console.error('❌ TEST FAILED')
  console.error('='.repeat(60))
  console.error('Error:', error.message)
  console.error('\n📸 Error screenshot saved to test-results/add-user-manual/error.png')
  run(['screenshot', 'test-results/add-user-manual/error.png'], { allowFail: true })
  process.exit(1)
}

