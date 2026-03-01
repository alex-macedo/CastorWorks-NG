#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const languages = ['en-US', 'pt-BR', 'es-ES', 'fr-FR'];

// Missing keys from latest CI error
const missingTranslations = {
  // common namespace
  common: {
    noAddress: {
      'en-US': 'No address provided',
      'pt-BR': 'Nenhum endereço fornecido',
      'es-ES': 'No se proporcionó dirección',
      'fr-FR': 'Aucune adresse fournie'
    },
    colors: {
      'en-US': 'Colors',
      'pt-BR': 'Cores',
      'es-ES': 'Colores',
      'fr-FR': 'Couleurs'
    },
    undo: {
      'en-US': 'Undo',
      'pt-BR': 'Desfazer',
      'es-ES': 'Deshacer',
      'fr-FR': 'Annuler'
    },
    redo: {
      'en-US': 'Redo',
      'pt-BR': 'Refazer',
      'es-ES': 'Rehacer',
      'fr-FR': 'Refaire'
    },
    actions: {
      add: {
        'en-US': 'Add',
        'pt-BR': 'Adicionar',
        'es-ES': 'Agregar',
        'fr-FR': 'Ajouter'
      }
    }
  },
  
  // financial namespace
  financial: {
    recordExpense: {
      'en-US': 'Record Expense',
      'pt-BR': 'Registrar Despesa',
      'es-ES': 'Registrar Gasto',
      'fr-FR': 'Enregistrer Dépense'
    },
    reference: {
      'en-US': 'Reference',
      'pt-BR': 'Referência',
      'es-ES': 'Referencia',
      'fr-FR': 'Référence'
    },
    recentLastThreeDays: {
      'en-US': 'Recent (Last 3 Days)',
      'pt-BR': 'Recente (Últimos 3 Dias)',
      'es-ES': 'Reciente (Últimos 3 Días)',
      'fr-FR': 'Récent (3 Derniers Jours)'
    }
  },
  
  // budget namespace
  budget: {
    costControl: {
      statusLabel: {
        'en-US': 'Status',
        'pt-BR': 'Status',
        'es-ES': 'Estado',
        'fr-FR': 'Statut'
      }
    }
  },
  
  // templates namespace
  templates: {
    summaryTitle: {
      'en-US': 'Import Summary',
      'pt-BR': 'Resumo da Importação',
      'es-ES': 'Resumen de Importación',
      'fr-FR': 'Résumé d\'Importation'
    }
  },
  
  // materials namespace
  materials: {
    laborForm: {
      description: {
        'en-US': 'Labor description',
        'pt-BR': 'Descrição da mão de obra',
        'es-ES': 'Descripción de mano de obra',
        'fr-FR': 'Description de main-d\'œuvre'
      }
    }
  },
  
  // financial.commitments
  commitments: {
    statusLabel: {
      'en-US': 'Status',
      'pt-BR': 'Status',
      'es-ES': 'Estado',
      'fr-FR': 'Statut'
    }
  }
};

languages.forEach(lang => {
  // Update common.json
  const commonPath = path.join(__dirname, '../src/locales', lang, 'common.json');
  const commonContent = JSON.parse(fs.readFileSync(commonPath, 'utf8'));
  
  commonContent.noAddress = missingTranslations.common.noAddress[lang];
  commonContent.colors = missingTranslations.common.colors[lang];
  commonContent.undo = missingTranslations.common.undo[lang];
  commonContent.redo = missingTranslations.common.redo[lang];
  if (!commonContent.actions) commonContent.actions = {};
  commonContent.actions.add = missingTranslations.common.actions.add[lang];
  
  fs.writeFileSync(commonPath, JSON.stringify(commonContent, null, 2) + '\n');
  
  // Update financial.json
  const financialPath = path.join(__dirname, '../src/locales', lang, 'financial.json');
  const financialContent = JSON.parse(fs.readFileSync(financialPath, 'utf8'));
  
  financialContent.recordExpense = missingTranslations.financial.recordExpense[lang];
  financialContent.reference = missingTranslations.financial.reference[lang];
  financialContent.recentLastThreeDays = missingTranslations.financial.recentLastThreeDays[lang];
  if (!financialContent.commitments) financialContent.commitments = {};
  financialContent.commitments.statusLabel = missingTranslations.commitments.statusLabel[lang];
  
  fs.writeFileSync(financialPath, JSON.stringify(financialContent, null, 2) + '\n');
  
  // Update budget.json
  const budgetPath = path.join(__dirname, '../src/locales', lang, 'budget.json');
  const budgetContent = JSON.parse(fs.readFileSync(budgetPath, 'utf8'));
  
  if (!budgetContent.costControl) budgetContent.costControl = {};
  budgetContent.costControl.statusLabel = missingTranslations.budget.costControl.statusLabel[lang];
  
  fs.writeFileSync(budgetPath, JSON.stringify(budgetContent, null, 2) + '\n');
  
  // Update templates.json
  const templatesPath = path.join(__dirname, '../src/locales', lang, 'templates.json');
  const templatesContent = JSON.parse(fs.readFileSync(templatesPath, 'utf8'));
  
  templatesContent.summaryTitle = missingTranslations.templates.summaryTitle[lang];
  
  fs.writeFileSync(templatesPath, JSON.stringify(templatesContent, null, 2) + '\n');
  
  // Update materials.json
  const materialsPath = path.join(__dirname, '../src/locales', lang, 'materials.json');
  const materialsContent = JSON.parse(fs.readFileSync(materialsPath, 'utf8'));
  
  if (!materialsContent.laborForm) materialsContent.laborForm = {};
  materialsContent.laborForm.description = missingTranslations.materials.laborForm.description[lang];
  
  fs.writeFileSync(materialsPath, JSON.stringify(materialsContent, null, 2) + '\n');
  
  console.log(`✅ Updated ${lang} locale files`);
});

console.log('\n🎉 Added all remaining missing translations!');
console.log('\nKeys added:');
console.log('  - common: noAddress, colors, undo, redo, actions.add');
console.log('  - financial: recordExpense, reference, recentLastThreeDays');
console.log('  - financial.commitments: statusLabel');
console.log('  - budget.costControl: statusLabel');
console.log('  - templates: summaryTitle');
console.log('  - materials.laborForm: description');
