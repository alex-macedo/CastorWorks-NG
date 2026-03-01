// Fix: update ONLY the allowed_mime_types without touching fileSizeLimit
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://dev.castorworks.cloud';
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NjM4NzQwMDAsImV4cCI6MTkyMTY0MDQwMH0.33jZIICDfhdCnN3Xaf2LhoybZsO-zs1wWN94E-TeXt8';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main() {
  console.log('Updating allowed_mime_types on roadmap-attachments…');

  const { data, error } = await supabase.storage.updateBucket('roadmap-attachments', {
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'video/webm',
      'video/mp4',
      'video/ogg',
      'video/quicktime',
    ],
  });

  if (error) {
    console.error('❌ error:', error.message);
    // Try direct REST call as fallback
    console.log('\nFalling back to direct REST PATCH…');
    const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket/roadmap-attachments`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        apikey: SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({
        id: 'roadmap-attachments',
        name: 'roadmap-attachments',
        public: false,
        allowed_mime_types: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'image/jpeg',
          'image/png',
          'image/webp',
          'image/gif',
          'video/webm',
          'video/mp4',
          'video/ogg',
          'video/quicktime',
        ],
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      console.error('❌ REST error:', JSON.stringify(json));
      process.exit(1);
    }
    console.log('✅ REST success:', JSON.stringify(json));
    return;
  }

  console.log('✅ Done:', JSON.stringify(data));
}

main();
