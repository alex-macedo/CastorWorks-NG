/**
 * Test script for INSS Calculation Engine
 * Scenario: Compare paying at end vs Planned Monthly Payments
 */
import { calculateINSS } from './src/features/tax/utils/inssCalculator.ts';

const PROJECT_PARAMS = {
  area: 250, // 250m2
  state: 'SP' as any,
  ownerType: 'PF' as any,
  category: 'OBRA_NOVA' as any,
  constructionType: 'ALVENARIA' as any,
  destination: 'RESIDENCIAL_UNIFAMILIAR' as any,
};

const CONSTRUCTION_MONTHS = 12;

function runComparison() {
  console.log('--- INSS CALCULATION COMPARISON ---');
  console.log(`Project: ${PROJECT_PARAMS.area}m² in ${PROJECT_PARAMS.state} (${PROJECT_PARAMS.ownerType})`);
  
  // 1. Pay at the End (Standard calculation)
  const endResult = calculateINSS(PROJECT_PARAMS);
  
  console.log('\nScenario A: Standard Aferição (Pay at Finish)');
  console.log(`Total INSS Due: R$ ${endResult.inssEstimate.toLocaleString('pt-BR')}`);
  console.log(`Fator Social Applied: ${endResult.fatorSocial}`);
  console.log(`Savings vs Baseline: R$ ${endResult.savings.toLocaleString('pt-BR')} (${endResult.savingsPercentage}%)`);

  // 2. Planned Monthly Payments (Optimized Logic)
  console.log('\nScenario B: Planned Monthly Payments (GFIP Route)');
  if (endResult.plannedScenario) {
    console.log(`Estimated Monthly Payment: R$ ${endResult.plannedScenario.monthlyPayment.toLocaleString('pt-BR')}`);
    console.log(`Total Optimized INSS: R$ ${endResult.plannedScenario.totalINSS.toLocaleString('pt-BR')}`);
    console.log(`Total Savings: R$ ${endResult.plannedScenario.totalSavings.toLocaleString('pt-BR')} (${endResult.plannedScenario.savingsPercentage}%)`);
    console.log(`Note: ${endResult.plannedScenario.recommendation}`);
  }

  // 3. Installment Plan (Post-Construction Parcelamento)
  console.log('\nScenario C: Government Installment Plan (Post-Construction)');
  if (endResult.installments) {
    console.log(`Total Value: R$ ${endResult.installments.totalValue.toLocaleString('pt-BR')}`);
    console.log(`Monthly Installment (60x): R$ ${endResult.installments.monthlyValue.toLocaleString('pt-BR')}`);
    console.log(`Note: This includes the full calculated amount (Scenario A) but split over time.`);
  }

  console.log('\n--- END OF TEST ---');
}

runComparison();
