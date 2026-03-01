/**
 * ESLint rule: no-missing-react-hook-imports
 * Flags usages of common React hooks (useState, useEffect, etc.) in a file
 * where the hook is not imported from 'react' and React default is not imported.
 */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow usage of React hooks without importing them from react',
      recommended: true,
    },
      fixable: 'code',
    schema: [],
    messages: {
      missingImport: 'React hook "{{name}}" is used but not imported from "react". Add `import { {{name}} } from "react"` or use `React.{{name}}`.',
      missingImports: 'React hooks {{names}} are used but not imported from "react". This rule can auto-fix by adding the imports.',
    },
  },

  create(context) {
    const sourceCode = context.getSourceCode();
    const hookNames = new Set(['useState','useEffect','useRef','useCallback','useMemo','useContext','useLayoutEffect','useImperativeHandle','useReducer','useDeferredValue','useId','useTransition']);

    // Helpers to determine imports and local definitions
    function hasDefaultReactImport(ast) {
      return ast.body.some(node =>
        node.type === 'ImportDeclaration' &&
        node.source && node.source.value === 'react' &&
        node.specifiers.some(s => s.type === 'ImportDefaultSpecifier')
      );
    }

    function getNamedReactImports(ast) {
      const set = new Set();
      ast.body.forEach(node => {
        if (node.type === 'ImportDeclaration' && node.source && node.source.value === 'react') {
          node.specifiers.forEach(spec => {
            if (spec.type === 'ImportSpecifier' && spec.imported && spec.imported.name) {
              set.add(spec.imported.name);
            }
          });
        }
      });
      return set;
    }

    // We'll compute react imports at Program start
    let namedImports = new Set();
    let hasReactDefault = false;

    // Collect missing hooks per file so we can auto-fix in a single edit
    const missingHooks = new Set();
    let reactImportNode = null;

    return {
      Program(programNode) {
        // compute existing imports
        namedImports = getNamedReactImports(programNode);
        hasReactDefault = hasDefaultReactImport(programNode);
        // find react import node if present
        for (const node of programNode.body) {
          if (node.type === 'ImportDeclaration' && node.source && node.source.value === 'react') {
            reactImportNode = node;
            break;
          }
        }
      },

      Identifier(node) {
        const name = node.name;
        if (!hookNames.has(name)) return;

        // skip React.useX usages
        const parent = node.parent;
        if (parent && parent.type === 'MemberExpression' && parent.object && parent.object.type === 'Identifier' && parent.object.name === 'React') {
          return;
        }

        // skip if locally declared
        const scopeManager = sourceCode.scopeManager;
        let isDeclared = false;
        if (scopeManager && scopeManager.scopes) {
          for (const s of scopeManager.scopes) {
            if (s.variables && s.variables.some(v => v.name === name)) {
              isDeclared = true;
              break;
            }
          }
        }
        if (isDeclared) return;

        // skip if already imported or React default present
        if (namedImports.has(name) || hasReactDefault) return;

        missingHooks.add(name);
      },

      'Program:exit'(programNode) {
        if (missingHooks.size === 0) return;

        const hooksToAdd = Array.from(missingHooks).sort();

        context.report({
          node: programNode,
          messageId: 'missingImports',
          data: { names: hooksToAdd.join(', ') },
          fix(fixer) {
            // If there is an existing react import, modify it; otherwise insert a new import
            if (reactImportNode) {
              // Determine default import name (if any) and existing named imports
              const defaultSpec = reactImportNode.specifiers.find(s => s.type === 'ImportDefaultSpecifier');
              const namedSpecs = reactImportNode.specifiers.filter(s => s.type === 'ImportSpecifier');
              const existingNamed = namedSpecs.map(s => s.imported.name);

              const finalNamed = Array.from(new Set([...existingNamed, ...hooksToAdd]));

              let newImportText = '';
              if (defaultSpec) {
                newImportText = `import ${defaultSpec.local.name}, { ${finalNamed.join(', ')} } from 'react';`;
              } else {
                newImportText = `import { ${finalNamed.join(', ')} } from 'react';`;
              }

              return fixer.replaceText(reactImportNode, newImportText);
            } else {
              // Insert a new import at top of file before first statement
              const firstNode = programNode.body[0];
              const newImport = `import { ${hooksToAdd.join(', ')} } from 'react';\n`;
              if (firstNode) {
                return fixer.insertTextBefore(firstNode, newImport);
              } else {
                return fixer.insertTextAfterRange([0,0], newImport);
              }
            }
          }
        });
      }
    };
  }
};
