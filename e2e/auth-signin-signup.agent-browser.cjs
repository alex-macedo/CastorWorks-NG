#!/usr/bin/env node
/**
 * E2E: Auth sign-in, sign-up, and onboarding (CastorWorks-NG).
 * Uses ACCOUNT_TEST_EMAIL / ACCOUNT_TEST_EMAIL_PASSWORD for sign-in.
 * Optional: ACCOUNT_SIGNUP_EMAIL / ACCOUNT_SIGNUP_PASSWORD to also validate sign-up then sign-in.
 * After sign-in, if on /onboarding, completes onboarding with workspace E2E_ONBOARDING_WORKSPACE_NAME
 * (default "Eagle Construtora").
 * Run: BASE_URL=http://localhost:5181 npm run test:e2e -- auth-signin-signup
 * Or: bash scripts/agent-browser-e2e.sh auth-signin-signup
 */

const fs = require('fs')
const { spawnSync } = require('child_process')

const baseUrl = process.env.BASE_URL || 'http://localhost:5181'
const session = `e2e-auth-signin-signup-${Date.now()}`
const outDir = 'test-results/auth-signin-signup'

const readEnv = (key) => {
  const file = fs.existsSync('.env.testing') ? '.env.testing' : '.env'
  if (!fs.existsSync(file)) return process.env[key]
  const line = fs.readFileSync(file, 'utf8').split('\n').find((l) => l.startsWith(`${key}=`))
  if (!line) return process.env[key]
  return line.replace(/^[^=]+=/, '').replace(/^"|"$/g, '').trim()
}

const testEmail = process.env.ACCOUNT_TEST_EMAIL || readEnv('ACCOUNT_TEST_EMAIL')
const testPassword = process.env.ACCOUNT_TEST_EMAIL_PASSWORD || readEnv('ACCOUNT_TEST_EMAIL_PASSWORD')
const signupEmail = process.env.ACCOUNT_SIGNUP_EMAIL || readEnv('ACCOUNT_SIGNUP_EMAIL')
const signupPassword = process.env.ACCOUNT_SIGNUP_PASSWORD || readEnv('ACCOUNT_SIGNUP_PASSWORD')
const onboardingWorkspaceName = process.env.E2E_ONBOARDING_WORKSPACE_NAME || readEnv('E2E_ONBOARDING_WORKSPACE_NAME') || 'Eagle Construtora'

if (!testEmail || !testPassword) {
  console.error('Missing ACCOUNT_TEST_EMAIL and ACCOUNT_TEST_EMAIL_PASSWORD in .env.testing or env')
  process.exit(1)
}

// agent-browser 0.8.7+ has better daemon startup when run from scripts; older versions often report "Daemon failed to start"
const versionOut = spawnSync('agent-browser', ['--version'], { encoding: 'utf8', shell: false })
const versionStr = (versionOut.stdout || versionOut.stderr || '').trim()
const versionMatch = versionStr.match(/(\d+)\.(\d+)\.(\d+)/)
if (versionMatch) {
  const [, major, minor, patch] = versionMatch.map(Number)
  const isOld = major < 0 || (major === 0 && minor < 8) || (major === 0 && minor === 8 && patch < 7)
  if (isOld) {
    console.warn('⚠ agent-browser', versionStr, '< 0.8.7 can fail with "Daemon failed to start" when run from scripts. Upgrade: npm i -g agent-browser@latest')
  }
}

fs.mkdirSync(outDir, { recursive: true })

const run = (args, { allowFail = false, returnOutput = false } = {}) => {
  const result = spawnSync('agent-browser', ['--session', session, ...args], {
    encoding: 'utf8',
    shell: false,
    env: process.env,
  })
  if (result.status !== 0) {
    const err = (result.stderr || result.error?.message || 'agent-browser failed').trim()
    if (allowFail) return false
    throw new Error(err || 'agent-browser failed')
  }
  return returnOutput ? (result.stdout || '').trim() : true
}

// Click sign-in submit (i18n: Sign In, Entrar, Iniciar sesión, Se connecter)
const clickSignInSubmit = () => {
  const labels = ['Sign In', 'Sign in', 'Entrar', 'Iniciar sesión', 'Se connecter', 'Signing in...', 'Entrando...']
  for (const label of labels) {
    if (run(['click', `text=${label}`], { allowFail: true })) return true
  }
  return run(['click', 'button[type=submit]'], { allowFail: true })
}

// Click sign-up submit (i18n: Sign up, Criar conta, etc.)
const clickSignUpSubmit = () => {
  const labels = ['Sign up', 'Create account', 'Criar conta', 'Crear cuenta', 'Créer un compte', 'Creating...', 'Criando...']
  for (const label of labels) {
    if (run(['click', `text=${label}`], { allowFail: true })) return true
  }
  return run(['click', 'button[type=submit]'], { allowFail: true })
}

// Click onboarding submit (i18n: Create workspace, Criar workspace, etc.)
const clickOnboardingSubmit = () => {
  // Prefer submit button by selector for reliability
  if (run(['click', 'button[type=submit]'], { allowFail: true })) return true
  const labels = ['Create workspace', 'Criar workspace', 'Crear espacio', 'Créer l\'espace', 'Create', 'Creating...', 'Criando...', 'Création...']
  for (const label of labels) {
    if (run(['click', `text=${label}`], { allowFail: true })) return true
  }
  return false
}

