#!/bin/bash
# Fix bg-accent in pages

echo "Fixing accent colors in page files..."

# Fix all pages at once
for file in src/pages/Settings.tsx \
            src/pages/FinancialInvoice.tsx \
            src/pages/PurchaseRequest.tsx \
            src/pages/Cliente.tsx \
            src/pages/Procurement.tsx \
            src/pages/ProjectDetail.tsx \
            src/pages/Financial.tsx \
            src/pages/Campaigns.tsx \
            src/pages/Clientes.tsx \
            src/pages/Obras.tsx \
            src/pages/Contractors.tsx \
            src/pages/CalendarPage.tsx \
            src/pages/Weather.tsx \
            src/pages/ClientAccessAnalytics.tsx; do
  if [ -f "$file" ]; then
    # Replace bg-accent with proper alternatives
    sed -i '' 's/className="bg-accent hover:bg-accent\/90"/className=""/g' "$file"
    sed -i '' 's/className="bg-accent text-accent-foreground hover:bg-accent\/90"/className=""/g' "$file"
    sed -i '' 's/hover:bg-accent/hover:bg-primary\/10/g' "$file"
    sed -i '' 's/bg-accent\/50/bg-primary\/10/g' "$file"
    sed -i '' 's/bg-accent\/20/bg-primary\/20/g' "$file"
    sed -i '' 's/ bg-accent / /g' "$file"
    echo "  ✅ Fixed $(basename $file)"
  fi
done

echo "🎉 All page files fixed!"
