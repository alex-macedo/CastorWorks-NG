#!/usr/bin/env node

/**
 * Load SINAPI Items Data from CSV to Database
 *
 * This script reads the sinapi_items.csv file and loads
 * the data into the sinapi_items table.
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: '../.env' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase credentials. Please check your environment variables.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function loadSinapiItemsData() {
  try {
    console.log('🔄 Starting SINAPI items data load...');

    // Read CSV file
    const csvPath = path.join(__dirname, '../docs/examples/sinapi_items.csv');

    if (!fs.existsSync(csvPath)) {
      console.error(`❌ CSV file not found: ${csvPath}`);
      return;
    }

    const csvData = fs.readFileSync(csvPath, 'utf8');

    // Clear existing data
    console.log('🗑️  Clearing existing sinapi_items data...');
    const { error: deleteError } = await supabase
      .from('sinapi_items')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

    if (deleteError) {
      console.error('❌ Error clearing existing data:', deleteError);
      return;
    }

    console.log('✅ Existing data cleared.');

    // Parse CSV and insert data
    const lines = csvData.split('\n').filter(line => line.trim());
    const headerLine = lines[0];

    console.log(`📊 Processing ${lines.length - 1} data rows...`);

    let processedCount = 0;
    let skippedCount = 0;
    let batchSize = 100;
    let currentBatch = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Parse CSV line (handle quoted commas)
      const columns = parseCSVLine(line);

      if (columns.length < 10) {
        console.warn(`⚠️  Skipping malformed line ${i + 1}: ${line}`);
        skippedCount++;
        continue;
      }

      const [sinapiCode, sinapiItem, description, unit, quantity, unitPrice, materialCost, laborCost, totalCost, itemType] = columns;

      // Skip header rows or empty data
      if (!sinapiCode || sinapiCode === 'CÓD. SINAPI' || sinapiCode === '') {
        skippedCount++;
        continue;
      }

      // Map item type to our enum
      const sinapiType = mapItemType(itemType);

      const record = {
        sinapi_code: sinapiCode,
        sinapi_item: sinapiItem || '',
        sinapi_description: description || '',
        sinapi_unit: unit || '',
        sinapi_quantity: parseFloat(quantity) || 0,
        sinapi_unit_price: parseFloat(unitPrice) || 0,
        sinapi_material_cost: parseFloat(materialCost) || 0,
        sinapi_labor_cost: parseFloat(laborCost) || 0,
        sinapi_type: sinapiType,
        base_year: 2024,
        base_state: 'SP'
      };

      currentBatch.push(record);

      // Process batch when it reaches the batch size or end of file
      if (currentBatch.length >= batchSize || i === lines.length - 1) {
        await processBatch(currentBatch, processedCount + 1);
        processedCount += currentBatch.length;
        currentBatch = [];

        console.log(`📦 Processed ${processedCount} records...`);
      }
    }

    console.log(`\n✅ SINAPI items data load completed!`);
    console.log(`📊 Total records processed: ${processedCount}`);
    console.log(`⚠️  Records skipped: ${skippedCount}`);

    // Verify the data was loaded
    const { count, error: countError } = await supabase
      .from('sinapi_items')
      .select('*', { count: 'exact', head: true });

    if (!countError && count !== null) {
      console.log(`🔍 Verification: ${count} records now in sinapi_items table`);
    }

  } catch (error) {
    console.error('❌ Error loading SINAPI items data:', error);
  }
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
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

function mapItemType(itemType) {
  if (!itemType) return 'Materials';

  const type = itemType.toLowerCase().trim();

  if (type.includes('mão de obra') || type.includes('mao de obra') || type.includes('mão') || type.includes('mao')) {
    return 'Labor';
  }

  return 'Materials';
}

async function processBatch(batch, startNumber) {
  try {
    const { error } = await supabase
      .from('sinapi_items')
      .upsert(batch, { onConflict: 'sinapi_code,sinapi_item' });

    if (error) {
      console.error(`❌ Error processing batch starting at record ${startNumber}:`, error);
    } else {
      console.log(`✅ Batch processed successfully (records ${startNumber}-${startNumber + batch.length - 1})`);
    }
  } catch (error) {
    console.error(`❌ Batch processing error at record ${startNumber}:`, error);
  }
}

// Run the script
console.log('🚀 SINAPI Items Data Loader');
console.log('============================\n');

loadSinapiItemsData().then(() => {
  console.log('\n🎉 Script completed!');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});