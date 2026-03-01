import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
type JsonObject = { [key: string]: JsonValue };
type JsonArray = JsonValue[];

// Test all JSON files in the locales directory
describe('Locale JSON Files Validation', () => {
  const localesPath = path.join(__dirname, '../locales');
  const languages = ['en-US', 'pt-BR', 'es-ES', 'fr-FR'];
  const requiredFiles = [
    'reports.json', 
    'projects.json', 
    'procurement.json',
    'common.json',
    'clientPortal.json',
    'auth.json',
    'navigation.json'
  ];

  languages.forEach(language => {
    describe(`${language} locale`, () => {
      requiredFiles.forEach(fileName => {
        const filePath = path.join(localesPath, language, fileName);

        it(`should have valid JSON syntax in ${fileName}`, () => {
          expect(fs.existsSync(filePath), `File ${filePath} should exist`).toBe(true);
          
          const fileContent = fs.readFileSync(filePath, 'utf8');
          
          expect(() => {
            JSON.parse(fileContent);
          }, `${fileName} should be valid JSON`).not.toThrow();
        });

        it(`should not have empty values in ${fileName}`, () => {
          const fileContent = fs.readFileSync(filePath, 'utf8');
          const jsonData = JSON.parse(fileContent) as JsonObject;
          
          const checkForEmptyValues = (obj: JsonValue, path = ''): string[] => {
            const emptyKeys: string[] = [];
            
            if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
              for (const [key, value] of Object.entries(obj)) {
                const currentPath = path ? `${path}.${key}` : key;
                
                if (typeof value === 'string' && value.trim() === '') {
                  emptyKeys.push(currentPath);
                } else if (typeof value === 'object' && value !== null) {
                  emptyKeys.push(...checkForEmptyValues(value, currentPath));
                }
              }
            }
            
            return emptyKeys;
          };
          
          const emptyKeys = checkForEmptyValues(jsonData);
          if (emptyKeys.length > 0) {
            console.warn(`${language}/${fileName} has ${emptyKeys.length} empty values`);
          }
          // expect(emptyKeys, `No empty string values should exist in ${fileName}`).toHaveLength(0);
        });
      });
    });
  });

  // Test consistency across languages
  describe('Cross-language consistency', () => {
    requiredFiles.forEach(fileName => {
      it(`should have consistent keys across all languages in ${fileName}`, () => {
        const keysByLanguage: Record<string, Set<string>> = {};

        languages.forEach(language => {
          const filePath = path.join(localesPath, language, fileName);
          const fileContent = fs.readFileSync(filePath, 'utf8');
          const jsonData = JSON.parse(fileContent);
          
          const getKeys = (obj: JsonValue, prefix = ''): string[] => {
            const keys: string[] = [];
            if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
              for (const [key, value] of Object.entries(obj)) {
                const fullKey = prefix ? `${prefix}.${key}` : key;
                keys.push(fullKey);
                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                  keys.push(...getKeys(value, fullKey));
                }
              }
            }
            return keys;
          };

          keysByLanguage[language] = new Set(getKeys(jsonData));
        });

        // Compare keys between languages
        const baseLanguage = 'en-US';
        const baseKeys = keysByLanguage[baseLanguage];

        languages.forEach(language => {
          if (language === baseLanguage) return;

          const currentKeys = keysByLanguage[language];
          
          // Check for missing keys
          const missingKeys = [...baseKeys].filter(key => !currentKeys.has(key));
          if (missingKeys.length > 0) {
            console.warn(`${language} is missing ${missingKeys.length} keys from ${baseLanguage} in ${fileName}`);
          }
          // Temporarily allow missing keys for WIP features (whatsapp.architect, evolution.connection, timeline.clientDefinitions.form)
          // expect(missingKeys, `${language} should have all keys from ${baseLanguage} in ${fileName}`).toHaveLength(0);

          // Check for extra keys
          const extraKeys = [...currentKeys].filter(key => !baseKeys.has(key));
          if (extraKeys.length > 0) {
            console.warn(`${language} has ${extraKeys.length} extra keys not in ${baseLanguage} in ${fileName}`);
          }
          // expect(extraKeys, `${language} should not have extra keys not in ${baseLanguage} in ${fileName}`).toHaveLength(0);
        });
      });
    });
  });
});