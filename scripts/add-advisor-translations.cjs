#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const advisorTranslations = {
  "actionItems": "Action items",
  "activeAlerts": "Active alerts",
  "alerts": "Alerts",
  "alertsAndAnomalies": "Alerts and anomalies",
  "amount": "Amount",
  "budgetHealth": "Budget health",
  "complexityComplex": "Complex",
  "complexityEasy": "Easy",
  "complexityModerate": "Moderate",
  "confidence": "Confidence",
  "consolidation": "Consolidation",
  "costAnomaly": "Cost anomaly",
  "currentAllocation": "Current allocation",
  "expectedRange": "Expected range",
  "healthExcellent": "Excellent",
  "healthFair": "Fair",
  "healthGood": "Good",
  "healthPoor": "Poor",
  "increase": "Increase",
  "noAlerts": "No alerts",
  "noDataAvailable": "No data available",
  "noPredictions": "No predictions",
  "noRecommendations": "No recommendations",
  "optimizationRecommendations": "Optimization recommendations",
  "overBudgetWarning": "Over budget warning",
  "possibleCauses": "Possible causes",
  "predictedFinal": "Predicted final",
  "predictedVariance": "Predicted variance",
  "potentialSavings": "Potential savings",
  "priorityHigh": "High",
  "priorityLow": "Low",
  "priorityMedium": "Medium",
  "projectedFinal": "Projected final",
  "projectedVariance": "Projected variance",
  "reallocation": "Reallocation",
  "recommendation": "Recommendation",
  "recommendedActions": "Recommended actions",
  "recommendedAllocation": "Recommended allocation",
  "reduction": "Reduction",
  "riskCritical": "Critical",
  "riskHigh": "High",
  "riskLevel": "Risk level",
  "riskLow": "Low",
  "riskMedium": "Medium",
  "setup": "Setup",
  "totalBudget": "Total budget",
  "totalSpent": "Total spent",
  "utilization": "Utilization",
  "variancePredictions": "Variance predictions",
  "viewDetails": "View details"
};

const languages = ['en-US', 'pt-BR', 'es-ES', 'fr-FR'];

languages.forEach(lang => {
  const filePath = path.join(__dirname, '../src/locales', lang, 'architect.json');
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  // Add advisor section to financial
  content.financial = content.financial || {};
  content.financial.advisor = advisorTranslations;
  
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n');
  console.log(`Updated ${lang}/architect.json`);
});

console.log('Done!');
