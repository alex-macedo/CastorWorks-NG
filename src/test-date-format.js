// Test script to verify date format detection
import { detectBrowserDateFormat } from './dateFormatDetection.js';

console.log('Testing browser date format detection...');

// Test with different locale formats
const testLocales = ['en-US', 'pt-BR', 'es-ES', 'fr-FR', 'de-DE'];

testLocales.forEach(locale => {
  // Mock navigator.language for testing
  Object.defineProperty(navigator, 'language', {
    value: locale,
    configurable: true
  });

  const detectedFormat = detectBrowserDateFormat();
  console.log(`${locale}: ${detectedFormat}`);
});

// Test error handling
Object.defineProperty(navigator, 'language', {
  value: undefined,
  configurable: true
});

const fallbackFormat = detectBrowserDateFormat();
console.log(`Fallback (no locale): ${fallbackFormat}`);