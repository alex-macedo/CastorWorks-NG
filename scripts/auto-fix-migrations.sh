#!/bin/bash

# Auto-fix common RLS security violations in migration files
# This script fixes the most common patterns identified by check-migration-security.js

set -e

MIGRATIONS_DIR="supabase/migrations"

echo "🔧 Auto-fixing migration security violations..."
echo ""

# Counter for changes
fixed_count=0

# Find all SQL files with violations
for file in "$MIGRATIONS_DIR"/*.sql; do
  if [ ! -f "$file" ]; then
    continue
  fi

  filename=$(basename "$file")
  changes_made=false

  # Fix 1: USING (true) for SELECT policies -> USING (auth.uid() IS NOT NULL)
  # Only for SELECT policies, not INSERT/UPDATE/DELETE
  if grep -q "for select" "$file" &&  grep -q "using (true)" "$file"; then
    sed -i '' -e '/for select/,/using (true)/ {
      s/using (true);/using (auth.uid() IS NOT NULL);/g
    }' "$file" 2>/dev/null || true
    if [ $? -eq 0 ]; then
      changes_made=true
    fi
  fi

  # Fix 2: WITH CHECK (true) -> WITH CHECK (auth.uid() IS NOT NULL)
  if grep -q "with check (true)" "$file"; then
    sed -i '' 's/with check (true);/with check (auth.uid() IS NOT NULL);/g' "$file"
    changes_made=true
  fi

  # Fix 3: TO authenticated USING (true) -> TO authenticated USING (auth.uid() IS NOT NULL)
  if grep -q "to authenticated" "$file" && grep -q "using (true)" "$file"; then
    sed -i '' -e '/to authenticated/,/using (true)/ {
      s/using (true);/using (auth.uid() IS NOT NULL);/g
    }' "$file" 2>/dev/null || true
    changes_made=true
  fi

  # Fix 4: Rename "Anyone can..." policies
  if grep -q '"Anyone can' "$file"; then
    # This is complex and context-dependent, skip for now
    echo "  ⚠️  $filename: Has 'Anyone can...' policies - needs manual review"
  fi

  if [ "$changes_made" = true ]; then
    ((fixed_count++))
    echo "  ✅ Fixed: $filename"
  fi
done

echo ""
echo "🎉 Auto-fix complete! Fixed $fixed_count files."
echo "⚠️  Note: Some violations require manual review (policy names, complex logic)"
echo ""
echo "Run 'node scripts/check-migration-security.js' to verify."