const runSignIn = (email, password, label) => {
  run(['open', `${baseUrl}/login`])
  run(['wait', '2000'])
  run(['fill', '#email', email])
  run(['fill', '#password', password])
  run(['wait', '500'])
  if (!clickSignInSubmit()) {
    throw new Error(`${label}: could not click sign-in submit`)
  }
  // Poll for navigation off /login (up to 30s: 15 x 2s)
  let url = run(['get', 'url'], { returnOutput: true })
  for (let i = 0; i < 15 && url.includes('/login'); i++) {
    run(['wait', '2000'])
    url = run(['get', 'url'], { returnOutput: true })
  }
  run(['screenshot', `${outDir}/${label}.png`, '--full'])
  if (url.includes('/login')) {
    throw new Error(`${label}: still on /login after sign-in (check SSL, CORS, or credentials)`)
  }
  return url
}

// Slug from name for unique constraint (e.g. eagle-construtora-e2e-1738...)
const slugForName = (name) =>
  name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'workspace'

// Complete onboarding if current URL is /onboarding (workspace name e.g. "Eagle Construtora").
const runOnboardingIfNeeded = (labelPrefix) => {
  let url = run(['get', 'url'], { returnOutput: true })
  if (!url.includes('/onboarding')) return url
  const uniqueSlug = `${slugForName(onboardingWorkspaceName)}-e2e-${Date.now()}`
  console.log(`  Onboarding: creating workspace "${onboardingWorkspaceName}" (slug: ${uniqueSlug})...`)
  run(['fill', '#onboarding-name', onboardingWorkspaceName])
  run(['wait', '500'])
  run(['fill', '#onboarding-slug', uniqueSlug])
  run(['wait', '500'])
  run(['screenshot', `${outDir}/${labelPrefix}-onboarding-filled.png`, '--full'])
  if (!clickOnboardingSubmit()) {
    throw new Error(`${labelPrefix}: could not click onboarding submit`)
  }
  run(['wait', '3000'])
  for (let i = 0; i < 15; i++) {
    url = run(['get', 'url'], { returnOutput: true })
    if (!url.includes('/onboarding')) break
    run(['wait', '2000'])
  }
  run(['screenshot', `${outDir}/${labelPrefix}-after-onboarding.png`, '--full'])
  if (url.includes('/onboarding')) {
    throw new Error(
      `${labelPrefix}: still on /onboarding after submit. ` +
      'Ensure migrations 20260301000001, 20260301100000, 20260301100001 are applied on the NG DB (tenants, tenants INSERT, tenant_users INSERT via tenant_exists). ' +
      'Check test-results/auth-signin-signup/*.png for toast errors.'
    )
  }
  console.log(`  ✅ Onboarding passed (workspace: ${onboardingWorkspaceName})`)
  return url
}

try {
  console.log('🔐 Auth E2E: sign-in, sign-up, and onboarding validation')
  console.log(`  Workspace name: ${onboardingWorkspaceName}`)

  // --- Sign-in with existing test user ---
  console.log('  Sign-in with ACCOUNT_TEST_EMAIL...')
  runSignIn(testEmail, testPassword, '01-signin-success')
  console.log('  ✅ Sign-in passed')

  // --- Onboarding (if redirected to /onboarding) ---
  runOnboardingIfNeeded('02')

  // --- Optional: sign-up then sign-in with new user ---
  if (signupEmail && signupPassword) {
    console.log('  Sign-up with ACCOUNT_SIGNUP_EMAIL...')
    run(['open', `${baseUrl}/login`])
    run(['wait', '2000'])
    // Switch to sign-up (link text varies by locale)
    const signUpLink = run(['click', 'text=Sign up'], { allowFail: true }) ||
      run(['click', 'text=Create account'], { allowFail: true }) ||
      run(['click', 'text=Criar conta'], { allowFail: true }) ||
      run(['click', 'a[href*="signup"]'], { allowFail: true })
    if (!signUpLink) {
      console.warn('  ⚠ Could not find sign-up link; skipping sign-up flow')
    } else {
      run(['wait', '1000'])
      run(['fill', '#email', signupEmail])
      run(['fill', '#password', signupPassword])
      if (!clickSignUpSubmit()) {
        throw new Error('Could not click sign-up submit')
      }
      run(['wait', '6000'])
      const afterSignUp = run(['get', 'url'], { returnOutput: true })
      run(['screenshot', `${outDir}/02-after-signup.png`, '--full'])
      if (afterSignUp.includes('/login')) {
        throw new Error('Still on login after sign-up (check create-user Edge Function or Auth)')
      }
      console.log('  ✅ Sign-up passed')
      // Sign out then sign-in with new user to validate full flow (optional: skip if no sign-out UI easily)
      runSignIn(signupEmail, signupPassword, '03-signin-after-signup')
      console.log('  ✅ Sign-in after sign-up passed')
      runOnboardingIfNeeded('04')
    }
  } else {
    console.log('  (Skip sign-up: set ACCOUNT_SIGNUP_EMAIL and ACCOUNT_SIGNUP_PASSWORD to run sign-up flow)')
  }

  console.log('✅ Auth sign-in/sign-up/onboarding E2E passed')
  console.log(`📸 Screenshots: ${outDir}`)
} catch (err) {
  console.error('❌ Auth E2E failed:', err.message)
  process.exit(1)
} finally {
  run(['close'], { allowFail: true })
}
