// ALL translations bundled for instant display - NO PLACEHOLDERS EVER
// This ensures the app works correctly on ALL pages without requiring refresh
import type { Language } from '@/contexts/LocalizationContext';

// en-US imports
import accessibilityEnUS from './en-US/accessibility.json';
import adminEnUS from './en-US/admin.json';
import aiEnUS from './en-US/ai.json';
import aiInsightsEnUS from './en-US/aiInsights.json';
import aiProvidersEnUS from './en-US/aiProviders.json';
import analyticsEnUS from './en-US/analytics.json';
import appEnUS from './en-US/app.json';
import approvalsEnUS from './en-US/approvals.json';
import architectEnUS from './en-US/architect.json';
import authEnUS from './en-US/auth.json';
import budgetEnUS from './en-US/budget.json';
import campaignsEnUS from './en-US/campaigns.json';
import clientAccessEnUS from './en-US/clientAccess.json';
import clienteEnUS from './en-US/cliente.json';
import clientPortalEnUS from './en-US/clientPortal.json';
import clientReportEnUS from './en-US/clientReport.json';
import clientsEnUS from './en-US/clients.json';
import commonEnUS from './en-US/common.json';
import constructionActivitiesEnUS from './en-US/constructionActivities.json';
import contactsEnUS from './en-US/contacts.json';
import customerPortalEnUS from './en-US/customerPortal.json';
import dashboardEnUS from './en-US/dashboard.json';
import documentationEnUS from './en-US/documentation.json';
import documentsEnUS from './en-US/documents.json';
import estimatesEnUS from './en-US/estimates.json';
import financialEnUS from './en-US/financial.json';
import financialInvoiceEnUS from './en-US/financialInvoice.json';
import maintenanceEnUS from './en-US/maintenance.json';
import materialsEnUS from './en-US/materials.json';
import navigationEnUS from './en-US/navigation.json';
import notFoundEnUS from './en-US/notFound.json';
import notificationsEnUS from './en-US/notifications.json';
import obrasEnUS from './en-US/obras.json';
import overallStatusEnUS from './en-US/overallStatus.json';
import pagesEnUS from './en-US/pages.json';
import paymentsEnUS from './en-US/payments.json';
import phasesEnUS from './en-US/phases.json';
import phaseTemplatesEnUS from './en-US/phaseTemplates.json';
import procurementEnUS from './en-US/procurement.json';
import projectDetailEnUS from './en-US/projectDetail.json';
import projectCalendarEnUS from './en-US/projectCalendar.json';
import projectPhasesEnUS from './en-US/projectPhases.json';
import projectsEnUS from './en-US/projects.json';
import projectsTimelineEnUS from './en-US/projectsTimeline.json';
import proposalsEnUS from './en-US/proposals.json';
import purchaseRequestEnUS from './en-US/purchaseRequest.json';
import reportsEnUS from './en-US/reports.json';
import roadmapEnUS from './en-US/roadmap.json';
import roadmapAnalyticsEnUS from './en-US/roadmapAnalytics.json';
import scheduleEnUS from './en-US/schedule.json';
import settingsEnUS from './en-US/settings.json';
import supervisorEnUS from './en-US/supervisor.json';
import suppliersEnUS from './en-US/suppliers.json';
import taskManagementEnUS from './en-US/taskManagement.json';
import topBarEnUS from './en-US/topBar.json';
import weatherEnUS from './en-US/weather.json';
import templatesEnUS from './en-US/templates.json';
import projectWbsTemplatesEnUS from './en-US/projectWbsTemplates.json';
import budgetsEnUS from './en-US/budgets.json';
import contentHubEnUS from './en-US/contentHub.json';
import formsEnUS from './en-US/forms.json';
import annotationsEnUS from './en-US/annotations.json';
import emailEnUS from './en-US/email.json';
import logisticsEnUS from './en-US/logistics.json';
import timelineEnUS from './en-US/timeline.json';
import subscriptionEnUS from './en-US/subscription.json';
import trialEnUS from './en-US/trial.json';

