/**
 * Auto-Translation Generator for Missing Localization Keys
 *
 * This utility tracks missing translation keys in development mode and
 * provides a command to auto-generate translations for all languages.
 */

import type { Language } from '@/contexts/LocalizationContext';

interface MissingKey {
  key: string;
  namespace: string;
  nestedKeys: string[];
  language: Language;
  timestamp: number;
}

// In-memory store for missing keys (development only)
const missingKeys = new Map<string, MissingKey>();

/**
 * Track a missing translation key
 */
export function trackMissingKey(key: string, language: Language) {
  if (import.meta.env.PROD) return; // Only track in development

  const [namespace, ...nestedKeys] = key.split('.');
  const uniqueId = `${namespace}:${nestedKeys.join('.')}`;

  if (!missingKeys.has(uniqueId)) {
    missingKeys.set(uniqueId, {
      key,
      namespace,
      nestedKeys,
      language,
      timestamp: Date.now(),
    });
  }
}

/**
 * Get all tracked missing keys
 */
export function getMissingKeys(): MissingKey[] {
  return Array.from(missingKeys.values());
}

/**
 * Clear all tracked missing keys
 */
export function clearMissingKeys() {
  missingKeys.clear();
}

/**
 * Generate a human-readable translation from a key
 * Converts camelCase/snake_case to Title Case
 */
function generateFallbackTranslation(keyPath: string[]): string {
  const lastKey = keyPath[keyPath.length - 1] || '';

  // Convert camelCase or snake_case to words
  const words = lastKey
    .replace(/([A-Z])/g, ' $1') // camelCase -> camel Case
    .replace(/_/g, ' ') // snake_case -> snake case
    .trim()
    .split(/\s+/);

  // Capitalize first letter of each word
  const titleCase = words
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  return titleCase;
}

/**
 * Language-specific translation mappings for common terms
 */
const commonTranslations: Record<Language, Record<string, string>> = {
  'en-US': {},
  'pt-BR': {
    'new': 'Novo',
    'edit': 'Editar',
    'delete': 'Excluir',
    'save': 'Salvar',
    'cancel': 'Cancelar',
    'add': 'Adicionar',
    'remove': 'Remover',
    'supplier': 'Fornecedor',
    'suppliers': 'Fornecedores',
    'client': 'Cliente',
    'clients': 'Clientes',
    'project': 'Projeto',
    'projects': 'Projetos',
    'title': 'Título',
    'description': 'Descrição',
    'name': 'Nome',
    'email': 'Email',
    'phone': 'Telefone',
    'address': 'Endereço',
  },
  'es-ES': {
    'new': 'Nuevo',
    'edit': 'Editar',
    'delete': 'Eliminar',
    'save': 'Guardar',
    'cancel': 'Cancelar',
    'add': 'Agregar',
    'remove': 'Remover',
    'supplier': 'Proveedor',
    'suppliers': 'Proveedores',
    'client': 'Cliente',
    'clients': 'Clientes',
    'project': 'Proyecto',
    'projects': 'Proyectos',
    'title': 'Título',
    'description': 'Descripción',
    'name': 'Nombre',
    'email': 'Email',
    'phone': 'Teléfono',
    'address': 'Dirección',
  },
  'fr-FR': {
    'new': 'Nouveau',
    'edit': 'Modifier',
    'delete': 'Supprimer',
    'save': 'Enregistrer',
    'cancel': 'Annuler',
    'add': 'Ajouter',
    'remove': 'Retirer',
    'supplier': 'Fournisseur',
    'suppliers': 'Fournisseurs',
    'client': 'Client',
    'clients': 'Clients',
    'project': 'Projet',
    'projects': 'Projets',
    'title': 'Titre',
    'description': 'Description',
    'name': 'Nom',
    'email': 'Email',
    'phone': 'Téléphone',
    'address': 'Adresse',
  },
};

/**
 * Generate translation for a specific language using common translations and fallbacks
 */
function generateTranslation(keyPath: string[], language: Language): string {
  const lastKey = keyPath[keyPath.length - 1]?.toLowerCase() || '';

  // Check if we have a common translation
  const commonDict = commonTranslations[language];
  if (commonDict[lastKey]) {
    return commonDict[lastKey];
  }

  // For English, just use the fallback
  if (language === 'en-US') {
    return generateFallbackTranslation(keyPath);
  }

  // For other languages, prefix with language code if no common translation found
  return `[${language}] ${generateFallbackTranslation(keyPath)}`;
}

