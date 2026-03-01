-- Test the bulk update functions directly

-- First, let's see current sort orders
SELECT 'Current option sort orders:' as info;
SELECT option_id, sort_order FROM sidebar_option_permissions ORDER BY sort_order, option_id LIMIT 10;

SELECT 'Current tab sort orders:' as info;
SELECT option_id, tab_id, sort_order FROM sidebar_tab_permissions ORDER BY sort_order, option_id, tab_id LIMIT 10;

-- Test bulk update option sort orders
SELECT 'Testing bulk_update_option_sort_orders...' as info;

-- Create test data - swap first two options
SELECT bulk_update_option_sort_orders('[
  {"option_id": "dashboard", "sort_order": 1},
  {"option_id": "my-workspace", "sort_order": 0}
]');

-- Check if it worked
SELECT 'After option update:' as info;
SELECT option_id, sort_order FROM sidebar_option_permissions WHERE option_id IN ('dashboard', 'my-workspace') ORDER BY sort_order;

-- Test bulk update tab sort orders  
SELECT 'Testing bulk_update_tab_sort_orders...' as info;

-- Create test data - swap first two tabs in projects
SELECT bulk_update_tab_sort_orders('[
  {"option_id": "projects", "tab_id": "clients", "sort_order": 1},
  {"option_id": "projects", "tab_id": "projects-all", "sort_order": 0}
]');

-- Check if it worked
SELECT 'After tab update:' as info;
SELECT option_id, tab_id, sort_order FROM sidebar_tab_permissions 
WHERE option_id = 'projects' AND tab_id IN ('clients', 'projects-all') 
ORDER BY sort_order;

-- Reset to original order
SELECT 'Resetting to original order...' as info;
SELECT bulk_update_option_sort_orders('[
  {"option_id": "dashboard", "sort_order": 0},
  {"option_id": "my-workspace", "sort_order": 1}
]');

SELECT bulk_update_tab_sort_orders('[
  {"option_id": "projects", "tab_id": "clients", "sort_order": 0},
  {"option_id": "projects", "tab_id": "projects-all", "sort_order": 1}
]');

SELECT 'Test completed!' as info;