// pt-BR imports
import accessibilityPtBR from './pt-BR/accessibility.json';
import adminPtBR from './pt-BR/admin.json';
import aiPtBR from './pt-BR/ai.json';
import aiInsightsPtBR from './pt-BR/aiInsights.json';
import aiProvidersPtBR from './pt-BR/aiProviders.json';
import analyticsPtBR from './pt-BR/analytics.json';
import appPtBR from './pt-BR/app.json';
import approvalsPtBR from './pt-BR/approvals.json';
import architectPtBR from './pt-BR/architect.json';
import authPtBR from './pt-BR/auth.json';
import budgetPtBR from './pt-BR/budget.json';
import campaignsPtBR from './pt-BR/campaigns.json';
import clientAccessPtBR from './pt-BR/clientAccess.json';
import clientePtBR from './pt-BR/cliente.json';
import clientPortalPtBR from './pt-BR/clientPortal.json';
import clientReportPtBR from './pt-BR/clientReport.json';
import clientsPtBR from './pt-BR/clients.json';
import commonPtBR from './pt-BR/common.json';
import constructionActivitiesPtBR from './pt-BR/constructionActivities.json';
import contactsPtBR from './pt-BR/contacts.json';
import customerPortalPtBR from './pt-BR/customerPortal.json';
import dashboardPtBR from './pt-BR/dashboard.json';
import documentationPtBR from './pt-BR/documentation.json';
import documentsPtBR from './pt-BR/documents.json';
import estimatesPtBR from './pt-BR/estimates.json';
import financialPtBR from './pt-BR/financial.json';
import financialInvoicePtBR from './pt-BR/financialInvoice.json';
import maintenancePtBR from './pt-BR/maintenance.json';
import materialsPtBR from './pt-BR/materials.json';
import navigationPtBR from './pt-BR/navigation.json';
import notFoundPtBR from './pt-BR/notFound.json';
import notificationsPtBR from './pt-BR/notifications.json';
import obrasPtBR from './pt-BR/obras.json';
import overallStatusPtBR from './pt-BR/overallStatus.json';
import pagesPtBR from './pt-BR/pages.json';
import paymentsPtBR from './pt-BR/payments.json';
import phasesPtBR from './pt-BR/phases.json';
import phaseTemplatesPtBR from './pt-BR/phaseTemplates.json';
import procurementPtBR from './pt-BR/procurement.json';
import projectDetailPtBR from './pt-BR/projectDetail.json';
import projectCalendarPtBR from './pt-BR/projectCalendar.json';
import projectPhasesPtBR from './pt-BR/projectPhases.json';
import projectsPtBR from './pt-BR/projects.json';
import projectsTimelinePtBR from './pt-BR/projectsTimeline.json';
import proposalsPtBR from './pt-BR/proposals.json';
import purchaseRequestPtBR from './pt-BR/purchaseRequest.json';
import reportsPtBR from './pt-BR/reports.json';
import roadmapPtBR from './pt-BR/roadmap.json';
import roadmapAnalyticsPtBR from './pt-BR/roadmapAnalytics.json';
import schedulePtBR from './pt-BR/schedule.json';
import settingsPtBR from './pt-BR/settings.json';
import supervisorPtBR from './pt-BR/supervisor.json';
import suppliersPtBR from './pt-BR/suppliers.json';
import taskManagementPtBR from './pt-BR/taskManagement.json';
import topBarPtBR from './pt-BR/topBar.json';
import weatherPtBR from './pt-BR/weather.json';
import templatesPtBR from './pt-BR/templates.json';
import projectWbsTemplatesPtBR from './pt-BR/projectWbsTemplates.json';
import budgetsPtBR from './pt-BR/budgets.json';
import contentHubPtBR from './pt-BR/contentHub.json';
import formsPtBR from './pt-BR/forms.json';
import annotationsPtBR from './pt-BR/annotations.json';
import emailPtBR from './pt-BR/email.json';
import logisticsPtBR from './pt-BR/logistics.json';
import timelinePtBR from './pt-BR/timeline.json';
import subscriptionPtBR from './pt-BR/subscription.json';
import trialPtBR from './pt-BR/trial.json';

