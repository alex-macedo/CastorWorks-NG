const path = require('path');

module.exports = {
  input: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.test.{js,jsx,ts,tsx}',
    '!src/**/*.spec.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/*.d.ts',
  ],
  output: './',
  options: {
    debug: true,
    sort: true,
    func: {
      list: ['t'],
      extensions: ['.js', '.jsx', '.ts', '.tsx']
    },
    lngs: ['en-US', 'pt-BR', 'es-ES', 'fr-FR'],
    fallbackLng: {
      default: ['en-US']
    },
    ns: [
      'accessibility', 'admin', 'ai', 'aiInsights', 'aiProviders', 'analytics', 
      'approvals', 'architect', 'auth', 'budget', 'budgets', 'campaigns', 
      'clientAccess', 'cliente', 'clientPortal', 'clientReport', 'clients', 
      'common', 'constructionActivities', 'contacts', 'contentHub', 
      'customerPortal', 'dashboard', 'documentation', 'documents', 'estimates', 
      'financial', 'financialInvoice', 'forms', 'logistics', 'maintenance', 'materials', 
      'navigation', 'notFound', 'notifications', 'obras', 'overallStatus', 
      'pages', 'payments', 'phases', 'phaseTemplates', 'procurement', 
      'projectCalendar', 'projectDetail', 'projectPhases', 'projects', 'projectsTimeline', 
      'proposals', 'purchaseRequest', 'reports', 'roadmap', 'roadmapAnalytics', 
      'schedule', 'settings', 'supervisor', 'suppliers', 'taskManagement', 
      'topBar', 'weather', 'templates', 'projectWbsTemplates',
      'app', 'contractors'
    ],
    defaultNs: 'common',
    resource: {
      loadPath: path.join(__dirname, 'src/locales/{{lng}}/{{ns}}.json'),
      savePath: 'src/locales/{{lng}}/{{ns}}.json',
      jsonIndent: 2,
      lineEnding: '\n'
    },
    interpolation: {
      prefix: '{{',
      suffix: '}}'
    },
    keySeparator: '.',
    nsSeparator: ':',
    pluralSeparator: '_',
    contextSeparator: '_',
    keepRemoved: true,
    defaultValue: (lng, ns, key) => {
      if (lng === 'en-US') {
        return key.split('.').pop();
      }
      return '';
    }
  }
}
