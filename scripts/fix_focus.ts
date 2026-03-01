
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath });
}
dotenv.config({ path: envPath });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const projectId = '0f3e4962-92e7-43dd-aac3-d580c47ba620';

async function main() {
  console.log('Fetching project...');
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, image_focus_point')
    .eq('id', projectId)
    .single();

  if (error) {
    console.error('Error fetching project:', error);
    return;
  }

  console.log('Current project:', data);

  // Set focus to lower part of image (y=80) to show house body instead of roof
  const newFocus = { x: 50, y: 80 };
  console.log('Updating focus to:', newFocus);

  const { error: updateError } = await supabase
    .from('projects')
    .update({ image_focus_point: newFocus })
    .eq('id', projectId);

  if (updateError) {
    console.error('Error updating project:', updateError);
  } else {
    console.log('Successfully updated focus point.');
  }
}

main();