// es-ES imports
import accessibilityEsES from './es-ES/accessibility.json';
import adminEsES from './es-ES/admin.json';
import aiEsES from './es-ES/ai.json';
import aiInsightsEsES from './es-ES/aiInsights.json';
import aiProvidersEsES from './es-ES/aiProviders.json';
import analyticsEsES from './es-ES/analytics.json';
import appEsES from './es-ES/app.json';
import approvalsEsES from './es-ES/approvals.json';
import architectEsES from './es-ES/architect.json';
import authEsES from './es-ES/auth.json';
import budgetEsES from './es-ES/budget.json';
import campaignsEsES from './es-ES/campaigns.json';
import clientAccessEsES from './es-ES/clientAccess.json';
import clienteEsES from './es-ES/cliente.json';
import clientPortalEsES from './es-ES/clientPortal.json';
import clientReportEsES from './es-ES/clientReport.json';
import clientsEsES from './es-ES/clients.json';
import commonEsES from './es-ES/common.json';
import constructionActivitiesEsES from './es-ES/constructionActivities.json';
import contactsEsES from './es-ES/contacts.json';
import customerPortalEsES from './es-ES/customerPortal.json';
import dashboardEsES from './es-ES/dashboard.json';
import documentationEsES from './es-ES/documentation.json';
import documentsEsES from './es-ES/documents.json';
import estimatesEsES from './es-ES/estimates.json';
import financialEsES from './es-ES/financial.json';
import financialInvoiceEsES from './es-ES/financialInvoice.json';
import maintenanceEsES from './es-ES/maintenance.json';
import materialsEsES from './es-ES/materials.json';
import navigationEsES from './es-ES/navigation.json';
import notFoundEsES from './es-ES/notFound.json';
import notificationsEsES from './es-ES/notifications.json';
import obrasEsES from './es-ES/obras.json';
import overallStatusEsES from './es-ES/overallStatus.json';
import pagesEsES from './es-ES/pages.json';
import paymentsEsES from './es-ES/payments.json';
import phasesEsES from './es-ES/phases.json';
import phaseTemplatesEsES from './es-ES/phaseTemplates.json';
import procurementEsES from './es-ES/procurement.json';
import projectDetailEsES from './es-ES/projectDetail.json';
import projectCalendarEsES from './es-ES/projectCalendar.json';
import projectPhasesEsES from './es-ES/projectPhases.json';
import projectsEsES from './es-ES/projects.json';
import projectsTimelineEsES from './es-ES/projectsTimeline.json';
import proposalsEsES from './es-ES/proposals.json';
import purchaseRequestEsES from './es-ES/purchaseRequest.json';
import reportsEsES from './es-ES/reports.json';
import roadmapEsES from './es-ES/roadmap.json';
import roadmapAnalyticsEsES from './es-ES/roadmapAnalytics.json';
import scheduleEsES from './es-ES/schedule.json';
import settingsEsES from './es-ES/settings.json';
import supervisorEsES from './es-ES/supervisor.json';
import suppliersEsES from './es-ES/suppliers.json';
import taskManagementEsES from './es-ES/taskManagement.json';
import topBarEsES from './es-ES/topBar.json';
import weatherEsES from './es-ES/weather.json';
import templatesEsES from './es-ES/templates.json';
import projectWbsTemplatesEsES from './es-ES/projectWbsTemplates.json';
import budgetsEsES from './es-ES/budgets.json';
import contentHubEsES from './es-ES/contentHub.json';
import formsEsES from './es-ES/forms.json';
import annotationsEsES from './es-ES/annotations.json';
import emailEsES from './es-ES/email.json';
import logisticsEsES from './es-ES/logistics.json';
import timelineEsES from './es-ES/timeline.json';
import subscriptionEsES from './es-ES/subscription.json';
import trialEsES from './es-ES/trial.json';

