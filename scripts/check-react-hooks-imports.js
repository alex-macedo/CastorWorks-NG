#!/usr/bin/env node
/**
 * Check staged files for React hook usages without proper imports
 * Flags cases where hooks like useState are used but not imported from 'react'
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const hooks = ['useState','useEffect','useRef','useCallback','useMemo','useContext','useLayoutEffect','useImperativeHandle','useReducer','useDeferredValue','useId','useTransition'];

function getStagedFiles() {
  try {
    const out = execSync('git diff --cached --name-only', { encoding: 'utf8' });
    return out.trim().split('\n').filter(Boolean);
  } catch (e) {
    return [];
  }
}

function checkFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const ext = path.extname(filePath).toLowerCase();
  if (!['.ts','.tsx','.js','.jsx'].includes(ext)) return null;

  const content = fs.readFileSync(filePath, 'utf8');

  const results = [];
  for (const hook of hooks) {
    if (content.includes(`${hook}(`) || content.includes(`.${hook}(`)) {
      // Check for destructured import: import { useState } from 'react'
      // Use a more robust check that accounts for spaces and multiple hooks
      const importReactRegex = /import\s+[^;]*\bfrom\s+['"]react['"]/m;
      const hasReactImport = importReactRegex.test(content);
      
      const hookImportRegex = new RegExp(`import\\s+\\{[^}]*\\b${hook}\\b[^}]*\\}\\s+from\\s+['"]react['"]`, 'm');
      const hasHookImport = hookImportRegex.test(content);
      const hasDefaultReact = /import\s+React\b/.test(content);
      const usesReactDot = content.includes(`React.${hook}(`);

      if (hasReactImport && !hasHookImport && !hasDefaultReact && !usesReactDot) {
        results.push(hook);
      }
      // If no react import at all, we don't necessarily flag it here as it might not be a React component
      // but if it uses hooks, it probably should have been flagged.
      if (!hasReactImport && !usesReactDot) {
        results.push(hook);
      }
    }
  }

  return results.length > 0 ? results : null;
}

function main() {
  const staged = getStagedFiles();
  if (staged.length === 0) return 0;

  const suspectFiles = [];
  for (const file of staged) {
    const res = checkFile(file);
    if (res) suspectFiles.push({ file, hooks: res });
  }

  if (suspectFiles.length > 0) {
    console.error('\n\x1b[31m❌ React hooks import check failed for staged files:\x1b[0m');
    for (const s of suspectFiles) {
      console.error(` - ${s.file}: missing imports for [${s.hooks.join(', ')}]`);
    }
    console.error('\nPlease import the hooks from \x1b[36mreact\x1b[0m, e.g. `import { useState } from \"react\";` or use `React.useState`');
    console.error('You can run: \x1b[33mnpm run lint\x1b[0m or add the missing imports and re-stage the files.\n');
    process.exit(1);
  }

  console.log('\x1b[32m✅ React hooks import check passed for staged files\x1b[0m');
  return 0;
}

main();
