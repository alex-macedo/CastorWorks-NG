#!/usr/bin/env node

/**
 * Load SINAPI Template CSV to SQL Migration
 * 
 * Parses docs/sinapi-list-project.csv and generates a SQL migration file
 * to load the template data into sinapi_line_items_template table.
 */

const fs = require('fs');
const path = require('path');

const CSV_FILE = path.join(__dirname, '../docs/sinapi-list-project.csv');
const OUTPUT_FILE = path.join(__dirname, '../supabase/migrations/20251223220001_load_sinapi_template.sql');

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
  const description = row[2] || '';
  const unit = row[3] || '';
  const quantity = row[4] || '0';
  
  // Check if this is a phase header (item_number is a single number or ends with "." and sinapi_code is empty)
  const isPhaseHeader = !sinapiCode.trim() && (
    itemNumber.endsWith('.') || 
    /^\d+$/.test(itemNumber.trim()) // Single number without period (e.g., "3")
  );
  
  if (isPhaseHeader) {
    // This is a phase header
    currentPhaseName = description;
    currentPhaseOrder++;
    sortOrder = 0; // Reset sort order for new phase
    continue; // Skip phase headers in template table
  }
  
  // Skip rows without SINAPI code (shouldn't happen after phase headers, but safety check)
  if (!sinapiCode.trim()) {
    continue;
  }
  
  // Parse quantity
  let quantityValue = 0;
  if (quantity && quantity.trim()) {
    const parsed = parseFloat(quantity.trim().replace(',', '.'));
    if (!isNaN(parsed)) {
      quantityValue = parsed;
    }
  }
  
  sortOrder++;
  
  items.push({
    phase_name: currentPhaseName,
    phase_order: currentPhaseOrder,
    item_number: itemNumber,
    sinapi_code: sinapiCode,
    description: description.replace(/'/g, "''"), // Escape single quotes for SQL
    unit: unit || null,
    quantity: quantityValue,
    sort_order: sortOrder,
  });
}

// Generate SQL migration file
const sql = `-- Load SINAPI Line Items Template from CSV
-- Migration: 20251223220001_load_sinapi_template.sql
-- Generated from: docs/sinapi-list-project.csv
-- Total items: ${items.length}

BEGIN;

-- Clear existing template data (idempotent)
DELETE FROM public.sinapi_line_items_template;

-- Insert template items
INSERT INTO public.sinapi_line_items_template (
  phase_name,
  phase_order,
  item_number,
  sinapi_code,
  description,
  unit,
  quantity,
  display_order
) VALUES
${items.map((item, index) => {
  const unitValue = item.unit ? `'${item.unit.replace(/'/g, "''")}'` : 'NULL';
  return `  ('${item.phase_name.replace(/'/g, "''")}', ${item.phase_order}, '${item.item_number}', '${item.sinapi_code}', '${item.description}', ${unitValue}, ${item.quantity}, ${item.display_order})${index < items.length - 1 ? ',' : ''}`;
}).join('\n')};

COMMIT;
`;

// Write SQL file
fs.writeFileSync(OUTPUT_FILE, sql, 'utf-8');

console.log(`✅ Generated SQL migration: ${OUTPUT_FILE}`);
console.log(`   Total items: ${items.length}`);
console.log(`   Phases: ${currentPhaseOrder}`);
console.log(`   File size: ${(sql.length / 1024).toFixed(2)} KB`);

