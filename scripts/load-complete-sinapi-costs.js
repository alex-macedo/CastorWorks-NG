#!/usr/bin/env node

/**
 * Load complete SINAPI composition data with costs
 * Updates existing entries and adds missing ones with real cost data
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSV_FILE = path.join(__dirname, '../docs/composicao_sinapi.csv');

console.log('🔄 Loading complete SINAPI composition data...\n');

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
const items = [];

// Skip header row
for (let i = 1; i < lines.length; i++) {
  const row = parseCSVLine(lines[i]);

  if (row.length < 8) continue; // Skip malformed rows

  const sinapiCode = row[1] || ''; // CÓD. ITEM
  const description = row[2] || '';
  const unit = row[3] || '';
  const unitPrice = row[5] || '0';
  const materialCost = row[6] || '0';
  const laborCost = row[7] || '0';

  // Skip empty codes
  if (!sinapiCode.trim()) continue;

  // Parse numeric values
  const unitPriceValue = parseFloat(unitPrice.replace(',', '.')) || 0;
  const materialCostValue = parseFloat(materialCost.replace(',', '.')) || 0;
  const laborCostValue = parseFloat(laborCost.replace(',', '.')) || 0;

  items.push({
    sinapi_code: sinapiCode,
    sinapi_item: sinapiCode, // Use code as item identifier
    sinapi_description: description.replace(/'/g, "''"), // Escape quotes
    sinapi_unit: unit,
    sinapi_material_cost: materialCostValue,
    sinapi_labor_cost: laborCostValue,
    base_state: 'SP', // Default to SP
    base_year: 2024, // Current year
  });
}

console.log(`📊 Found ${items.length} SINAPI items with cost data\n`);

// Generate SQL migration
const sqlStatements = [];
sqlStatements.push('-- Update SINAPI items with complete cost data');
sqlStatements.push('-- Migration: 20251224190015_load_complete_sinapi_costs.sql');
sqlStatements.push('-- Source: docs/composicao_sinapi.csv');
sqlStatements.push(`-- Items: ${items.length}`);
sqlStatements.push('');
sqlStatements.push('BEGIN;');
sqlStatements.push('');
sqlStatements.push('-- Update existing entries with cost data');
sqlStatements.push('UPDATE public.sinapi_items');
sqlStatements.push('SET');
sqlStatements.push('  sinapi_description = updates.sinapi_description,');
sqlStatements.push('  sinapi_unit = updates.sinapi_unit,');
sqlStatements.push('  sinapi_material_cost = updates.sinapi_material_cost,');
sqlStatements.push('  sinapi_labor_cost = updates.sinapi_labor_cost,');
sqlStatements.push('  updated_at = NOW()');
sqlStatements.push('FROM (VALUES');

// Add UPDATE values
const updateValues = items.map((item, index) => {
  const value = `  ('${item.sinapi_code}', '${item.sinapi_description}', '${item.sinapi_unit}', ${item.sinapi_material_cost}, ${item.sinapi_labor_cost})`;
  return value + (index < items.length - 1 ? ',' : '');
});

sqlStatements.push(updateValues.join('\n'));
sqlStatements.push(') AS updates(sinapi_code, sinapi_description, sinapi_unit, sinapi_material_cost, sinapi_labor_cost)');
sqlStatements.push('WHERE sinapi_items.sinapi_code = updates.sinapi_code;');
sqlStatements.push('');
sqlStatements.push('-- Insert new entries that don\'t exist');
sqlStatements.push('INSERT INTO public.sinapi_items (');
sqlStatements.push('  sinapi_code,');
sqlStatements.push('  sinapi_item,');
sqlStatements.push('  sinapi_description,');
sqlStatements.push('  sinapi_unit,');
sqlStatements.push('  sinapi_material_cost,');
sqlStatements.push('  sinapi_labor_cost,');
sqlStatements.push('  base_state,');
sqlStatements.push('  base_year,');
sqlStatements.push('  created_at,');
sqlStatements.push('  updated_at');
sqlStatements.push(')');
sqlStatements.push('SELECT');
sqlStatements.push('  sinapi_code,');
sqlStatements.push('  sinapi_item,');
sqlStatements.push('  sinapi_description,');
sqlStatements.push('  sinapi_unit,');
sqlStatements.push('  sinapi_material_cost,');
sqlStatements.push('  sinapi_labor_cost,');
sqlStatements.push('  base_state,');
sqlStatements.push('  base_year,');
sqlStatements.push('  NOW(),');
sqlStatements.push('  NOW()');
sqlStatements.push('FROM (VALUES');

// Add INSERT values
const insertValues = items.map((item, index) => {
  const value = `  ('${item.sinapi_code}', '${item.sinapi_item}', '${item.sinapi_description}', '${item.sinapi_unit}', ${item.sinapi_material_cost}, ${item.sinapi_labor_cost}, '${item.base_state}', ${item.base_year})`;
  return value + (index < items.length - 1 ? ',' : '');
});

sqlStatements.push(insertValues.join('\n'));
sqlStatements.push(') AS new_items(sinapi_code, sinapi_item, sinapi_description, sinapi_unit, sinapi_material_cost, sinapi_labor_cost, base_state, base_year)');
sqlStatements.push('WHERE NOT EXISTS (');
sqlStatements.push('  SELECT 1 FROM public.sinapi_items si');
sqlStatements.push('  WHERE si.sinapi_code = new_items.sinapi_code');
sqlStatements.push(');');
sqlStatements.push('');
sqlStatements.push('-- Log results');
sqlStatements.push('DO $$');
sqlStatements.push('DECLARE');
sqlStatements.push('  updated_count INTEGER;');
sqlStatements.push('  inserted_count INTEGER;');
sqlStatements.push('BEGIN');
sqlStatements.push('  GET DIAGNOSTICS updated_count = ROW_COUNT;');
sqlStatements.push('  SELECT COUNT(*) INTO inserted_count');
sqlStatements.push('  FROM public.sinapi_items');
sqlStatements.push('  WHERE created_at >= NOW() - INTERVAL \'1 minute\';');
sqlStatements.push('  ');
sqlStatements.push('  RAISE NOTICE \'SINAPI costs loaded: % items updated, ~% items inserted\', updated_count, inserted_count;');
sqlStatements.push('END $$;');
sqlStatements.push('');
sqlStatements.push('COMMIT;');

// Write SQL file
const sqlContent = sqlStatements.join('\n');
const outputFile = path.join(__dirname, '../supabase/migrations/20251224190015_load_complete_sinapi_costs.sql');
fs.writeFileSync(outputFile, sqlContent, 'utf-8');

console.log(`✅ Generated SQL migration: ${outputFile}`);
console.log(`📈 SINAPI items with costs: ${items.length}`);
console.log(`\n✨ Run the migration to load complete cost data!\n`);