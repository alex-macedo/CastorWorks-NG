#!/usr/bin/env node
/*
 Backfill script (CommonJS): convert stored signed URLs to canonical storage paths (bucket/key)

 Usage:
  NODE_ENV=production node scripts/backfill-signed-urls.cjs --dry
  NODE_ENV=production node scripts/backfill-signed-urls.cjs --apply

 Environment variables expected:
  - SUPABASE_URL
  - SUPABASE_SERVICE_ROLE_KEY  (required for --apply mode)

 This script performs a dry-run by default; pass --apply to update rows.
 It writes a CSV `scripts/backfill-ambiguous.csv` containing rows it couldn't confidently convert.
*/

const { createClient } = require('@supabase/supabase-js');
const { parse } = require('url');
const fs = require('fs');
const path = require('path');
// lightweight CSV writer helper (no external dependency)

const DRY = !process.argv.includes('--apply');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error('ERROR: SUPABASE_URL must be set');
  process.exit(1);
}

function createClientForMode() {
  if (DRY) {
    // read-only public client is fine for dry-run
    const anonKey = process.env.SUPABASE_ANON_KEY || 'anon';
    if (!process.env.SUPABASE_ANON_KEY) {
      console.warn('Warning: SUPABASE_ANON_KEY not set, using placeholder anon key for dry-run. If queries fail, set SUPABASE_ANON_KEY');
    }
    return createClient(SUPABASE_URL, anonKey);
  }
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY is required for --apply mode');
    process.exit(1);
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

const supabase = createClientForMode();

// Heuristic: parse signed URL patterns to extract bucket/key
function parseSignedUrlToPath(urlString) {
  if (!urlString) return null;
  try {
    const u = new URL(urlString);
    const pathname = u.pathname || '';
    const storageIndex = pathname.indexOf('/storage/v1/object/');
    if (storageIndex !== -1) {
      const suffix = pathname.slice(storageIndex + '/storage/v1/object/'.length);
      const parts = suffix.split('/');
      if (parts[0] === 'public') parts.shift();
      if (parts.length >= 2) {
        const bucket = parts.shift();
        const key = parts.join('/');
        return `${bucket}/${key}`;
      }
    }

    const segments = pathname.split('/').filter(Boolean);
    if (segments.length >= 2) {
      const bucket = segments[segments.length - 2];
      const key = segments[segments.length - 1];
      return `${bucket}/${key}`;
    }
  } catch (err) {
    return null;
  }
  return null;
}

async function inspectAndBackfill() {
  console.log(`Starting backfill (${DRY ? 'dry-run' : 'apply'})`);

  const targets = [
    { table: 'clients', column: 'image_url', idCol: 'id' },
    { table: 'estimate_files', column: 'file_url', idCol: 'id' },
    { table: 'estimate_files', column: 'thumbnail_url', idCol: 'id' },
    { table: 'campaign_recipients', column: 'voice_message_url', idCol: 'id' },
    { table: 'project_images', column: 'url', idCol: 'id' },
    { table: 'quality_inspections', column: 'checklist_items', idCol: 'id', json: true },
    // Delivery photos (store photo_url and canonical storage path)
    { table: 'delivery_photos', column: 'photo_url', idCol: 'id' },
    { table: 'delivery_photos', column: 'photo_storage_path', idCol: 'id' },
    // Payment receipts and upload URLs
    { table: 'payment_transactions', column: 'receipt_url', idCol: 'id' },
    // Outbound campaigns voice message URLs
    { table: 'outbound_campaigns', column: 'voice_message_url', idCol: 'id' },
    // Architect moodboard images
    { table: 'architect_moodboard', column: 'image_url', idCol: 'id' },
    // Additional concrete columns discovered across migrations
    { table: 'user_profiles', column: 'avatar_url', idCol: 'user_id', optional: true },
    { table: 'payments', column: 'pdf_url', idCol: 'id', optional: true },
    { table: 'purchase_orders', column: 'pdf_url', idCol: 'id', optional: true },
    { table: 'ai_support', column: 'audio_url', idCol: 'id', optional: true },
    { table: 'files', column: 'file_url', idCol: 'id', optional: true },
    { table: 'payment_transactions', column: 'receipt_url', idCol: 'id', optional: true },
    { table: 'outbound_campaigns', column: 'voice_message_url', idCol: 'id', optional: true },
    { table: 'architect_moodboard_images', column: 'image_url', idCol: 'id', optional: true },
    { table: 'clients', column: 'company_logo_url', idCol: 'id', optional: true },
    { table: 'troubleshooting_entries', column: 'github_url', idCol: 'id', optional: true },
    // v_url is used by get_estimate_file_url helpers — include generically where present
    { table: 'estimates', column: 'v_url', idCol: 'id', optional: true },
    // NOTE: signature_data_url is a base64 data URL (not a Supabase signed URL) - skip automatic conversion
    // { table: 'delivery_confirmations', column: 'signature_data_url', idCol: 'id' },
  ];

  const ambiguousPath = path.join(__dirname, 'backfill-ambiguous.csv');
  const ambiguousStream = fs.createWriteStream(ambiguousPath, { flags: 'w' });
  // write header
  function writeCsvRow(arr) {
    const escaped = arr.map((v) => {
      if (v === null || v === undefined) return '';
      let s = String(v).replace(/"/g, '""');
      if (s.includes(',') || s.includes('"') || s.includes('\n')) s = `"${s}"`;
      return s;
    });
    ambiguousStream.write(escaped.join(',') + '\n');
  }
  writeCsvRow(['table', 'id', 'column', 'original_value', 'reason']);

  for (const t of targets) {
    console.log(`Inspecting ${t.table}.${t.column}`);
    const { data, error } = await supabase
      .from(t.table)
      .select(`${t.idCol}, ${t.column}`)
      .not(t.column, 'is', null)
      .limit(1000);

    if (error) {
      console.error(`Error reading ${t.table}:`, error.message || error);
      continue;
    }

    for (const row of data || []) {
      const id = row[t.idCol];
      const val = row[t.column];

      if (t.json) {
        let parsed;
        try {
          parsed = typeof val === 'string' ? JSON.parse(val) : val;
        } catch (e) {
          writeCsvRow([t.table, id, t.column, JSON.stringify(val), 'invalid json']);
          continue;
        }

        let modified = false;
        const walk = (obj) => {
          if (!obj || typeof obj !== 'object') return;
          for (const k of Object.keys(obj)) {
            const v = obj[k];
            if (typeof v === 'string' && v.startsWith('http')) {
              const candidate = parseSignedUrlToPath(v);
              if (candidate) {
                obj[k] = candidate;
                modified = true;
              } else {
                writeCsvRow([t.table, id, t.column, v, 'could not parse json nested url']);
              }
            } else if (typeof v === 'object') {
              walk(v);
            }
          }
        };

        walk(parsed);

        if (modified) {
          if (!DRY) {
            const { error: upErr } = await supabase
              .from(t.table)
              .update({ [t.column]: parsed })
              .eq(t.idCol, id);
            if (upErr) {
              console.error(`Failed to update ${t.table} id=${id}:`, upErr.message || upErr);
              writeCsvRow([t.table, id, t.column, JSON.stringify(parsed), 'update failed']);
            } else {
              console.log(`Updated ${t.table} id=${id}`);
            }
          } else {
            console.log(`[dry] would update ${t.table} id=${id}`);
          }
        }

        continue;
      }

      if (typeof val !== 'string') {
        writeCsvRow([t.table, id, t.column, JSON.stringify(val), 'not a string']);
        continue;
      }

      if (!val.startsWith('http')) {
        continue;
      }

      const candidate = parseSignedUrlToPath(val);
      if (!candidate) {
        writeCsvRow([t.table, id, t.column, val, 'could not parse']);
        continue;
      }

      if (!DRY) {
        const { error: upErr } = await supabase
          .from(t.table)
          .update({ [t.column]: candidate })
          .eq(t.idCol, id);
        if (upErr) {
          console.error(`Failed to update ${t.table} id=${id}:`, upErr.message || upErr);
          writeCsvRow([t.table, id, t.column, val, 'update failed']);
        } else {
          console.log(`Updated ${t.table} id=${id} -> ${candidate}`);
        }
      } else {
        console.log(`[dry] ${t.table}.${t.column} id=${id} -> ${candidate}`);
      }
    }
  }

  ambiguousStream.end();
  console.log(`Done. Ambiguous cases logged to ${ambiguousPath}`);
}

inspectAndBackfill().catch(err => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