// fr-FR imports
import accessibilityFrFR from './fr-FR/accessibility.json';
import adminFrFR from './fr-FR/admin.json';
import aiFrFR from './fr-FR/ai.json';
import aiInsightsFrFR from './fr-FR/aiInsights.json';
import aiProvidersFrFR from './fr-FR/aiProviders.json';
import analyticsFrFR from './fr-FR/analytics.json';
import appFrFR from './fr-FR/app.json';
import approvalsFrFR from './fr-FR/approvals.json';
import architectFrFR from './fr-FR/architect.json';
import authFrFR from './fr-FR/auth.json';
import budgetFrFR from './fr-FR/budget.json';
import campaignsFrFR from './fr-FR/campaigns.json';
import clientAccessFrFR from './fr-FR/clientAccess.json';
import clienteFrFR from './fr-FR/cliente.json';
import clientPortalFrFR from './fr-FR/clientPortal.json';
import clientReportFrFR from './fr-FR/clientReport.json';
import clientsFrFR from './fr-FR/clients.json';
import commonFrFR from './fr-FR/common.json';
import constructionActivitiesFrFR from './fr-FR/constructionActivities.json';
import contactsFrFR from './fr-FR/contacts.json';
import customerPortalFrFR from './fr-FR/customerPortal.json';
import dashboardFrFR from './fr-FR/dashboard.json';
import documentationFrFR from './fr-FR/documentation.json';
import documentsFrFR from './fr-FR/documents.json';
import estimatesFrFR from './fr-FR/estimates.json';
import financialFrFR from './fr-FR/financial.json';
import financialInvoiceFrFR from './fr-FR/financialInvoice.json';
import maintenanceFrFR from './fr-FR/maintenance.json';
import materialsFrFR from './fr-FR/materials.json';
import navigationFrFR from './fr-FR/navigation.json';
import notFoundFrFR from './fr-FR/notFound.json';
import notificationsFrFR from './fr-FR/notifications.json';
import obrasFrFR from './fr-FR/obras.json';
import overallStatusFrFR from './fr-FR/overallStatus.json';
import pagesFrFR from './fr-FR/pages.json';
import paymentsFrFR from './fr-FR/payments.json';
import phasesFrFR from './fr-FR/phases.json';
import phaseTemplatesFrFR from './fr-FR/phaseTemplates.json';
import procurementFrFR from './fr-FR/procurement.json';
import projectDetailFrFR from './fr-FR/projectDetail.json';
import projectCalendarFrFR from './fr-FR/projectCalendar.json';
import projectPhasesFrFR from './fr-FR/projectPhases.json';
import projectsFrFR from './fr-FR/projects.json';
import projectsTimelineFrFR from './fr-FR/projectsTimeline.json';
import proposalsFrFR from './fr-FR/proposals.json';
import purchaseRequestFrFR from './fr-FR/purchaseRequest.json';
import reportsFrFR from './fr-FR/reports.json';
import roadmapFrFR from './fr-FR/roadmap.json';
import roadmapAnalyticsFrFR from './fr-FR/roadmapAnalytics.json';
import scheduleFrFR from './fr-FR/schedule.json';
import settingsFrFR from './fr-FR/settings.json';
import supervisorFrFR from './fr-FR/supervisor.json';
import suppliersFrFR from './fr-FR/suppliers.json';
import taskManagementFrFR from './fr-FR/taskManagement.json';
import topBarFrFR from './fr-FR/topBar.json';
import weatherFrFR from './fr-FR/weather.json';
import templatesFrFR from './fr-FR/templates.json';
import projectWbsTemplatesFrFR from './fr-FR/projectWbsTemplates.json';
import budgetsFrFR from './fr-FR/budgets.json';
import contentHubFrFR from './fr-FR/contentHub.json';
import formsFrFR from './fr-FR/forms.json';
import annotationsFrFR from './fr-FR/annotations.json';
import emailFrFR from './fr-FR/email.json';
import logisticsFrFR from './fr-FR/logistics.json';
import timelineFrFR from './fr-FR/timeline.json';
import subscriptionFrFR from './fr-FR/subscription.json';
import trialFrFR from './fr-FR/trial.json';

