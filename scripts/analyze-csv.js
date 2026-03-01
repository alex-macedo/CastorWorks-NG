#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSV_FILE = path.join(__dirname, '../docs/sinapi-list-project.csv');

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

console.log(`Total lines in CSV: ${lines.length}`);
console.log(`Lines after filtering empty: ${lines.length}`);

// Parse all lines
let currentPhaseName = '';
let currentPhaseOrder = 0;
let displayOrder = 0;
const items = [];
let phaseHeaders = 0;

// Skip header row
for (let i = 1; i < lines.length; i++) {
  const row = parseCSVLine(lines[i]);

  if (row.length < 3) {
    console.log(`Skipping malformed row ${i + 1}:`, row);
    continue;
  }

  const itemNumber = row[0] || '';
  const sinapiCode = row[1] || '';
  const description = row[2] || '';
  const unit = row[3] || '';
  const quantity = row[4] || '0';

  // Check if this is a phase header
  const isPhaseHeader = !sinapiCode.trim() && (
    itemNumber.endsWith('.') ||
    /^\d+$/.test(itemNumber.trim())
  );

  if (isPhaseHeader) {
    // This is a phase header
    currentPhaseName = description;
    currentPhaseOrder++;
    sortOrder = 0; // Reset sort order for new phase
    phaseHeaders++;
    continue; // Skip phase headers in template table
  }

  // Skip rows without SINAPI code
  if (!sinapiCode.trim()) {
    console.log(`Skipping row ${i + 1} with no SINAPI code:`, row);
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

console.log(`Phase headers found: ${phaseHeaders}`);
console.log(`Template items found: ${items.length}`);
console.log(`Total phases: ${currentPhaseOrder}`);

// Show first few items
console.log('\nFirst 5 items:');
items.slice(0, 5).forEach((item, i) => {
  console.log(`${i + 1}. ${item.item_number} - ${item.sinapi_code} (${item.phase_name})`);
});

// Show last few items
console.log('\nLast 5 items:');
items.slice(-5).forEach((item, i) => {
  console.log(`${items.length - 4 + i}. ${item.item_number} - ${item.sinapi_code} (${item.phase_name})`);
});

// Check for missing numbers in sequences
console.log('\nChecking for gaps in item numbering...');
const phases = {};
items.forEach(item => {
  if (!phases[item.phase_name]) {
    phases[item.phase_name] = [];
  }
  phases[item.phase_name].push(item.item_number);
});

for (const [phaseName, itemNumbers] of Object.entries(phases)) {
  const numbers = itemNumbers.map(n => {
    const match = n.match(/^(\d+)\.(\d+)$/);
    return match ? parseInt(match[2]) : null;
  }).filter(n => n !== null).sort((a, b) => a - b);

  if (numbers.length > 1) {
    const expected = [];
    for (let i = 1; i <= Math.max(...numbers); i++) {
      expected.push(i);
    }

    const missing = expected.filter(n => !numbers.includes(n));
    if (missing.length > 0) {
      console.log(`Phase "${phaseName}": missing item numbers: ${missing.join(', ')}`);
    }
  }
}