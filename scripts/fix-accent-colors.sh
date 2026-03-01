#!/bin/bash
# Script to fix hardcoded bg-accent usage across the codebase
# Replaces bg-accent with proper theme-aware alternatives

echo "Fixing hardcoded bg-accent colors in components..."

# Settings components - remove bg-accent from buttons (use default)
sed -i '' 's/className="bg-accent hover:bg-accent\/90"/className=""/g' src/components/Settings/LocalizationTab.tsx
sed -i '' 's/className="bg-accent hover:bg-accent\/90"/className=""/g' src/components/Settings/ConfigCategoryCard.tsx
sed -i '' 's/className="bg-accent hover:bg-accent\/90"/className=""/g' src/components/Settings/ConfigValueEditor.tsx
sed -i '' 's/className="bg-accent hover:bg-accent\/90"/className=""/g' src/components/Settings/AddTranslationDialog.tsx
sed -i '' 's/className="bg-accent hover:bg-accent\/90"/className=""/g' src/components/Settings/UITranslationEditor.tsx
sed -i '' 's/className="bg-accent hover:bg-accent\/90"/className=""/g' src/components/Settings/TranslationMaintenanceEditor.tsx

# Project components
sed -i '' 's/className="bg-accent hover:bg-accent\/90"/className=""/g' src/components/Projects/NewProjectWizard.tsx

# Dashboard and other components
sed -i '' 's/className="bg-accent text-accent-foreground shadow-sm hover:bg-accent\/90"/className=""/g' src/components/Dashboard/DashboardFilters.tsx

# Client Portal
sed -i '' 's/className="bg-accent hover:bg-accent\/90"/className=""/g' src/components/ClientPortal/Payments/PaymentsDashboard.tsx

# Hover effects - change from bg-accent to bg-primary/10
sed -i '' 's/hover:bg-accent\/50/hover:bg-primary\/10/g' src/components/Reports/ReportHistory.tsx
sed -i '' 's/hover:bg-accent\/50/hover:bg-primary\/10/g' src/components/Financial/TransactionDetailsDialog.tsx
sed -i '' 's/hover:bg-accent\/60/hover:bg-primary\/10/g' src/components/Documents/DocumentList.tsx
sed -i '' 's/hover:bg-accent cursor-pointer/hover:bg-primary\/10 cursor-pointer/g' src/components/Documents/DocumentList.tsx
sed -i '' 's/hover:bg-accent\/50/hover:bg-primary\/10/g' src/components/ClientPortal/Schedule/ScheduleCalendar.tsx
sed -i '' 's/hover:bg-accent cursor-pointer/hover:bg-primary\/10 cursor-pointer/g' src/components/Architect/Tasks/TeamMemberLookupDialog.tsx
sed -i '' 's/hover:bg-accent cursor-pointer/hover:bg-primary\/10 cursor-pointer/g' src/components/Financial/MultiSelectDropdown.tsx

# Notification bell - special case with group classes
sed -i '' 's/hover:bg-accent group/hover:bg-primary\/10 group/g' src/components/Notifications/NotificationBell.tsx

# Data table column header
sed -i '' 's/data-\[state=open\]:bg-accent/data-[state=open]:bg-primary\/20/g' src/components/ui/data-table-column-header.tsx
sed -i '' 's/data-\[state=open\]:bg-accent/data-[state=open]:bg-primary\/20/g' src/components/ui/data-table.tsx

# Project Form - badge/label elements (not buttons)
sed -i '' 's/bg-accent text-accent-foreground px-3 py-1.5 rounded text-sm cursor-pointer hover:bg-accent\/90/bg-primary text-primary-foreground px-3 py-1.5 rounded text-sm cursor-pointer hover:bg-primary\/90/g' src/components/Projects/ProjectForm.tsx

# Roadmap - subtle backgrounds
sed -i '' 's/hover:bg-accent\/5/hover:bg-primary\/5/g' src/components/Roadmap/RoadmapGanttChart.tsx
sed -i '' 's/hover:bg-accent\/5/hover:bg-primary\/5/g' src/components/Roadmap/EpicDocumentationViewer.tsx

# AddTeamMemberSheet - this is a background highlight, not a button
sed -i '' 's/bg-accent rounded-lg/bg-primary\/10 rounded-lg/g' src/components/Architect/Tasks/AddTeamMemberSheet.tsx

# Roadmap card - button in a card
sed -i '' 's/bg-background border-border hover:bg-accent/bg-background border-border hover:bg-primary\/10/g' src/components/Roadmap/RoadmapCard.tsx