/**
 * Generate translations for all languages
 */
export function generateTranslations(namespace: string, nestedKeys: string[]): Record<Language, string> {
  const languages: Language[] = ['en-US', 'pt-BR', 'es-ES', 'fr-FR'];
  const translations: Record<string, string> = {};

  for (const lang of languages) {
    translations[lang] = generateTranslation(nestedKeys, lang);
  }

  return translations as Record<Language, string>;
}

/**
 * Format missing keys as JSON structure ready to be added to locale files
 */
export function formatMissingKeysAsJSON(): Record<string, Record<Language, any>> {
  const grouped: Record<string, Record<string, any>> = {};

  for (const missing of missingKeys.values()) {
    const { namespace, nestedKeys } = missing;

    if (!grouped[namespace]) {
      grouped[namespace] = {
        'en-US': {},
        'pt-BR': {},
        'es-ES': {},
        'fr-FR': {},
      };
    }

    const translations = generateTranslations(namespace, nestedKeys);

    // Build nested structure for each language
    for (const lang of Object.keys(grouped[namespace]) as Language[]) {
      let current = grouped[namespace][lang];

      for (let i = 0; i < nestedKeys.length - 1; i++) {
        const key = nestedKeys[i];
        if (!current[key]) {
          current[key] = {};
        }
        current = current[key];
      }

      const lastKey = nestedKeys[nestedKeys.length - 1];
      if (lastKey) {
        current[lastKey] = translations[lang];
      }
    }
  }

  return grouped as Record<string, Record<Language, any>>;
}

/**
 * Generate a report of missing translations
 */
export function generateMissingKeysReport(): string {
  const keys = getMissingKeys();

  if (keys.length === 0) {
    return 'No missing translation keys found.';
  }

  const byNamespace = new Map<string, MissingKey[]>();

  for (const key of keys) {
    if (!byNamespace.has(key.namespace)) {
      byNamespace.set(key.namespace, []);
    }
    byNamespace.get(key.namespace)!.push(key);
  }

  let report = `\n${'='.repeat(60)}\n`;
  report += `Missing Translation Keys Report\n`;
  report += `Generated: ${new Date().toLocaleString()}\n`;
  report += `Total Missing: ${keys.length}\n`;
  report += `${'='.repeat(60)}\n\n`;

  for (const [namespace, nsKeys] of byNamespace) {
    report += `\n📁 ${namespace} (${nsKeys.length} missing)\n`;
    report += `${'─'.repeat(60)}\n`;

    for (const key of nsKeys) {
      const fullKey = key.nestedKeys.join('.');
      const translations = generateTranslations(namespace, key.nestedKeys);

      report += `  • ${fullKey}\n`;
      report += `    en-US: "${translations['en-US']}"\n`;
      report += `    pt-BR: "${translations['pt-BR']}"\n`;
      report += `    es-ES: "${translations['es-ES']}"\n`;
      report += `    fr-FR: "${translations['fr-FR']}"\n\n`;
    }
  }

  return report;
}

/**
 * Developer command: Generate and log missing translations
 * Usage in browser console: window.generateMissingTranslations()
 */
export function logMissingTranslations() {
  console.log(generateMissingKeysReport());
  console.log('\n📋 JSON Format (copy to locale files):\n');
  console.log(JSON.stringify(formatMissingKeysAsJSON(), null, 2));
}

/**
 * Install global command for developers (development only)
 */
if (import.meta.env.DEV) {
  (window as any).generateMissingTranslations = logMissingTranslations;
  (window as any).getMissingTranslations = getMissingKeys;
  (window as any).clearMissingTranslations = clearMissingKeys;

  console.log('%c[Translation Generator]', 'color: #10b981; font-weight: bold',
    'Auto-translation tracking enabled. Commands available:\n' +
    '  • window.generateMissingTranslations() - Generate report and JSON\n' +
    '  • window.getMissingTranslations() - Get tracked keys\n' +
    '  • window.clearMissingTranslations() - Clear tracked keys'
  );
}
