#!/usr/bin/env node

/**
 * Load SINAPI Project Template Items from CSV to Database
 * 
 * Parses docs/sinapi-list-project.csv and generates a SQL migration file
 * to load the template data into sinapi_project_template_items table.
 * 
 * CSV Columns:
 * - Item → item_number (skip phase headers like "1.")
 * - Cód. SINAPI → sinapi_code
 * - Qtd. → quantity
 * - Phase detection from headers → phase_name, phase_order
 */

const fs = require('fs');
const path = require('path');

const CSV_FILE = path.join(__dirname, '../docs/sinapi-list-project.csv');
const OUTPUT_FILE = path.join(__dirname, '../supabase/migrations/20251224190003_load_sinapi_template_items.sql');

console.log('🔄 Loading SINAPI template items from CSV...\n');

// Read CSV file
const csvContent = fs.readFileSync(CSV_FILE, 'utf-8');
const lines = csvContent.split('\n').filter(line => line.trim());

// Parse CSV (simple parser - handles quoted fields)
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  
  return result;
}

// Parse all lines
let currentPhaseName = '';
let currentPhaseOrder = 0;
let sortOrder = 0;
const items = [];

// Skip header row
for (let i = 1; i < lines.length; i++) {
  const row = parseCSVLine(lines[i]);
  
  if (row.length < 3) continue; // Skip malformed rows
  
  const itemNumber = row[0] || '';
  const sinapiCode = row[1] || '';
  const quantity = row[4] || '0';
  
  // Check if this is a phase header (item_number is a single number or ends with "." and sinapi_code is empty)
  const isPhaseHeader = !sinapiCode.trim() && (
    itemNumber.endsWith('.') || 
    /^\d+$/.test(itemNumber.trim()) // Single number without period (e.g., "3")
  );
  
  if (isPhaseHeader) {
    // This is a phase header - get phase name from description column
    currentPhaseName = row[2] || '';
    currentPhaseOrder++;
    sortOrder = 0; // Reset sort order for new phase
    continue; // Skip phase headers in template table
  }
  
  // Skip rows without SINAPI code
  if (!sinapiCode.trim()) {
    continue;
  }
  
  // Parse quantity
  const parsedQuantity = parseFloat(quantity) || 0;
  sortOrder++;
  
  items.push({
    item_number: itemNumber,
    sinapi_code: sinapiCode,
    quantity: parsedQuantity,
    phase_name: currentPhaseName,
    phase_order: currentPhaseOrder,
    sort_order: sortOrder,
  });
}

console.log(`📊 Found ${items.length} template items across ${currentPhaseOrder} phases\n`);

// Generate SQL
const sqlStatements = [];
sqlStatements.push('-- Load SINAPI Project Template Items from CSV');
sqlStatements.push('-- Migration: 20251224190003_load_sinapi_template_items.sql');
sqlStatements.push('-- Generated from: docs/sinapi-list-project.csv');
sqlStatements.push(`-- Total items: ${items.length}`);
sqlStatements.push(`-- Total phases: ${currentPhaseOrder}`);
sqlStatements.push('');
sqlStatements.push('BEGIN;');
sqlStatements.push('');
sqlStatements.push('-- Clear existing template data (idempotent)');
sqlStatements.push('DELETE FROM public.sinapi_project_template_items;');
sqlStatements.push('');
sqlStatements.push('-- Insert template items');
sqlStatements.push('INSERT INTO public.sinapi_project_template_items (');
sqlStatements.push('  item_number,');
sqlStatements.push('  sinapi_code,');
sqlStatements.push('  quantity,');
sqlStatements.push('  phase_name,');
sqlStatements.push('  phase_order,');
sqlStatements.push('  display_order');
sqlStatements.push(') VALUES');

// Generate INSERT values
const values = items.map((item, index) => {
  const escapedItemNumber = item.item_number.replace(/'/g, "''");
  const escapedPhaseName = item.phase_name.replace(/'/g, "''");
  const value = `  ('${escapedItemNumber}', '${item.sinapi_code}', ${item.quantity}, '${escapedPhaseName}', ${item.phase_order}, ${item.display_order})`;
  return value + (index < items.length - 1 ? ',' : '');
});

sqlStatements.push(values.join('\n'));
sqlStatements.push('ON CONFLICT DO NOTHING;');
sqlStatements.push('');
sqlStatements.push('-- Verify data loaded');
sqlStatements.push('DO $$');
sqlStatements.push('DECLARE');
sqlStatements.push('  item_count INTEGER;');
sqlStatements.push('BEGIN');
sqlStatements.push('  SELECT COUNT(*) INTO item_count FROM public.sinapi_project_template_items;');
sqlStatements.push(`  RAISE NOTICE 'SINAPI template items loaded successfully: % items', item_count;`);
sqlStatements.push('END $$;');
sqlStatements.push('');
sqlStatements.push('COMMIT;');

// Write SQL file
const sqlContent = sqlStatements.join('\n');
fs.writeFileSync(OUTPUT_FILE, sqlContent, 'utf-8');

console.log(`✅ Generated SQL migration: ${OUTPUT_FILE}`);
console.log(`📈 Template items: ${items.length}`);
console.log(`📦 Phases: ${currentPhaseOrder}`);
console.log(`\n✨ Done! Run the migration to load template items.\n`);

