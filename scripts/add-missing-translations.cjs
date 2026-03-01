#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const languages = ['en-US', 'pt-BR', 'es-ES', 'fr-FR'];

// Missing keys to add based on CI error
const missingKeys = {
  // architect.common namespace
  common: {
    cancel: {
      'en-US': 'Cancel',
      'pt-BR': 'Cancelar',
      'es-ES': 'Cancelar',
      'fr-FR': 'Annuler'
    },
    confirmDelete: {
      'en-US': 'Are you sure you want to delete this?',
      'pt-BR': 'Tem certeza que deseja excluir isto?',
      'es-ES': '¿Estás seguro de que quieres eliminar esto?',
      'fr-FR': 'Êtes-vous sûr de vouloir supprimer ceci ?'
    },
    loading: {
      'en-US': 'Loading...',
      'pt-BR': 'Carregando...',
      'es-ES': 'Cargando...',
      'fr-FR': 'Chargement...'
    }
  },
  
  // architect.opportunities.validation
  opportunities: {
    validation: {
      projectNameRequired: {
        'en-US': 'Project name is required',
        'pt-BR': 'Nome do projeto é obrigatório',
        'es-ES': 'El nombre del proyecto es obligatorio',
        'fr-FR': 'Le nom du projet est requis'
      }
    }
  },
  
  // architect.proposals
  proposals: {
    client: {
      'en-US': 'Client',
      'pt-BR': 'Cliente',
      'es-ES': 'Cliente',
      'fr-FR': 'Client'
    },
    previewTitle: {
      'en-US': 'Proposal Preview',
      'pt-BR': 'Visualização da Proposta',
      'es-ES': 'Vista previa de la propuesta',
      'fr-FR': 'Aperçu de la proposition'
    },
    sectionsGenerated: {
      'en-US': 'Sections generated successfully',
      'pt-BR': 'Seções geradas com sucesso',
      'es-ES': 'Secciones generadas exitosamente',
      'fr-FR': 'Sections générées avec succès'
    },
    noSectionsGenerated: {
      'en-US': 'No sections generated',
      'pt-BR': 'Nenhuma seção gerada',
      'es-ES': 'No se generaron secciones',
      'fr-FR': 'Aucune section générée'
    },
    generateSectionsFirst: {
      'en-US': 'Please generate sections first',
      'pt-BR': 'Por favor, gere as seções primeiro',
      'es-ES': 'Por favor, genere las secciones primero',
      'fr-FR': 'Veuillez d\'abord générer les sections'
    },
    previewFooter: {
      'en-US': 'This is a preview of your proposal',
      'pt-BR': 'Esta é uma visualização da sua proposta',
      'es-ES': 'Esta es una vista previa de su propuesta',
      'fr-FR': 'Ceci est un aperçu de votre proposition'
    }
  }
};

languages.forEach(lang => {
  const filePath = path.join(__dirname, '../src/locales', lang, 'architect.json');
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  // Add common namespace
  if (!content.common) {
    content.common = {};
  }
  Object.keys(missingKeys.common).forEach(key => {
    content.common[key] = missingKeys.common[key][lang];
  });
  
  // Add opportunities.validation.projectNameRequired
  if (!content.opportunities) {
    content.opportunities = {};
  }
  if (!content.opportunities.validation) {
    content.opportunities.validation = {};
  }
  content.opportunities.validation.projectNameRequired = missingKeys.opportunities.validation.projectNameRequired[lang];
  
  // Add proposals keys
  if (!content.proposals) {
    content.proposals = {};
  }
  Object.keys(missingKeys.proposals).forEach(key => {
    content.proposals[key] = missingKeys.proposals[key][lang];
  });
  
  // Write back
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n');
  console.log(`✅ Updated ${lang}/architect.json`);
});

console.log('\n🎉 Added missing translations to all 4 languages!');
console.log('\nAdded keys:');
console.log('  - architect.common.cancel');
console.log('  - architect.common.confirmDelete');
console.log('  - architect.common.loading');
console.log('  - architect.opportunities.validation.projectNameRequired');
console.log('  - architect.proposals.client');
console.log('  - architect.proposals.previewTitle');
console.log('  - architect.proposals.sectionsGenerated');
console.log('  - architect.proposals.noSectionsGenerated');
console.log('  - architect.proposals.generateSectionsFirst');
console.log('  - architect.proposals.previewFooter');
