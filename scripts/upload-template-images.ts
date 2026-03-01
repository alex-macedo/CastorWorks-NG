import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dev.castorworks.cloud'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseKey) {
  console.error('Error: VITE_SUPABASE_ANON_KEY is not set in environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const images = [
  { file: 'budget-template.jpg', path: 'templates/budget-template.jpg' },
  { file: 'materials-template.jpg', path: 'templates/materials-template.jpg' },
  { file: 'labor-template.jpg', path: 'templates/labor-template.jpg' },
  { file: 'phase-template.jpg', path: 'templates/phase-template.jpg' },
  { file: 'activity-template.jpg', path: 'templates/activity-template.jpg' },
  { file: 'wbs-template.jpg', path: 'templates/wbs-template.jpg' },
]

async function uploadImages() {
  console.log('Starting image upload to Supabase storage...')
  
  for (const image of images) {
    const filePath = join(process.cwd(), 'public', 'images', 'templates', image.file)
    
    try {
      const fileBuffer = readFileSync(filePath)
      
      const { data, error } = await supabase.storage
        .from('template-images')
        .upload(image.path, fileBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        })
      
      if (error) {
        console.error(`Error uploading ${image.file}:`, error)
      } else {
        const { data: publicUrlData } = supabase.storage
          .from('template-images')
          .getPublicUrl(image.path)
        
        console.log(`✅ Uploaded ${image.file}`)
        console.log(`   Public URL: ${publicUrlData.publicUrl}`)
      }
    } catch (error) {
      console.error(`Error reading ${image.file}:`, error)
    }
  }
  
  console.log('\nImage upload complete!')
}

uploadImages().catch(console.error)
