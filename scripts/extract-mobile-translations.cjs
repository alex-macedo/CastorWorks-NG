#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const languages = ['en-US', 'pt-BR', 'es-ES', 'fr-FR'];

// Mobile app translation keys to extract
const mobileKeys = [
  'dashboard',
  'currentProject',
  'selectProject',
  'activeProjects',
  'monthlyRevenue',
  'currentPortfolio',
  'viewAll',
  'studioTools',
  'dailyLog',
  'projectChat',
  'annotations',
  'meeting',
  'milestones',
  'timeline',
  'financialHealth',
  'active',
  'manageFinances',
  'noProject',
  'finance',
  'schedule',
  'chat',
  'more',
  'automatedDispatch',
  'weeklyProgressReport',
  'project',
  'sendingIn',
  'days',
  'hours',
  'preview',
  'sendNow',
  'aiInsight',
  'billableHours'
];

languages.forEach(lang => {
  const sourcePath = path.join(__dirname, '../src/locales', lang, 'common.json');
  const targetDir = path.join(__dirname, '../src/locales/mobile', lang);
  const targetPath = path.join(targetDir, 'app.json');
  
  // Read source file
  const sourceContent = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  
  // Extract mobile app translations
  const mobileTranslations = {};
  
  if (sourceContent.app) {
    mobileKeys.forEach(key => {
      if (sourceContent.app[key] !== undefined) {
        mobileTranslations[key] = sourceContent.app[key];
      }
    });
  }
  
  // Create app.json with extracted translations
  const mobileAppContent = {
    app: mobileTranslations
  };
  
  // Write to mobile locale folder
  fs.writeFileSync(targetPath, JSON.stringify(mobileAppContent, null, 2) + '\n');
  console.log(`Created ${lang}/app.json with ${Object.keys(mobileTranslations).length} keys`);
});

console.log('Done! Mobile locale files created.');
