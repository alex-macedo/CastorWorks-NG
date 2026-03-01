#!/usr/bin/env node

/**
 * Load SINAPI Items from CSV to Database (Single File Version)
 * 
 * This script reads the sinapi-list.csv file and generates a SINGLE SQL
 * migration file for loading into the sinapi_items table.
 * 
 * Use this version if you plan to load via psql command line (no size limits).
 */

const fs = require('fs');
const path = require('path');

const CSV_FILE = path.join(__dirname, '../docs/examples/sinapi-list.csv');
const OUTPUT_SQL = path.join(__dirname, '../supabase/migrations/20251224190002_load_sinapi_items.sql');

console.log('🔄 Loading SINAPI items from CSV (single file)...\n');

// Read CSV file
const csvContent = fs.readFileSync(CSV_FILE, 'utf-8');
const lines = csvContent.split('\n');

// Parse CSV (handling quoted fields with commas)
function parseCSVLine(line) {
  const fields = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(currentField.trim());
      currentField = '';
    } else {
      currentField += char;
    }
  }
  fields.push(currentField.trim());
  
  return fields;
}

// Skip header and empty lines
const dataLines = lines.slice(2).filter(line => line.trim() && !line.startsWith(',,,,'));

console.log(`📊 Found ${dataLines.length} SINAPI items\n`);

// Generate SQL
const sqlStatements = [];
sqlStatements.push('-- Load SINAPI Items from CSV');
sqlStatements.push('-- Migration: 20251224190002_load_sinapi_items.sql');
sqlStatements.push('-- Generated from: docs/examples/sinapi-list.csv');
sqlStatements.push(`-- Total items: ${dataLines.length}`);
sqlStatements.push('--');
sqlStatements.push('-- NOTE: This file is large (~8,786 lines).');
sqlStatements.push('-- Use psql command line to load: psql "${DATABASE_URL}" -f this_file.sql');
sqlStatements.push('');
sqlStatements.push('BEGIN;');
sqlStatements.push('');
sqlStatements.push('-- Clear existing data (idempotent)');
sqlStatements.push('DELETE FROM public.sinapi_items;');
sqlStatements.push('');

const batchSize = 100; // Insert in batches for better performance
let currentBatch = [];
let validItems = 0;
let skippedItems = 0;

dataLines.forEach((line, index) => {
  const fields = parseCSVLine(line);
  
  // Extract fields (0-indexed)
  const sinapiCode = fields[0]?.trim() || '';
  const sinapiItem = fields[1]?.trim() || '';
  const description = fields[2]?.replace(/"/g, '').trim() || '';
  const unit = fields[3]?.trim() || '';
  const quantity = parseFloat(fields[4]) || 0;
  const unitPrice = parseFloat(fields[5]) || 0;
  const materialCost = parseFloat(fields[6]) || 0;
  const laborCost = parseFloat(fields[7]) || 0;
  const itemType = fields[9]?.trim() || '';

  // Skip invalid entries
  if (!sinapiCode || !sinapiItem || !description || !unit) {
    skippedItems++;
    return;
  }

  // Map item type: "Mão de Obra" → "Labor", "Insumo" → "Materials"
  let sinapiType = null;
  const itemTypeLower = itemType.toLowerCase();
  if (itemTypeLower.includes('mão de obra') || itemTypeLower.includes('mao de obra') || itemTypeLower.includes('labor')) {
    sinapiType = 'Labor';
  } else if (itemTypeLower.includes('insumo') || itemTypeLower.includes('material')) {
    sinapiType = 'Materials';
  }
  // If type is unclear, determine based on costs (if labor_cost > material_cost, likely Labor)
  if (!sinapiType) {
    sinapiType = laborCost > materialCost ? 'Labor' : 'Materials';
  }

  // Escape single quotes in description
  const escapedDescription = description.replace(/'/g, "''");
  const escapedItem = sinapiItem.replace(/'/g, "''");

  // Create INSERT value
  const insertValue = `('${sinapiCode}', '${escapedItem}', '${escapedDescription}', '${unit}', ${quantity}, ${unitPrice}, ${materialCost}, ${laborCost}, '${sinapiType}', 2024, 'SP')`;
  
  currentBatch.push(insertValue);
  validItems++;

  // Write batch when full
  if (currentBatch.length >= batchSize || index === dataLines.length - 1) {
    const insertStatement = `INSERT INTO public.sinapi_items (
  sinapi_code,
  sinapi_item,
  sinapi_description,
  sinapi_unit,
  sinapi_quantity,
  sinapi_unit_price,
  sinapi_material_cost,
  sinapi_labor_cost,
  sinapi_type,
  base_year,
  base_state
) VALUES
${currentBatch.map(v => `  ${v}`).join(',\n')}
ON CONFLICT (sinapi_code, sinapi_item) DO UPDATE SET
  sinapi_description = EXCLUDED.sinapi_description,
  sinapi_unit = EXCLUDED.sinapi_unit,
  sinapi_quantity = EXCLUDED.sinapi_quantity,
  sinapi_unit_price = EXCLUDED.sinapi_unit_price,
  sinapi_material_cost = EXCLUDED.sinapi_material_cost,
  sinapi_labor_cost = EXCLUDED.sinapi_labor_cost,
  sinapi_type = EXCLUDED.sinapi_type,
  updated_at = NOW();`;

    sqlStatements.push(insertStatement);
    sqlStatements.push('');
    currentBatch = [];
  }
});

// Add verification
sqlStatements.push('-- Verify data loaded');
sqlStatements.push('DO $$');
sqlStatements.push('DECLARE');
sqlStatements.push('  item_count INTEGER;');
sqlStatements.push('BEGIN');
sqlStatements.push('  SELECT COUNT(*) INTO item_count FROM public.sinapi_items;');
sqlStatements.push(`  RAISE NOTICE 'SINAPI items loaded successfully: % items', item_count;`);
sqlStatements.push('END $$;');
sqlStatements.push('');
sqlStatements.push('COMMIT;');

// Write SQL file
const sqlContent = sqlStatements.join('\n');
fs.writeFileSync(OUTPUT_SQL, sqlContent, 'utf-8');

console.log(`✅ Generated SQL migration: ${OUTPUT_SQL}`);
console.log(`📈 Valid items: ${validItems}`);
console.log(`⚠️  Skipped items: ${skippedItems}`);
console.log(`📦 Batches: ${Math.ceil(validItems / batchSize)}`);
console.log(`\n✨ Done! Use psql to load: psql "\${DATABASE_URL}" -f ${OUTPUT_SQL}\n`);

