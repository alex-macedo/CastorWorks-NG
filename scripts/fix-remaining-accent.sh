#!/bin/bash
# Fix remaining bg-accent references

echo "Fixing remaining accent color references..."

# MetricCard hover effect
sed -i '' 's/hover:bg-accent\/50/hover:bg-primary\/10/g' src/components/Dashboard/MetricCard.tsx

# MicrosoftProjectLike milestone highlighting
sed -i '' 's/bg-accent\/20/bg-primary\/20/g' src/components/Projects/MicrosoftProjectLike.tsx

# MonthCalendar components
sed -i '' 's/bg-accent/bg-primary\/10/g' src/components/ClientPortal/Schedule/MonthCalendar.tsx
sed -i '' 's/bg-accent/bg-primary\/10/g' src/components/ClientPortal/Schedule/MonthCalendar.backup.tsx
sed -i '' 's/bg-accent/bg-primary\/10/g' src/components/Dashboard/MiniCalendar.tsx

# EventFilters
sed -i '' 's/bg-accent/bg-primary\/10/g' src/components/ClientPortal/Schedule/EventFilters.tsx

# ProjectsFilter
sed -i '' 's/bg-accent/bg-primary\/10/g' src/components/ProjectsTimeline/ProjectsFilter.tsx

# QuickActionGrid
sed -i '' 's/bg-accent/bg-primary\/10/g' src/components/supervisor/QuickActionGrid.tsx

# TaskColumn
sed -i '' 's/bg-accent/bg-primary\/10/g' src/components/TaskManagement/TaskColumn.tsx

# ProjectForm - check if there are any more
sed -i '' 's/bg-accent/bg-primary\/10/g' src/components/Projects/ProjectForm.tsx

echo "✅ Fixed remaining component files"

# UI components - more specific replacements
sed -i '' 's/bg-accent/bg-primary\/10/g' src/components/ui/calendar.tsx
sed -i '' 's/bg-accent/bg-primary\/10/g' src/components/ui/command.tsx
sed -i '' 's/bg-accent/bg-primary\/10/g' src/components/ui/navigation-menu.tsx

echo "✅ Fixed remaining UI component files"
echo "🎉 All remaining accent references fixed!"