echo "✅ Fixed Settings components"
echo "✅ Fixed Project components"
echo "✅ Fixed Dashboard components"
echo "✅ Fixed Client Portal components"
echo "✅ Fixed hover effects"
echo "✅ Fixed UI primitives"
echo ""
echo "Now fixing UI component libraries..."

# UI component library - dropdown-menu.tsx
if [ -f "src/components/ui/dropdown-menu.tsx" ]; then
  sed -i '' 's/focus:bg-accent focus:text-accent-foreground/focus:bg-primary\/10 focus:text-primary/g' src/components/ui/dropdown-menu.tsx
  echo "✅ Fixed dropdown-menu.tsx"
fi

# UI component library - select.tsx (if exists)
if [ -f "src/components/ui/select.tsx" ]; then
  sed -i '' 's/focus:bg-accent focus:text-accent-foreground/focus:bg-primary\/10 focus:text-primary/g' src/components/ui/select.tsx
  echo "✅ Fixed select.tsx"
fi

# UI component library - context-menu.tsx (if exists)
if [ -f "src/components/ui/context-menu.tsx" ]; then
  sed -i '' 's/focus:bg-accent focus:text-accent-foreground/focus:bg-primary\/10 focus:text-primary/g' src/components/ui/context-menu.tsx
  echo "✅ Fixed context-menu.tsx"
fi

# UI component library - menubar.tsx (if exists)
if [ -f "src/components/ui/menubar.tsx" ]; then
  sed -i '' 's/focus:bg-accent focus:text-accent-foreground/focus:bg-primary\/10 focus:text-primary/g' src/components/ui/menubar.tsx
  echo "✅ Fixed menubar.tsx"
fi

# UI component library - navigation-menu.tsx
if [ -f "src/components/ui/navigation-menu.tsx" ]; then
  sed -i '' 's/focus:bg-accent focus:text-accent-foreground/focus:bg-primary\/10 focus:text-primary/g' src/components/ui/navigation-menu.tsx
  sed -i '' 's/data-\[active\]:bg-accent\/50/data-[active]:bg-primary\/20/g' src/components/ui/navigation-menu.tsx
  sed -i '' 's/data-\[state=open\]:bg-accent\/50/data-[state=open]:bg-primary\/20/g' src/components/ui/navigation-menu.tsx
  echo "✅ Fixed navigation-menu.tsx"
fi

# UI component library - command.tsx
if [ -f "src/components/ui/command.tsx" ]; then
  sed -i '' 's/aria-selected:bg-accent aria-selected:text-accent-foreground/aria-selected:bg-primary\/10 aria-selected:text-primary/g' src/components/ui/command.tsx
  echo "✅ Fixed command.tsx"
fi

# Calendar component
if [ -f "src/components/ui/calendar.tsx" ]; then
  sed -i '' 's/bg-accent text-accent-foreground/bg-primary text-primary-foreground/g' src/components/ui/calendar.tsx
  sed -i '' 's/hover:bg-accent hover:text-accent-foreground/hover:bg-primary\/90 hover:text-primary-foreground/g' src/components/ui/calendar.tsx
  echo "✅ Fixed calendar.tsx"
fi

# Tabs component
if [ -f "src/components/ui/tabs.tsx" ]; then
  sed -i '' 's/data-\[state=active\]:bg-accent/data-[state=active]:bg-primary/g' src/components/ui/tabs.tsx
  sed -i '' 's/data-\[state=active\]:text-accent-foreground/data-[state=active]:text-primary-foreground/g' src/components/ui/tabs.tsx
  echo "✅ Fixed tabs.tsx"
fi

# Toggle component
if [ -f "src/components/ui/toggle.tsx" ]; then
  sed -i '' 's/data-\[state=on\]:bg-accent/data-[state=on]:bg-primary\/20/g' src/components/ui/toggle.tsx
  sed -i '' 's/data-\[state=on\]:text-accent-foreground/data-[state=on]:text-primary/g' src/components/ui/toggle.tsx
  echo "✅ Fixed toggle.tsx"
fi

# Dialog component
if [ -f "src/components/ui/dialog.tsx" ]; then
  sed -i '' 's/focus:ring-accent/focus:ring-primary/g' src/components/ui/dialog.tsx
  echo "✅ Fixed dialog.tsx"
fi

echo ""
echo "🎉 All accent color references have been updated to use theme-aware primary colors!"
echo ""
echo "Summary:"
echo "  - Buttons now use default Button component (primary color)"
echo "  - Hover effects use bg-primary/10 for subtle highlights"
echo "  - Focus states use bg-primary/10 for accessibility"
echo "  - Selected states use bg-primary/20 for stronger indication"
echo "  - All UI components respect the theme customization system"
echo ""
echo "Next: Test the application with different themes in Settings > Theme"
