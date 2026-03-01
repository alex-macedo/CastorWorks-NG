#!/usr/bin/env node

/**
 * Load SINAPI Data from CSV to Database
 * 
 * This script reads the sinapi-list.csv file and generates SQL
 * INSERT statements for loading into the sinapi_catalog table.
 */

const fs = require('fs');
const path = require('path');

const CSV_FILE = path.join(__dirname, '../docs/examples/sinapi-list.csv');
const OUTPUT_SQL = path.join(__dirname, '../supabase/migrations/20251223170000_load_real_sinapi_data.sql');

console.log('🔄 Loading SINAPI data from CSV...\n');

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
const dataLines = lines.slice(2).filter(line => line.trim() && !line.startsWith(',,,'));

console.log(`📊 Found ${dataLines.length} SINAPI items\n`);

// Generate SQL
const sqlStatements = [];
const batchSize = 100; // Insert in batches for better performance

let currentBatch = [];
let validItems = 0;
let skippedItems = 0;

dataLines.forEach((line, index) => {
  const fields = parseCSVLine(line);
  
  // Extract fields
  const sinapiCode = fields[0]?.trim() || '';
  const itemCode = fields[1]?.trim() || '';
  const description = fields[2]?.replace(/"/g, '').trim() || '';
  const unit = fields[3]?.trim() || '';
  const quantity = parseFloat(fields[4]) || 0;
  const unitPrice = parseFloat(fields[5]) || 0;
  const materialCost = parseFloat(fields[6]) || 0;
  const laborCost = parseFloat(fields[7]) || 0;
  const totalCost = parseFloat(fields[8]) || 0;
  const itemType = fields[9]?.trim() || '';

  // Skip invalid entries
  if (!sinapiCode || !description || !unit) {
    skippedItems++;
    return;
  }

  // Map item type to our enum
  let mappedItemType = 'input';
  if (itemType.toLowerCase().includes('composição') || itemType.toLowerCase().includes('composicao')) {
    mappedItemType = 'composition';
  } else if (itemType.toLowerCase().includes('equipamento')) {
    mappedItemType = 'equipment';
  } else if (itemType.toLowerCase().includes('mão de obra') || itemType.toLowerCase().includes('mao de obra')) {
    mappedItemType = 'input'; // Treat labor as input
  }

  // Escape single quotes in description
  const escapedDescription = description.replace(/'/g, "''");

  // Create INSERT value
  const insertValue = `('${sinapiCode}', '${escapedDescription}', '${unit}', ${materialCost}, ${laborCost}, '${mappedItemType}', 2024, 'SP')`;
  
  currentBatch.push(insertValue);
  validItems++;

  // Write batch when full
  if (currentBatch.length >= batchSize || index === dataLines.length - 1) {
    const insertStatement = `INSERT INTO public.sinapi_catalog 
  (sinapi_code, description, unit, unit_cost_material, unit_cost_labor, item_type, base_year, base_state)
VALUES
  ${currentBatch.join(',\n  ')}
ON CONFLICT (sinapi_code) DO UPDATE SET
  description = EXCLUDED.description,
  unit = EXCLUDED.unit,
  unit_cost_material = EXCLUDED.unit_cost_material,
  unit_cost_labor = EXCLUDED.unit_cost_labor,
  item_type = EXCLUDED.item_type,
  updated_at = NOW();
`;

    sqlStatements.push(insertStatement);
    currentBatch = [];
  }
});

// Build complete SQL file
const sqlContent = `-- Load Real SINAPI Data from sinapi-list.csv
-- Generated: ${new Date().toISOString()}
-- Total Items: ${validItems}

-- First, clear any sample data
DELETE FROM public.sinapi_catalog WHERE base_year = 2024 AND base_state = 'SP';

-- Load real SINAPI data in batches
${sqlStatements.join('\n\n')}

-- Update search vectors
UPDATE public.sinapi_catalog 
SET search_vector = to_tsvector('pg_catalog.portuguese', sinapi_code || ' ' || description)
WHERE search_vector IS NULL;

-- Verify data loaded
DO $$ 
DECLARE 
  item_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO item_count FROM public.sinapi_catalog;
  RAISE NOTICE 'SINAPI catalog loaded successfully: % items', item_count;
END $$;
`;

// Write SQL file
fs.writeFileSync(OUTPUT_SQL, sqlContent, 'utf-8');

console.log('✅ SQL migration generated successfully!\n');
console.log(`📝 Output: ${OUTPUT_SQL}`);
console.log(`📊 Valid items: ${validItems}`);
console.log(`⚠️  Skipped items: ${skippedItems}`);
console.log(`📦 Batch size: ${batchSize} items per INSERT`);
console.log(`🔢 Total batches: ${sqlStatements.length}\n`);

console.log('🚀 Next steps:');
console.log('1. Review the generated migration file');
console.log('2. Apply migration: ./migrate.sh');
console.log('3. Or manually: psql "${DATABASE_URL}" -f supabase/migrations/20251223170000_load_real_sinapi_data.sql\n');

