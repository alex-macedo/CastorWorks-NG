#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const languages = ['en-US', 'pt-BR', 'es-ES', 'fr-FR'];

// All missing keys with translations
const missingTranslations = {
  // proposals namespace
  proposals: {
    regenerate: {
      'en-US': 'Regenerate',
      'pt-BR': 'Regenerar',
      'es-ES': 'Regenerar',
      'fr-FR': 'Régénérer'
    },
    editPlaceholder: {
      'en-US': 'Edit proposal content...',
      'pt-BR': 'Editar conteúdo da proposta...',
      'es-ES': 'Editar contenido de la propuesta...',
      'fr-FR': 'Modifier le contenu de la proposition...'
    },
    noContent: {
      'en-US': 'No content available',
      'pt-BR': 'Nenhum conteúdo disponível',
      'es-ES': 'No hay contenido disponible',
      'fr-FR': 'Aucun contenu disponible'
    },
    loadDraft: {
      'en-US': 'Load Draft',
      'pt-BR': 'Carregar Rascunho',
      'es-ES': 'Cargar Borrador',
      'fr-FR': 'Charger le Brouillon'
    },
    generating: {
      'en-US': 'Generating...',
      'pt-BR': 'Gerando...',
      'es-ES': 'Generando...',
      'fr-FR': 'Génération en cours...'
    },
    generatedSections: {
      'en-US': 'Generated Sections',
      'pt-BR': 'Seções Geradas',
      'es-ES': 'Secciones Generadas',
      'fr-FR': 'Sections Générées'
    },
    untitledProposal: {
      'en-US': 'Untitled Proposal',
      'pt-BR': 'Proposta Sem Título',
      'es-ES': 'Propuesta Sin Título',
      'fr-FR': 'Proposition Sans Titre'
    },
    noContentToPreview: {
      'en-US': 'No content to preview',
      'pt-BR': 'Nenhum conteúdo para visualizar',
      'es-ES': 'No hay contenido para vista previa',
      'fr-FR': 'Aucun contenu à prévisualiser'
    }
  },
  
  // Root level keys
  selectProjectViewTeam: {
    'en-US': 'Select a project to view team',
    'pt-BR': 'Selecione um projeto para ver a equipe',
    'es-ES': 'Seleccione un proyecto para ver el equipo',
    'fr-FR': 'Sélectionnez un projet pour voir l\'équipe'
  },
  selectProjectViewBudget: {
    'en-US': 'Select a project to view budget',
    'pt-BR': 'Selecione um projeto para ver o orçamento',
    'es-ES': 'Seleccione un proyecto para ver el presupuesto',
    'fr-FR': 'Sélectionnez un projet pour voir le budget'
  },
  
  // common.actions namespace
  common: {
    actions: {
      edit: {
        'en-US': 'Edit',
        'pt-BR': 'Editar',
        'es-ES': 'Editar',
        'fr-FR': 'Modifier'
      },
      delete: {
        'en-US': 'Delete',
        'pt-BR': 'Excluir',
        'es-ES': 'Eliminar',
        'fr-FR': 'Supprimer'
      }
    }
  },
  
  // timeTracking namespace
  timeTracking: {
    editEntry: {
      'en-US': 'Edit Entry',
      'pt-BR': 'Editar Lançamento',
      'es-ES': 'Editar Entrada',
      'fr-FR': 'Modifier l\'Entrée'
    },
    task: {
      'en-US': 'Task',
      'pt-BR': 'Tarefa',
      'es-ES': 'Tarea',
      'fr-FR': 'Tâche'
    },
    durationMinutes: {
      'en-US': 'Duration (minutes)',
      'pt-BR': 'Duração (minutos)',
      'es-ES': 'Duración (minutos)',
      'fr-FR': 'Durée (minutes)'
    },
    confirmDelete: {
      'en-US': 'Delete this time entry?',
      'pt-BR': 'Excluir este lançamento de tempo?',
      'es-ES': '¿Eliminar esta entrada de tiempo?',
      'fr-FR': 'Supprimer cette entrée de temps ?'
    },
    recentEntries: {
      'en-US': 'Recent Entries',
      'pt-BR': 'Lançamentos Recentes',
      'es-ES': 'Entradas Recientes',
      'fr-FR': 'Entrées Récentes'
    },
    entry: {
      'en-US': 'Entry',
      'pt-BR': 'Lançamento',
      'es-ES': 'Entrada',
      'fr-FR': 'Entrée'
    },
    entries: {
      'en-US': 'Entries',
      'pt-BR': 'Lançamentos',
      'es-ES': 'Entradas',
      'fr-FR': 'Entrées'
    },
    title: {
      'en-US': 'Time Tracking',
      'pt-BR': 'Controle de Tempo',
      'es-ES': 'Control de Tiempo',
      'fr-FR': 'Suivi du Temps'
    },
    discard: {
      'en-US': 'Discard',
      'pt-BR': 'Descartar',
      'es-ES': 'Descartar',
      'fr-FR': 'Annuler'
    },
    dailyTotal: {
      'en-US': 'Daily Total',
      'pt-BR': 'Total do Dia',
      'es-ES': 'Total del Día',
      'fr-FR': 'Total Journalier'
    }
  }
};

languages.forEach(lang => {
  const filePath = path.join(__dirname, '../src/locales', lang, 'architect.json');
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  // Add proposals keys
  if (!content.proposals) content.proposals = {};
  Object.keys(missingTranslations.proposals).forEach(key => {
    content.proposals[key] = missingTranslations.proposals[key][lang];
  });
  
  // Add root level keys
  content.selectProjectViewTeam = missingTranslations.selectProjectViewTeam[lang];
  content.selectProjectViewBudget = missingTranslations.selectProjectViewBudget[lang];
  
  // Add common.actions keys
  if (!content.common) content.common = {};
  if (!content.common.actions) content.common.actions = {};
  content.common.actions.edit = missingTranslations.common.actions.edit[lang];
  content.common.actions.delete = missingTranslations.common.actions.delete[lang];
  
  // Add timeTracking keys
  if (!content.timeTracking) content.timeTracking = {};
  Object.keys(missingTranslations.timeTracking).forEach(key => {
    content.timeTracking[key] = missingTranslations.timeTracking[key][lang];
  });
  
  // Write back
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n');
  console.log(`✅ Updated ${lang}/architect.json with 22 new keys`);
});

console.log('\n🎉 Added all 22 missing architect translations!');
