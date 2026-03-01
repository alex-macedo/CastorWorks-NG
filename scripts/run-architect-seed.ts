import 'dotenv/config'
import { createArchitectDemoDataActions } from '../src/components/Settings/DemoData/architectSeedActions'
import { supabase } from '../src/integrations/supabase/client'

// If ACCOUNT_TEST_EMAIL and ACCOUNT_TEST_EMAIL_PASSWORD are available in env,
// sign in as that user so DB inserts run under that user's auth context.
const trySignInArchitectUser = async () => {
  const email = process.env.ACCOUNT_TEST_EMAIL;
  const pass = process.env.ACCOUNT_TEST_EMAIL_PASSWORD;
  if (!email || !pass) return false;

  try {
    console.log('[seed-run] Signing in as ACCOUNT_TEST_EMAIL user for seeding...');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) {
      console.warn('[seed-run] signInWithPassword failed:', error.message);
      return false;
    }
    console.log('[seed-run] Signed in as user:', data.user?.id);
    return true;
  } catch (e: any) {
    console.warn('[seed-run] signIn exception:', e?.message || e);
    return false;
  }
}

const logHandler = (type: any, message: string, phase?: string) => {
  console.log(`[${type}]${phase ? `(${phase})` : ''} ${message}`)
}

async function run() {
  try {
    const actions = createArchitectDemoDataActions(logHandler as any)
    console.log('Starting architect seeding...')

    // Attempt to sign in as test account if available (so inserts run under that user)
    const signedIn = await trySignInArchitectUser()
    if (!signedIn) {
      console.log('[seed-run] ACCOUNT_TEST_EMAIL not provided or sign-in failed. You can set SKIP_AUTH_FOR_SEED=1 to bypass auth checks for local debugging.');
    }

    const result = await actions.executeArchitectSeeding()
    console.log('Seeding result:', JSON.stringify(result, null, 2))
    process.exit(0)
  } catch (err: any) {
    console.error('Seeding failed:', err && err.stack ? err.stack : err)
    process.exit(2)
  }
}

run()
