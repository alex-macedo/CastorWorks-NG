#!/bin/bash
# Fix Logo Upload Bucket Configuration
# This script applies the necessary SQL migrations to fix the logo upload issue

set -e

echo "🔧 Logo Upload Bucket Fix"
echo "=========================="
echo ""

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

echo "✅ Project root detected"
echo ""

# Check for Supabase CLI
if ! command -v supabase &> /dev/null; then
    echo "⚠️  Supabase CLI not found. Using npx supabase instead..."
    SUPABASE_CMD="npx supabase"
else
    SUPABASE_CMD="supabase"
fi

echo "📋 Available Migrations:"
echo ""
echo "1. Apply all pending migrations (Recommended)"
echo "2. Apply only logo upload fix migrations"
echo "3. Manually verify current bucket configuration"
echo ""
read -p "Choose option (1-3): " option

case $option in
    1)
        echo ""
        echo "🚀 Applying all pending migrations..."
        $SUPABASE_CMD migration up
        echo "✅ Migrations applied successfully"
        ;;
    2)
        echo ""
        echo "🚀 Applying logo upload fix migrations..."
        echo ""
        echo "These migrations will be applied:"
        echo "  - 20251209000000_fix_logo_loading.sql"
        echo "  - 20251213000000_fix_logo_upload_bucket.sql"
        echo ""
        read -p "Continue? (y/n): " confirm
        if [[ $confirm == "y" || $confirm == "Y" ]]; then
            # Note: Supabase CLI applies all migrations in order, so we just apply pending
            $SUPABASE_CMD migration up
            echo "✅ Migrations applied"
        else
            echo "⏭️  Skipped"
        fi
        ;;
    3)
        echo ""
        echo "🔍 Checking bucket configuration..."
        echo ""
        echo "To verify in Supabase Dashboard:"
        echo "1. Go to https://app.supabase.com"
        echo "2. Select your project"
        echo "3. Navigate to Storage > Buckets"
        echo "4. Look for 'project-images' bucket"
        echo "5. Check that 'Public bucket' is enabled"
        echo ""
        echo "Or run this SQL query in Supabase SQL Editor:"
        echo ""
        cat << 'SQL'
SELECT 
    id, 
    name, 
    public,
    created_at,
    updated_at
FROM storage.buckets
WHERE id = 'project-images';
SQL
        echo ""
        ;;
    *)
        echo "❌ Invalid option"
        exit 1
        ;;
esac

echo ""
echo "📝 Manual Fix (if migrations don't work):"
echo ""
echo "Run this SQL in Supabase SQL Editor:"
echo ""
cat << 'SQL'
-- Make project-images bucket public
UPDATE storage.buckets
SET public = true
WHERE id = 'project-images';

-- Ensure bucket exists with public setting
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-images', 'project-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Add RLS policy for authenticated users
DROP POLICY IF EXISTS "Authenticated users can view project images" ON storage.objects;
CREATE POLICY "Authenticated users can view project images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'project-images');
SQL

echo ""
echo "✨ Next Steps:"
echo "1. Test logo upload in Settings > Company Profile"
echo "2. Verify logo displays correctly"
echo "3. Check browser console for any errors"
echo "4. If issues persist, check Supabase logs for more details"
echo ""
