#!/usr/bin/env node

/**
 * Generate migration to reload SINAPI data from CSV files
 * This fixes the code mismatch between sinapi_items and template
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse number that may be in format "123.45" or "1,234.56"
function parseNumber(str) {
  if (!str || str === '') return 0;
  // Remove thousand separators (,) and convert
  return parseFloat(str.replace(/,/g, ''));
}

// Escape single quotes for SQL
function escapeSql(str) {
  if (!str) return '';
  return str.replace(/'/g, "''");
}

// Parse CSV properly handling quoted fields
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  // Add last field
  result.push(current);

  return result;
}

// Parse SINAPI items CSV
function parseSinapiItems(csvPath) {
  const content = fs.readFileSync(csvPath, 'utf-8')
    .replace(/^\uFEFF/, ''); // Remove BOM

  const lines = content.split(/\r?\n/).filter(line => line.trim());

  // Skip header
  const dataLines = lines.slice(1);
  const items = [];

  for (const line of dataLines) {
    const fields = parseCSVLine(line);
    if (fields.length < 10) continue;

    const [codigoSinapi, codigoItem, descricao, unidade, qtd, precoUnit, custoMaterial, custoMaoObra, custoTotal, tipoItem] = fields;

    // Map tipo item
    let tipo = 'Materials';
    const tipoLower = tipoItem.toLowerCase().trim();
    if (tipoLower.includes('mão de obra') || tipoLower.includes('mao de obra')) {
      tipo = 'Labor';
    } else if (tipoLower.includes('insumo')) {
      tipo = 'Materials';
    }

    items.push({
      sinapi_code: codigoItem.trim(), // Use CÓD. ITEM as sinapi_code (for template matching)
      sinapi_item: codigoSinapi.trim(), // Use CÓD. SINAPI as sinapi_item (for uniqueness)
      sinapi_description: descricao.trim(),
      sinapi_unit: unidade.trim(),
      sinapi_quantity: parseNumber(qtd),
      sinapi_unit_price: parseNumber(precoUnit),
      sinapi_material_cost: parseNumber(custoMaterial),
      sinapi_labor_cost: parseNumber(custoMaoObra),
      sinapi_type: tipo
    });
  }

  return items;
}

// Parse template CSV
function parseTemplateItems(csvPath) {
  const content = fs.readFileSync(csvPath, 'utf-8')
    .replace(/^\uFEFF/, ''); // Remove BOM

  const lines = content.split(/\r?\n/).filter(line => line.trim());

  // Skip header
  const dataLines = lines.slice(1);
  const items = [];

  let currentPhase = '';
  let phaseOrder = 0;
  let sortOrder = 0;

  for (const line of dataLines) {
    const parts = parseCSVLine(line);
    if (parts.length < 2) continue;

    const itemNumber = parts[0].trim();
    const sinapiCode = parts[1].trim();
    const description = parts[2] ? parts[2].trim() : '';
    const unit = parts[3] ? parts[3].trim() : '';
    const quantity = parts[4] ? parseNumber(parts[4]) : 0;

    // Check if this is a phase header (no SINAPI code)
    if (!sinapiCode) {
      currentPhase = description || '';
      phaseOrder++;
      sortOrder = 0;
      continue;
    }

    sortOrder++;

    items.push({
      item_number: itemNumber,
      sinapi_code: sinapiCode,
      description: description,
      unit: unit,
      quantity: quantity,
      phase_name: currentPhase,
      phase_order: phaseOrder,
      sort_order: sortOrder
    });
  }

  return items;
}

// Generate SQL migration
function generateMigration() {
  const sinapiItemsPath = path.join(__dirname, '../docs/examples/sinapi_items.csv');
  const templateItemsPath = path.join(__dirname, '../docs/examples/sinapi_list_project.csv');

  console.log('Parsing SINAPI items...');
  const sinapiItems = parseSinapiItems(sinapiItemsPath);
  console.log(`Loaded ${sinapiItems.length} SINAPI items`);

  console.log('Parsing template items...');
  const templateItems = parseTemplateItems(templateItemsPath);
  console.log(`Loaded ${templateItems.length} template items`);

  // Generate migration SQL
  let sql = `-- Reload SINAPI data from CSV files
-- Migration: 20251225000000_reload_sinapi_from_csv.sql
-- Fix: Use CÓD. ITEM as sinapi_code (not CÓD. SINAPI) to match template expectations
-- Generated: ${new Date().toISOString()}

BEGIN;

-- Clear existing data
DELETE FROM public.sinapi_project_template_items;
DELETE FROM public.sinapi_items;

-- Load SINAPI items (${sinapiItems.length} items)
INSERT INTO public.sinapi_items (
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
`;

  // Add SINAPI items (in batches to avoid too long lines)
  const sinapiValues = sinapiItems.map(item =>
    `  ('${escapeSql(item.sinapi_code)}', '${escapeSql(item.sinapi_item)}', '${escapeSql(item.sinapi_description)}', '${escapeSql(item.sinapi_unit)}', ${item.sinapi_quantity}, ${item.sinapi_unit_price}, ${item.sinapi_material_cost}, ${item.sinapi_labor_cost}, '${item.sinapi_type}', 2014, 'SP')`
  ).join(',\n');

  sql += sinapiValues + ';\n\n';

  // Add template items
  sql += `-- Load template items (${templateItems.length} items across ${Math.max(...templateItems.map(t => t.phase_order))} phases)
INSERT INTO public.sinapi_project_template_items (
  item_number,
  sinapi_code,
  description,
  unit,
  quantity,
  phase_name,
  phase_order,
  sort_order
) VALUES
`;

  const templateValues = templateItems.map(item =>
    `  ('${escapeSql(item.item_number)}', '${escapeSql(item.sinapi_code)}', '${escapeSql(item.description)}', '${escapeSql(item.unit)}', ${item.quantity}, '${escapeSql(item.phase_name)}', ${item.phase_order}, ${item.sort_order})`
  ).join(',\n');

  sql += templateValues + ';\n\n';

  sql += `COMMIT;

-- Verification query (should return ${templateItems.length} matches)
-- SELECT COUNT(*) as matches
-- FROM public.sinapi_project_template_items t
-- INNER JOIN public.sinapi_items s ON s.sinapi_code = t.sinapi_code;
`;

  // Write migration file
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0].replace('T', '');
  const migrationPath = path.join(__dirname, '../supabase/migrations', `${timestamp}_reload_sinapi_from_csv.sql`);

  fs.writeFileSync(migrationPath, sql, 'utf-8');
  console.log(`\nMigration created: ${migrationPath}`);
  console.log(`File size: ${(sql.length / 1024).toFixed(2)} KB`);

  return migrationPath;
}

// Run
try {
  const migrationPath = generateMigration();
  console.log('\n✅ Migration generated successfully');
  console.log('\nNext steps:');
  console.log('1. Review the migration file');
  console.log('2. Apply it using the Supabase MCP tool');
} catch (error) {
  console.error('❌ Error generating migration:', error);
  process.exit(1);
}