export const criticalTranslations: Record<Language, Record<string, any>> = {
  'en-US': {
    accessibility: accessibilityEnUS,
    admin: adminEnUS,
    ai: aiEnUS,
    aiInsights: aiInsightsEnUS,
    aiProviders: aiProvidersEnUS,
    analytics: analyticsEnUS,
    app: appEnUS,
    approvals: approvalsEnUS,
    architect: architectEnUS,
    auth: authEnUS,
    budget: budgetEnUS,
    campaigns: campaignsEnUS,
    clientAccess: clientAccessEnUS,
    cliente: clienteEnUS,
    clientPortal: clientPortalEnUS,
    clientReport: clientReportEnUS,
    clients: clientsEnUS,
    common: commonEnUS,
    constructionActivities: constructionActivitiesEnUS,
    contacts: contactsEnUS,
    customerPortal: customerPortalEnUS,
    dashboard: dashboardEnUS,
    documentation: documentationEnUS,
    documents: documentsEnUS,
    estimates: estimatesEnUS,
    financial: financialEnUS,
    financialInvoice: financialInvoiceEnUS,
    maintenance: maintenanceEnUS,
    materials: materialsEnUS,
    navigation: navigationEnUS,
    notFound: notFoundEnUS,
    notifications: notificationsEnUS,
    obras: obrasEnUS,
    overallStatus: overallStatusEnUS,
    pages: pagesEnUS,
    payments: paymentsEnUS,
    phases: phasesEnUS,
    phaseTemplates: phaseTemplatesEnUS,
    procurement: procurementEnUS,
    projectDetail: projectDetailEnUS,
    projectCalendar: projectCalendarEnUS,
    projectPhases: projectPhasesEnUS,
    projects: projectsEnUS,
    projectsTimeline: projectsTimelineEnUS,
    proposals: proposalsEnUS,
    purchaseRequest: purchaseRequestEnUS,
    reports: reportsEnUS,
    roadmap: roadmapEnUS,
    roadmapAnalytics: roadmapAnalyticsEnUS,
    schedule: scheduleEnUS,
    settings: settingsEnUS,
    supervisor: supervisorEnUS,
    suppliers: suppliersEnUS,
    taskManagement: taskManagementEnUS,
    topBar: topBarEnUS,
    weather: weatherEnUS,
    templates: templatesEnUS,
    projectWbsTemplates: projectWbsTemplatesEnUS,
    budgets: budgetsEnUS,
    contentHub: contentHubEnUS,
    forms: formsEnUS,
    annotations: annotationsEnUS,
    email: emailEnUS,
    logistics: logisticsEnUS,
    timeline: timelineEnUS,
    subscription: subscriptionEnUS,
    trial: trialEnUS,
  },
  'pt-BR': {
    accessibility: accessibilityPtBR,
    admin: adminPtBR,
    ai: aiPtBR,
    aiInsights: aiInsightsPtBR,
    aiProviders: aiProvidersPtBR,
    analytics: analyticsPtBR,
    app: appPtBR,
    approvals: approvalsPtBR,
    architect: architectPtBR,
    auth: authPtBR,
    budget: budgetPtBR,
    campaigns: campaignsPtBR,
    clientAccess: clientAccessPtBR,
    cliente: clientePtBR,
    clientPortal: clientPortalPtBR,
    clientReport: clientReportPtBR,
    clients: clientsPtBR,
    common: commonPtBR,
    constructionActivities: constructionActivitiesPtBR,
    contacts: contactsPtBR,
    customerPortal: customerPortalPtBR,
    dashboard: dashboardPtBR,
    documentation: documentationPtBR,
    documents: documentsPtBR,
    estimates: estimatesPtBR,
    financial: financialPtBR,
    financialInvoice: financialInvoicePtBR,
    maintenance: maintenancePtBR,
    materials: materialsPtBR,
    navigation: navigationPtBR,
    notFound: notFoundPtBR,
    notifications: notificationsPtBR,
    obras: obrasPtBR,
    overallStatus: overallStatusPtBR,
    pages: pagesPtBR,
    payments: paymentsPtBR,
    phases: phasesPtBR,
    phaseTemplates: phaseTemplatesPtBR,
    procurement: procurementPtBR,
    projectDetail: projectDetailPtBR,
    projectCalendar: projectCalendarPtBR,
    projectPhases: projectPhasesPtBR,
    projects: projectsPtBR,
    projectsTimeline: projectsTimelinePtBR,
    proposals: proposalsPtBR,
    purchaseRequest: purchaseRequestPtBR,
    reports: reportsPtBR,
    roadmap: roadmapPtBR,
    roadmapAnalytics: roadmapAnalyticsPtBR,
    schedule: schedulePtBR,
    settings: settingsPtBR,
    supervisor: supervisorPtBR,
    suppliers: suppliersPtBR,
    taskManagement: taskManagementPtBR,
    topBar: topBarPtBR,
    weather: weatherPtBR,
    templates: templatesPtBR,
    projectWbsTemplates: projectWbsTemplatesPtBR,
    budgets: budgetsPtBR,
    contentHub: contentHubPtBR,
    forms: formsPtBR,
    annotations: annotationsPtBR,
    email: emailPtBR,
    logistics: logisticsPtBR,
    timeline: timelinePtBR,
    subscription: subscriptionPtBR,
    trial: trialPtBR,
  },
  'es-ES': {
    accessibility: accessibilityEsES,
    admin: adminEsES,
    ai: aiEsES,
    aiInsights: aiInsightsEsES,
    aiProviders: aiProvidersEsES,
    analytics: analyticsEsES,
    app: appEsES,
    approvals: approvalsEsES,
    architect: architectEsES,
    auth: authEsES,
    budget: budgetEsES,
    campaigns: campaignsEsES,
    clientAccess: clientAccessEsES,
    cliente: clienteEsES,
    clientPortal: clientPortalEsES,
    clientReport: clientReportEsES,
    clients: clientsEsES,
    common: commonEsES,
    constructionActivities: constructionActivitiesEsES,
    contacts: contactsEsES,
    customerPortal: customerPortalEsES,
    dashboard: dashboardEsES,
    documentation: documentationEsES,
    documents: documentsEsES,
    estimates: estimatesEsES,
    financial: financialEsES,
    financialInvoice: financialInvoiceEsES,
    maintenance: maintenanceEsES,
    materials: materialsEsES,
    navigation: navigationEsES,
    notFound: notFoundEsES,
    notifications: notificationsEsES,
    obras: obrasEsES,
    overallStatus: overallStatusEsES,
    pages: pagesEsES,
    payments: paymentsEsES,
    phases: phasesEsES,
    phaseTemplates: phaseTemplatesEsES,
    procurement: procurementEsES,
    projectDetail: projectDetailEsES,
    projectCalendar: projectCalendarEsES,
    projectPhases: projectPhasesEsES,
    projects: projectsEsES,
    projectsTimeline: projectsTimelineEsES,
    proposals: proposalsEsES,
    purchaseRequest: purchaseRequestEsES,
    reports: reportsEsES,
    roadmap: roadmapEsES,
    roadmapAnalytics: roadmapAnalyticsEsES,
    schedule: scheduleEsES,
    settings: settingsEsES,
    supervisor: supervisorEsES,
    suppliers: suppliersEsES,
    taskManagement: taskManagementEsES,
    topBar: topBarEsES,
    weather: weatherEsES,
    templates: templatesEsES,
    projectWbsTemplates: projectWbsTemplatesEsES,
    budgets: budgetsEsES,
    contentHub: contentHubEsES,
    forms: formsEsES,
    annotations: annotationsEsES,
    email: emailEsES,
    logistics: logisticsEsES,
    timeline: timelineEsES,
    subscription: subscriptionEsES,
    trial: trialEsES,
  },
  'fr-FR': {
    accessibility: accessibilityFrFR,
    admin: adminFrFR,
    ai: aiFrFR,
    aiInsights: aiInsightsFrFR,
    aiProviders: aiProvidersFrFR,
    analytics: analyticsFrFR,
    app: appFrFR,
    approvals: approvalsFrFR,
    architect: architectFrFR,
    auth: authFrFR,
    budget: budgetFrFR,
    campaigns: campaignsFrFR,
    clientAccess: clientAccessFrFR,
    cliente: clienteFrFR,
    clientPortal: clientPortalFrFR,
    clientReport: clientReportFrFR,
    clients: clientsFrFR,
    common: commonFrFR,
    constructionActivities: constructionActivitiesFrFR,
    contacts: contactsFrFR,
    customerPortal: customerPortalFrFR,
    dashboard: dashboardFrFR,
    documentation: documentationFrFR,
    documents: documentsFrFR,
    estimates: estimatesFrFR,
    financial: financialFrFR,
    financialInvoice: financialInvoiceFrFR,
    maintenance: maintenanceFrFR,
    materials: materialsFrFR,
    navigation: navigationFrFR,
    notFound: notFoundFrFR,
    notifications: notificationsFrFR,
    obras: obrasFrFR,
    overallStatus: overallStatusFrFR,
    pages: pagesFrFR,
    payments: paymentsFrFR,
    phases: phasesFrFR,
    phaseTemplates: phaseTemplatesFrFR,
    procurement: procurementFrFR,
    projectDetail: projectDetailFrFR,
    projectCalendar: projectCalendarFrFR,
    projectPhases: projectPhasesFrFR,
    projects: projectsFrFR,
    projectsTimeline: projectsTimelineFrFR,
    proposals: proposalsFrFR,
    purchaseRequest: purchaseRequestFrFR,
    reports: reportsFrFR,
    roadmap: roadmapFrFR,
    roadmapAnalytics: roadmapAnalyticsFrFR,
    schedule: scheduleFrFR,
    settings: settingsFrFR,
    supervisor: supervisorFrFR,
    suppliers: suppliersFrFR,
    taskManagement: taskManagementFrFR,
    topBar: topBarFrFR,
    weather: weatherFrFR,
    templates: templatesFrFR,
    projectWbsTemplates: projectWbsTemplatesFrFR,
    budgets: budgetsFrFR,
    contentHub: contentHubFrFR,
    forms: formsFrFR,
    annotations: annotationsFrFR,
    email: emailFrFR,
    logistics: logisticsFrFR,
    timeline: timelineFrFR,
    subscription: subscriptionFrFR,
    trial: trialFrFR,
  },
};

