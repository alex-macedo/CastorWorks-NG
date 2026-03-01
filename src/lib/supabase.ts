// Compatibility shim - re-export the single source-of-truth supabase client
export { supabase } from '@/integrations/supabase/client';

// Deprecated: old imports may reference '@/lib/supabase'. Keep this shim
// so those files don't break during refactor.
