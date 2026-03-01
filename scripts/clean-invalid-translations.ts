import fs from 'fs';
import path from 'path';

const LANGUAGES = ['en-US', 'pt-BR', 'es-ES', 'fr-FR'];
const LOCALES_DIR = path.join(process.cwd(), 'src', 'locales');

/**
 * Validate if a filename is a valid namespace
 * Valid namespaces should only contain alphanumeric characters, hyphens, and underscores
 */
function isValidNamespace(filename: string): boolean {
  // Remove .json extension if present
  const name = filename.replace('.json', '');
  
  // Check if name matches valid pattern: alphanumeric, hyphens, underscores only
  // Must start with alphanumeric, and be at least 2 characters
  const validPattern = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;
  
  return validPattern.test(name) && name.length >= 2;
}

/**
 * Clean invalid translation files from all language directories
 */
function cleanInvalidTranslations(): void {
  console.log('🧹 Cleaning invalid translation files...\n');

  let totalDeleted = 0;

  for (const lang of LANGUAGES) {
    const langDir = path.join(LOCALES_DIR, lang);
    
    if (!fs.existsSync(langDir)) {
      console.log(`⚠️  Directory not found: ${lang}`);
      continue;
    }

    const files = fs.readdirSync(langDir).filter(file => file.endsWith('.json'));
    const invalidFiles = files.filter(file => !isValidNamespace(file));

    if (invalidFiles.length > 0) {
      console.log(`\n📁 ${lang}:`);
      
      invalidFiles.forEach(file => {
        const filePath = path.join(langDir, file);
        try {
          fs.unlinkSync(filePath);
          console.log(`   ✓ Deleted: ${file}`);
          totalDeleted++;
        } catch (error) {
          console.error(`   ✗ Failed to delete: ${file}`, error);
        }
      });
    } else {
      console.log(`✅ ${lang}: No invalid files found`);
    }
  }

  console.log(`\n✅ Cleanup complete! Deleted ${totalDeleted} invalid file(s)`);
}

// Run if called directly
if (require.main === module) {
  try {
    cleanInvalidTranslations();
    process.exit(0);
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

export { cleanInvalidTranslations };