// Feature-specific namespaces - kept for backward compatibility but all are now bundled
export const FEATURE_NAMESPACES = [
  'pages',
  'settings',
  'dashboard',
  'projects',
  'projectsTimeline',
  'projectDetail',
  'projectCalendar',
  'projectPhases',
  'taskManagement',
  'clients',
  'cliente',
  'clientPortal',
  'clientReport',
  'clientAccess',
  'contacts',
  'budget',
  'financial',
  'materials',
  'procurement',
  'purchaseRequest',
  'payments',
  'schedule',
  'weather',
  'reports',
  'admin',
  'aiInsights',
  'aiProviders',
  'analytics',
  'roadmap',
  'phaseTemplates',
  'templates',
  'projectWbsTemplates',
  'constructionActivities',
  'overallStatus',
  'campaigns',
  'notFound',
  'auth',
  'maintenance',
  'documentation',
  'supervisor',
  'estimates',
  'documents',
  'architect',
  'ai',
  'notifications',
  'proposals',
  'suppliers',
  'budgets',
  'navigation',
  'contentHub',
  'annotations',
  'email',
  'logistics',
  'timeline',
] as const;

export type FeatureNamespace = typeof FEATURE_NAMESPACES[number];

// Map routes to their required translation namespaces - kept for documentation
export const ROUTE_NAMESPACE_MAP: Record<string, FeatureNamespace[]> = {
  '/': ['notFound', 'roadmap'],
  '/login': ['auth'],
  '/register': ['auth'],
  '/forgot-password': ['auth'],
  '/calendar': ['pages'],
   '/dashboard': ['dashboard', 'projects', 'financial', 'reports', 'weather', 'roadmap'],
  '/projects': ['projects', 'clients', 'roadmap'],
  '/projects/:id': ['projectDetail', 'projects', 'architect', 'budget', 'financial'],
  '/projects/:id/calendar': ['projectDetail', 'projectCalendar', 'projectPhases'],
  '/projects/:id/documents': ['documents', 'projectDetail', 'projects', 'architect'],
  '/projects/:id/materials': ['materials', 'projects'],
  '/projects/:id/budgets/:budgetId': ['budgets', 'materials', 'projects'],
  '/projects/:projectId/budgets/:budgetId': ['budgets', 'materials', 'projects'],
  '/projects/:id/budgets': ['budgets', 'materials', 'projects'],
  '/schedule/:id': ['schedule'],
  '/gantt/:id': ['schedule'],
  '/overall-status': ['overallStatus', 'dashboard', 'projects'],
  '/projects-timeline': ['projectsTimeline', 'timeline', 'roadmap'],
  '/task-management': ['taskManagement', 'roadmap'],
  '/projects/new': ['projects', 'clients'],
  '/financial': ['financial', 'roadmap'],
  '/financial/payments': ['financial', 'navigation'],
  '/financial-ledger': ['financial'],
  '/budget-control': ['budget', 'financial', 'roadmap'],
  '/budget-templates': ['templates', 'navigation'],
  '/budget-templates/:id': ['templates', 'navigation', 'materials'],
  '/budget-templates/:id/edit': ['templates', 'navigation', 'materials'],
  '/project-wbs-templates': ['projectWbsTemplates', 'projects', 'navigation'],
  '/project-wbs-templates/new': ['projectWbsTemplates', 'projects', 'navigation'],
  '/project-wbs-templates/:id': ['projectWbsTemplates', 'projects', 'navigation'],
  '/financial/new': ['financial'],
  '/procurement': ['procurement', 'suppliers'],
  '/procurement/new': ['procurement', 'purchaseRequest'],
  '/purchase-orders': ['procurement'],
  '/purchase-orders/:id': ['procurement'],
  '/payments': ['payments', 'procurement', 'financial'],
  '/payments/:paymentId': ['payments', 'procurement', 'financial'],
  '/payments/:paymentId/process': ['payments', 'procurement', 'financial'],
  '/supervisor/hub': ['supervisor'],
  '/supervisor/deliveries': ['supervisor', 'procurement'],
  '/supervisor/activity-log': ['supervisor'],
  '/supervisor/issues': ['supervisor'],
  '/supervisor/time-logs': ['supervisor'],
  '/supervisor/inspections': ['supervisor'],
  '/supervisor/deliveries/:poId/verify': ['supervisor', 'procurement', 'settings'],
  '/supervisor/deliveries/:poId/photos': ['supervisor', 'procurement', 'settings'],
  '/supervisor/deliveries/:poId/signature': ['supervisor', 'procurement', 'settings'],
  '/supervisor/deliveries/:poId/success': ['supervisor', 'procurement', 'settings'],
  '/approvals': ['procurement'],
  '/clientes': ['clients'],
  '/clientes/new': ['clients', 'cliente'],
  '/clientes/:id': ['clients', 'cliente'],
     '/portal': ['clientPortal', 'clients', 'financial'],
     '/portal/:id': ['clientPortal', 'clients', 'financial', 'projectDetail', 'budget'],
     '/portal/:id/inss-planning': ['clientPortal'],
     '/portal/:id/inss-strategy': ['clientPortal'],
     '/portal/:id/tasks': ['clientPortal'],
     '/portal/:id/definitions': ['clientPortal'],
     '/portal/:id/meetings': ['clientPortal'],
     '/portal/:id/communication': ['clientPortal'],
     '/portal/:id/chat': ['clientPortal'],
     '/portal/:id/payments': ['clientPortal'],
     '/portal/:id/financial': ['clientPortal', 'financial'],
     '/portal/:id/photos': ['clientPortal', 'projectDetail'],
     '/portal/:id/report': ['clientReport', 'clients'],
  '/client-access': ['clientAccess', 'clients', 'admin'],
  '/client-access/analytics': ['clientAccess', 'analytics', 'clients'],
  '/client-access/audit-log': ['clientAccess', 'admin', 'clients'],
  '/reports': ['reports'],
  '/settings': ['settings'],
  '/campaigns': ['campaigns'],
  '/campaigns/:campaignId': ['campaigns'],
  '/materials-templates': ['materials', 'navigation'],
  '/labor-templates': ['materials', 'navigation'],
  '/materials-labor': ['materials'],
  '/materials': ['materials'],
  '/contractors': ['contacts'],  // Redirects to contacts
  '/contacts': ['contacts'],
  '/admin/telemetry': ['admin'],
  '/admin/maintenance': ['admin', 'maintenance'],
  '/admin/db': ['admin'],
  '/admin/roles': ['admin'],
  '/admin/audit-logs': ['admin'],
  '/ai-insights': ['aiInsights'],
  '/weather': ['weather'],
  '/roadmap': ['roadmap', 'projects'],
  '/roadmap/ai-to-work': ['roadmap', 'common'],
  '/roadmap/analytics': ['analytics', 'projects', 'roadmap'],
  '/analytics': ['analytics'],
  '/construction-activities': ['constructionActivities', 'projects'],
  '/construction-activities/:id': ['constructionActivities', 'projects', 'navigation'],
  '/construction-activities/:id/edit': ['constructionActivities', 'projects', 'navigation'],
  '/project-phases': ['projectPhases', 'projects', 'schedule'],
  '/phase-templates': ['phaseTemplates', 'projectPhases', 'projects'],
  '/phase-templates/:id': ['phaseTemplates', 'projectPhases', 'projects', 'navigation'],
  '/phase-templates/:id/edit': ['phaseTemplates', 'projectPhases', 'projects', 'navigation'],
  '/notifications': ['notifications'],
  '/documentation': ['documentation'],
  '/releases-report': ['reports'],
  '/rls-test': ['admin'],
  '/status': ['admin'],
  '/approve/:token': ['procurement'],
  '/po/acknowledge/:token': ['procurement'],
  '/estimates': ['estimates'],
  '/estimates/new': ['estimates'],
  '/estimates/:id': ['estimates'],
  '/estimates/:estimateId/proposal': ['estimates', 'proposals'],
  '/proposal/:id/preview': ['proposals'],
  '/proposals': ['architect', 'proposals'],
  '/architect': ['architect'],
  '/architect/my-dashboard': ['architect'],
  '/architect/sales-pipeline': ['architect'],
  '/architect/projects': ['architect', 'projects', 'common'],
  '/architect/projects/:id': ['architect'],
  '/architect/projects/:id/moodboard': ['architect'],
  '/architect/tasks': ['architect', 'admin'],
  '/architect/meetings': ['architect'],
  '/architect/reports': ['architect'],
  '/architect/clients': ['architect'],
  '/architect/portfolio': ['architect'],
  // Content Hub routes
  '/news': ['contentHub'],
  '/articles': ['contentHub'],
  '/documents': ['contentHub'],
  '/faq': ['contentHub'],
  '/content/:slug': ['contentHub'],
  '/admin/content-hub': ['contentHub', 'admin'],
  '/admin/content-hub/list': ['contentHub', 'admin'],
  '/admin/content-hub/create': ['contentHub', 'admin'],
  '/admin/content-hub/:id/edit': ['contentHub', 'admin'],
  '/admin/content-hub/approvals': ['contentHub', 'admin'],
  // Logistics routes
  '/mobile/logistics': ['logistics'],
  '/mobile/logistics/deliveries': ['logistics'],
  '/mobile/logistics/scanner': ['logistics'],
  '/mobile/logistics/inventory': ['logistics'],
};
