# Apply Architect Module Migration

## Quick Fix for "Could not find the table 'public.architect_tasks'" Error

### Option 1: Via Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to: https://app.supabase.com
   - Select your project
   - Click **SQL Editor** in the left sidebar
   - Click **New query**

2. **Run the Consolidated Migration**
   - Open the file: `supabase/migrations/20251120000000_consolidated_architect_module.sql`
   - Copy the entire contents
   - Paste into the SQL Editor
   - Click **RUN** (or press Ctrl/Cmd + Enter)

3. **Verify Migration**
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name LIKE 'architect_%'
   ORDER BY table_name;
   ```
   
   Expected result: Should show all architect tables including `architect_tasks`

### Option 2: Via Supabase CLI

```bash
# Link to your project (if not already linked)
supabase link --project-ref YOUR_PROJECT_REF

# Push migrations
supabase db push

# Verify
supabase db remote changes
```

### Option 3: Verify Table Exists

Run this query in SQL Editor to check:

```sql
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'architect_tasks'
    ) 
    THEN '✅ architect_tasks table exists'
    ELSE '❌ architect_tasks table MISSING'
  END AS status;
```

## After Migration

1. Refresh the Architect Tasks page
2. The error should be resolved
3. You should be able to create and manage architect tasks

## Troubleshooting

If the migration fails:
- Check for syntax errors in the SQL
- Ensure you have proper permissions
- Verify all dependencies (projects, project_phases, user_profiles tables exist)
- Check the Supabase logs for detailed error messages

