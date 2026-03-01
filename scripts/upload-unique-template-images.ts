import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dev.castorworks.cloud'
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseServiceKey) {
  console.error('Error: VITE_SUPABASE_SERVICE_ROLE_KEY is not set in environment variables')
  process.exit(1)
}

// Use service role key to bypass RLS for this admin operation
const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface TemplateMapping {
  id: string
  tableName: string
  localImagePath: string
  storageImagePath: string
  description: string
}

// Map each template ID to its unique image
const templateMappings: TemplateMapping[] = [
  // Budget Templates
  {
    id: '2a814e1f-c48a-4e2c-abc4-5546e1116b4a',
    tableName: 'budget_templates',
    localImagePath: '/tmp/template-images/budget-1.jpg',
    storageImagePath: 'templates/budget-sem-material-eagle.jpg',
    description: 'Orçamento Sem Material - Eagle Construtora'
  },
  {
    id: '5131264a-5b4d-4d96-8031-6ca424e9c38d',
    tableName: 'budget_templates',
    localImagePath: '/tmp/template-images/budget-2.jpg',
    storageImagePath: 'templates/budget-com-material-eagle.jpg',
    description: 'Orçamento Com Material - Eagle Construtora'
  },
  // Phase Templates
  {
    id: '0748f290-7c23-444e-8c1c-78b5242f61d9',
    tableName: 'phase_templates',
    localImagePath: '/tmp/template-images/phase-1.jpg',
    storageImagePath: 'templates/phase-construcao-residencial.jpg',
    description: 'Construção Residencial - Fases'
  },
  {
    id: 'ee56bf87-6dc5-4dc9-a4f7-a5f43229b45a',
    tableName: 'phase_templates',
    localImagePath: '/tmp/template-images/phase-2.jpg',
    storageImagePath: 'templates/phase-orcamento-sem-material.jpg',
    description: 'Modelo – Orçamento Sem Material'
  },
  {
    id: '248fa309-0f6e-47b2-b5c7-7a75d3e7829c',
    tableName: 'phase_templates',
    localImagePath: '/tmp/template-images/phase-3.jpg',
    storageImagePath: 'templates/phase-orcamento-com-materiais.jpg',
    description: 'Modelo – Orçamento com Materiais'
  },
  // Activity Templates
  {
    id: '19c655b2-3758-4a40-882f-615e3bec1e69',
    tableName: 'activity_templates',
    localImagePath: '/tmp/template-images/activity-1.jpg',
    storageImagePath: 'templates/activity-construcao-residencial.jpg',
    description: 'Construção Residencial - Atividades da Obra'
  },
  {
    id: 'f8a58c99-1a37-4209-831a-6707cd01456b',
    tableName: 'activity_templates',
    localImagePath: '/tmp/template-images/activity-2.jpg',
    storageImagePath: 'templates/activity-cronograma-edificio.jpg',
    description: 'Cronograma Padrão - Obra Residencial (Edifício)'
  },
  {
    id: '4c50acab-177a-48e6-9f2e-79ebc75ed777',
    tableName: 'activity_templates',
    localImagePath: '/tmp/template-images/activity-3.jpg',
    storageImagePath: 'templates/activity-cronograma-casa-terrea.jpg',
    description: 'Cronograma - Casa Térrea'
  },
  {
    id: 'e760f454-884f-4354-a7cc-560bb2c1a7b8',
    tableName: 'activity_templates',
    localImagePath: '/tmp/template-images/activity-4.jpg',
    storageImagePath: 'templates/activity-construcao-eagle.jpg',
    description: 'Construção de Residência - Atividades da Obra (Eagle)'
  },
  // WBS Templates
  {
    id: '00000000-0000-0000-0000-000000000001',
    tableName: 'project_wbs_templates',
    localImagePath: '/tmp/template-images/wbs-1.jpg',
    storageImagePath: 'templates/wbs-construcao-residencial.jpg',
    description: 'Construção Residencial - EAP'
  }
]

async function uploadImagesAndUpdateDatabase() {
  console.log('Starting upload of unique template images to Supabase storage...\n')
  
  const results = {
    uploaded: 0,
    updated: 0,
    failed: 0
  }

  for (const template of templateMappings) {
    console.log(`Processing: ${template.description}`)
    
    try {
      // Read the image file
      const fileBuffer = readFileSync(template.localImagePath)
      
      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('template-images')
        .upload(template.storageImagePath, fileBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        })
      
      if (uploadError) {
        console.error(`  ❌ Upload failed:`, uploadError.message)
        results.failed++
        continue
      }
      
      console.log(`  ✅ Uploaded to storage: ${template.storageImagePath}`)
      results.uploaded++
      
      // Get the public URL
      const { data: publicUrlData } = supabase.storage
        .from('template-images')
        .getPublicUrl(template.storageImagePath)
      
      const publicUrl = publicUrlData.publicUrl
      console.log(`  🔗 Public URL: ${publicUrl}`)
      
      // Update the database record
      const { error: updateError } = await supabase
        .from(template.tableName)
        .update({ image_url: publicUrl })
        .eq('id', template.id)
      
      if (updateError) {
        console.error(`  ❌ Database update failed:`, updateError.message)
        results.failed++
      } else {
        console.log(`  ✅ Database updated`)
        results.updated++
      }
      
    } catch (error) {
      console.error(`  ❌ Error processing template:`, error)
      results.failed++
    }
    
    console.log('') // Empty line for readability
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('SUMMARY:')
  console.log(`  Images uploaded: ${results.uploaded}/${templateMappings.length}`)
  console.log(`  Database records updated: ${results.updated}/${templateMappings.length}`)
  console.log(`  Failed: ${results.failed}`)
  console.log('='.repeat(60))
}

uploadImagesAndUpdateDatabase().catch(console.error)
