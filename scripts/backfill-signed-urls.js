#!/usr/bin/env node
/*
 Backfill script: convert stored signed URLs to canonical storage paths (bucket/key)

 Usage:
  NODE_ENV=production node scripts/backfill-signed-urls.js --dry
  NODE_ENV=production node scripts/backfill-signed-urls.js --apply

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
const csvWriter = require('csv-write-stream');

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
    return createClient(SUPABASE_URL, '');
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
    // Supabase createSignedUrl typically returns https://{bucket}.supabase.co/storage/v1/object/public/{bucket}/{path}
    // But signed URLs may also include query params (e.g., token). We'll try to identify '/object/public/' or '/storage/v1/object/'
    const pathname = u.pathname || '';
    const storageIndex = pathname.indexOf('/storage/v1/object/');
    if (storageIndex !== -1) {
      // strip prefix '/storage/v1/object/'
      const suffix = pathname.slice(storageIndex + '/storage/v1/object/'.length);
      // suffix might be like 'public/bucket/key...' or 'signed' forms
      // If it starts with 'public/', remove that
      const parts = suffix.split('/');
      if (parts[0] === 'public') parts.shift();
      // now first segment could be bucket
      if (parts.length >= 2) {
        const bucket = parts.shift();
        const key = parts.join('/');
        return `${bucket}/${key}`;
      }
    }

    // Some signed URLs may be direct to a CDN or object URL with '/{bucket}/{key}' near the end
    const segments = pathname.split('/').filter(Boolean);
    // try to find a likely bucket-like segment and key afterwards by checking common buckets
    // fallback: last two segments as folder/file
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

  // Tables/columns to inspect: this is a conservative list found in repo analysis.
  const targets = [
    { table: 'clients', column: 'image_url', idCol: 'id' },
    { table: 'estimate_files', column: 'file_url', idCol: 'id' },
    { table: 'campaign_recipients', column: 'voice_message_url', idCol: 'id' },
    { table: 'project_images', column: 'url', idCol: 'id' },
    { table: 'quality_inspections', column: 'checklist_items', idCol: 'id', json: true },
    // Add more targets as needed. This list can be extended by maintainers.
  ];

  const ambiguousWriter = csvWriter({ headers: ['table', 'id', 'column', 'original_value', 'reason'] });
  const ambiguousPath = path.join(__dirname, 'backfill-ambiguous.csv');
  ambiguousWriter.pipe(fs.createWriteStream(ambiguousPath));

  for (const t of targets) {
    console.log(`Inspecting ${t.table}.${t.column}`);
    // fetch rows where column is not null
    const { data, error } = await supabase
      .from(t.table)
      .select(`${t.idCol}, ${t.column}`)
      .not(t.column, 'is', null)
      .limit(1000); // batch size; adjust as needed

    if (error) {
      console.error(`Error reading ${t.table}:`, error.message || error);
      continue;
    }

    for (const row of data || []) {
      const id = row[t.idCol];
      const val = row[t.column];

      if (t.json) {
        // For JSON columns (e.g., checklist_items), inspect nested fields
        let parsed;
        try {
          parsed = typeof val === 'string' ? JSON.parse(val) : val;
        } catch (e) {
          ambiguousWriter.write([t.table, id, t.column, JSON.stringify(val), 'invalid json']);
          continue;
        }

        let modified = false;
        // Walk structure and replace any http(s) signedUrl-like strings in known places
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
                ambiguousWriter.write([t.table, id, t.column, v, 'could not parse json nested url']);
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
              ambiguousWriter.write([t.table, id, t.column, JSON.stringify(parsed), 'update failed']);
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
        ambiguousWriter.write([t.table, id, t.column, JSON.stringify(val), 'not a string']);
        continue;
      }

      if (!val.startsWith('http')) {
        // already a storage path (likely canonical)
        continue;
      }

      const candidate = parseSignedUrlToPath(val);
      if (!candidate) {
        ambiguousWriter.write([t.table, id, t.column, val, 'could not parse']);
        continue;
      }

      if (!DRY) {
        const { error: upErr } = await supabase
          .from(t.table)
          .update({ [t.column]: candidate })
          .eq(t.idCol, id);
        if (upErr) {
          console.error(`Failed to update ${t.table} id=${id}:`, upErr.message || upErr);
          ambiguousWriter.write([t.table, id, t.column, val, 'update failed']);
        } else {
          console.log(`Updated ${t.table} id=${id} -> ${candidate}`);
        }
      } else {
        console.log(`[dry] ${t.table}.${t.column} id=${id} -> ${candidate}`);
      }
    }
  }

  ambiguousWriter.end();
  console.log('Done. Ambiguous cases logged to scripts/backfill-ambiguous.csv');
}

inspectAndBackfill().catch(err => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
