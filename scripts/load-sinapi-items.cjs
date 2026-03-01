#!/usr/bin/env node

/**
 * Load SINAPI Items from CSV to Database
 * 
 * This script reads the sinapi-list.csv file and generates SQL
 * INSERT statements for loading into the sinapi_items table.
 * 
 * CSV Columns:
 * - CÓD. SINAPI → sinapi_code
 * - CÓD. ITEM → sinapi_item
 * - DESCRICAO → sinapi_description
 * - UNID. → sinapi_unit
 * - QTD → sinapi_quantity
 * - PRECO UNIT. (R$) → sinapi_unit_price
 * - CUSTO MATERIAL → sinapi_material_cost
 * - CUSTO MÃO DE OBRA → sinapi_labor_cost
 * - TIPO ITEM → sinapi_type ("Mão de Obra" → "Labor", "Insumo" → "Materials")
 */

const fs = require('fs');
const path = require('path');

const CSV_FILE = path.join(__dirname, '../docs/examples/sinapi-list.csv');
const MIGRATIONS_DIR = path.join(__dirname, '../supabase/migrations');
const BASE_MIGRATION = '20251224190002';

console.log('🔄 Loading SINAPI items from CSV...\n');

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

// Configuration
const itemsPerFile = 500; // Split into files of 500 items each
const batchSize = 100; // Insert in batches of 100 within each file

let validItems = 0;
let skippedItems = 0;
let fileNumber = 0;
let currentFileItems = [];
let allItems = [];

// Parse all items first
dataLines.forEach((line) => {
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
  
  allItems.push(insertValue);
  validItems++;
});

console.log(`📦 Total valid items: ${validItems}`);
console.log(`⚠️  Skipped items: ${skippedItems}`);
console.log(`📁 Splitting into files of ${itemsPerFile} items each...\n`);

// Generate multiple migration files
for (let i = 0; i < allItems.length; i += itemsPerFile) {
  fileNumber++;
  const fileItems = allItems.slice(i, i + itemsPerFile);
  const isFirstFile = fileNumber === 1;
  const isLastFile = i + itemsPerFile >= allItems.length;
  
  const migrationNumber = `${BASE_MIGRATION}_part${String(fileNumber).padStart(2, '0')}`;
  const outputFile = path.join(MIGRATIONS_DIR, `${migrationNumber}_load_sinapi_items.sql`);
  
  const sqlStatements = [];
  sqlStatements.push('-- Load SINAPI Items from CSV (Part ' + fileNumber + ')');
  sqlStatements.push(`-- Migration: ${migrationNumber}_load_sinapi_items.sql`);
  sqlStatements.push('-- Generated from: docs/examples/sinapi-list.csv');
  sqlStatements.push(`-- Items ${i + 1} to ${Math.min(i + itemsPerFile, allItems.length)} of ${allItems.length}`);
  sqlStatements.push('');
  sqlStatements.push('BEGIN;');
  sqlStatements.push('');
  
  // Only clear data in first file
  if (isFirstFile) {
    sqlStatements.push('-- Clear existing data (idempotent)');
    sqlStatements.push('DELETE FROM public.sinapi_items;');
    sqlStatements.push('');
  }
  
  // Split items into batches within this file
  for (let j = 0; j < fileItems.length; j += batchSize) {
    const batch = fileItems.slice(j, j + batchSize);
    
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
${batch.map(v => `  ${v}`).join(',\n')}
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
  }
  
  // Add verification only in last file
  if (isLastFile) {
    sqlStatements.push('-- Verify data loaded');
    sqlStatements.push('DO $$');
    sqlStatements.push('DECLARE');
    sqlStatements.push('  item_count INTEGER;');
    sqlStatements.push('BEGIN');
    sqlStatements.push('  SELECT COUNT(*) INTO item_count FROM public.sinapi_items;');
    sqlStatements.push(`  RAISE NOTICE 'SINAPI items loaded successfully: % items', item_count;`);
    sqlStatements.push('END $$;');
    sqlStatements.push('');
  }
  
  sqlStatements.push('COMMIT;');
  
  // Write SQL file
  const sqlContent = sqlStatements.join('\n');
  fs.writeFileSync(outputFile, sqlContent, 'utf-8');
  
  console.log(`✅ Generated: ${migrationNumber}_load_sinapi_items.sql (${fileItems.length} items)`);
}

const totalFiles = Math.ceil(validItems / itemsPerFile);
console.log(`\n✨ Done! Generated ${totalFiles} migration files.`);
console.log(`📋 Run them in order: ${BASE_MIGRATION}_part01 through ${BASE_MIGRATION}_part${String(totalFiles).padStart(2, '0')}\n`);

