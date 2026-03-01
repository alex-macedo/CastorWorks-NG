import { ProfessionalPDF } from '@/utils/pdfGenerator';
import { formatCurrency, formatPercentage, getCategoryLabel, getConstructionTypeLabel, getDestinationLabel, getStateName } from './inssCalculator';
import type { TaxProject, INSSCalculatorResult } from '../types/tax.types';
import { supabase } from '@/integrations/supabase/client';
import { formatCPF } from '@/utils/formatters';

export async function generateINSSReport(
  projectName: string,
  taxProject: TaxProject,
  calculation: INSSCalculatorResult,
  t: any,
  projectId?: string,
  constructionMonths?: number,
  returnBlob?: boolean
): Promise<Blob | void> {
  const pdf = new ProfessionalPDF('portrait');
  
  // Fetch company settings for the header
  const { data: companySettings } = await supabase
    .from('company_settings')
    .select('*')
    .limit(1)
    .maybeSingle();

  // Use provided constructionMonths or calculate from project data
  let finalConstructionMonths = constructionMonths || 1;
  
  // Fetch project data including client information
  let clientName = '';
  let clientCPF = '';
  let projectLocation = '';
  let budgetDate = new Date().toLocaleDateString('pt-BR');

  if (projectId) {
    // Try to fetch from projects table (fields may not all exist)
    const { data: projectData } = await supabase
      .from('projects')
      .select('client_name, client_cpf, construction_address, city, state, total_duration, start_date, end_date, budget_date, client_id, clients(name, cpf)')
      .eq('id', projectId)
      .maybeSingle();

    if (projectData) {
      // Get client name - prefer from projects.client_name, fallback to clients.name
      clientName = projectData.client_name || (projectData.clients as any)?.name || '';
      
      // Get client CPF - prefer from projects.client_cpf, fallback to clients.cpf
      const cpfValue = projectData.client_cpf || (projectData.clients as any)?.cpf || '';
      clientCPF = cpfValue ? formatCPF(cpfValue) : '';
      
      // Build project location from available fields
      const locationParts = [
        projectData.construction_address,
        projectData.city,
        projectData.state
      ].filter(Boolean);
      projectLocation = locationParts.length > 0 ? locationParts.join(' - ') : '';

      // Calculate construction months if not provided
      if (!constructionMonths) {
        if (projectData.total_duration && projectData.total_duration > 0) {
          finalConstructionMonths = Math.max(1, Math.ceil(projectData.total_duration / 30));
        } else if (projectData.start_date && projectData.end_date) {
          const start = new Date(projectData.start_date);
          const end = new Date(projectData.end_date);
          const diffTime = Math.abs(end.getTime() - start.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          finalConstructionMonths = Math.max(1, Math.ceil(diffDays / 30));
        }
      } else {
        finalConstructionMonths = constructionMonths;
      }

      if (projectData.budget_date) {
        budgetDate = new Date(projectData.budget_date).toLocaleDateString('pt-BR');
      }
    }
  }

  // Fallback to tax_project data for location if not found in projects
  if (!projectLocation && taxProject.municipality) {
    projectLocation = `${taxProject.municipality} - ${getStateName(taxProject.state_code as any)}`;
  }

  // Fallback to tax_project owner_document for CPF if available
  if (!clientCPF && taxProject.owner_document) {
    clientCPF = formatCPF(taxProject.owner_document);
  }

  // Calculate service fee (honorários) - typically 15-20% of savings, minimum R$ 3,000
  const serviceFeePercentage = 0.15; // 15% of savings
  const minServiceFee = 3000;
  const calculatedServiceFee = Math.max(
    minServiceFee,
    calculation.plannedScenario.totalSavings * serviceFeePercentage
  );
  const monthlyServiceFee = calculatedServiceFee / finalConstructionMonths;

  // Calculate effective savings (savings minus service fee)
  const effectiveSavings = calculation.plannedScenario.totalSavings - calculatedServiceFee;

  // Document Title with logo (professional format)
  const proposalTitle = t('clientPortal.inssPlanning.proposal.title', { defaultValue: 'Proposta de Assessoria para redução de INSS de Obras' });
  await pdf.addHeader(
    companySettings as any,
    proposalTitle,
    'MMM DD, YYYY',
    undefined,
    true // Show logo for professional appearance
  );

  // Client Information (clean format, matching original PDF)
  // Note: Removed divider after header per user request
  if (clientName) {
    pdf.addKeyValue(
      t('clientPortal.inssPlanning.proposal.owner', { defaultValue: 'Proprietário (a)' }),
      clientName,
      13
    );
  }
  if (clientCPF) {
    pdf.addKeyValue('CPF/CNPJ:', clientCPF, 13);
  }

  // Project Details (clean format, matching original PDF)
  pdf.addKeyValue(
    t('clientPortal.inssPlanning.proposal.area', { defaultValue: 'Metragem' }),
    `${taxProject.area_total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²`,
    13
  );
  
  if (projectLocation) {
    pdf.addKeyValue(
      t('clientPortal.inssPlanning.proposal.location', { defaultValue: 'Local' }),
      projectLocation,
      13
    );
  } else {
    pdf.addKeyValue(
      t('clientPortal.inssPlanning.proposal.location', { defaultValue: 'Local' }),
      `${taxProject.municipality || ''} - ${getStateName(taxProject.state_code as any)}`,
      13
    );
  }

  pdf.addKeyValue(
    t('clientPortal.inssPlanning.proposal.budgetMonth', { defaultValue: 'Mês de orçamento' }),
    budgetDate,
    13
  );

  // Financial Summary (Bullet Points Format - professional styling)
  pdf.addParagraph(
    `• ${t('clientPortal.inssPlanning.proposal.inssWithoutPlanning', { defaultValue: 'Valor de INSS sem planejamento' })}: ${formatCurrency(calculation.inssWithoutStrategy)}`,
    13
  );
  
  pdf.addParagraph(
    `• ${t('clientPortal.inssPlanning.proposal.inssWithPlanning', { defaultValue: 'Valor de INSS com planejamento' })}: ${formatCurrency(calculation.plannedScenario.totalINSS)} ${t('clientPortal.inssPlanning.proposal.parceled', { defaultValue: '(parcelado no período da obra)' })}`,
    13
  );
  
  pdf.addParagraph(
    `• ${t('clientPortal.inssPlanning.proposal.period', { defaultValue: 'Período' })}: ${finalConstructionMonths} ${t('clientPortal.inssPlanning.proposal.months', { defaultValue: 'meses' })} (${formatCurrency(calculation.plannedScenario.monthlyPayment)} ${t('clientPortal.inssPlanning.proposal.paidToRevenue', { defaultValue: 'pago à receita por mês' })})`,
    13
  );
  
  pdf.addParagraph(
    `• ${t('clientPortal.inssPlanning.proposal.serviceFee', { defaultValue: 'Honorários' })}: ${formatCurrency(calculatedServiceFee)} ${t('clientPortal.inssPlanning.proposal.parceled', { defaultValue: '(parcelado no período da obra)' })} ${t('clientPortal.inssPlanning.proposal.or', { defaultValue: 'ou seja' })}, ${formatCurrency(monthlyServiceFee)} ${t('clientPortal.inssPlanning.proposal.perMonth', { defaultValue: 'por mês' })}.`,
    13
  );
  
  pdf.addParagraph(
    `• ${t('clientPortal.inssPlanning.proposal.finalSavings', { defaultValue: 'Economia Final' })}: ${formatCurrency(effectiveSavings)} ${t('clientPortal.inssPlanning.proposal.effectiveSavings', { defaultValue: '(Economia efetiva com assessoria)' })}`,
    13
  );

  pdf.addDivider();

  // Legal Note (professional formatting with proper spacing)
  pdf.addParagraph(
    t('clientPortal.inssPlanning.proposal.legalNote', {
      defaultValue: 'Aplicação do benefício Fator de Ajuste, conforme a IN 10.2021/21, garantimos respaldo jurídico e responsabilidade fiscal! Se necessário adiantar ou prolongar o período de obra, os valores totais se mantem, tanto no honorário quanto no valor a contribuir de imposto, ou seja, não fica mais ou menos caro se a obra prolongar ou adiantar, ressaltamos que o INSS de obras é calculado e reajustado todos os meses, podendo haver variação mínima de correção da parcela.'
    }),
    12,
    7 // Better line spacing for readability
  );

  pdf.addDivider();

  // Contact Information (professional format matching original PDF)
  if (companySettings) {
    const contactLines: string[] = [];
    
    // Add Instagram/social media if available in footer_text or additional_info
    // Check if footer_text contains Instagram pattern
    if (companySettings.footer_text) {
      const instagramMatch = companySettings.footer_text.match(/Instagram:\s*([^\s|]+)/i);
      if (instagramMatch) {
        contactLines.push(`Instagram: ${instagramMatch[1]}`);
      }
    }
    
    if (companySettings.website) {
      contactLines.push(`site oficial: ${companySettings.website}`);
    }
    
    // Add marketing stats if available (could be in footer_text or calculated)
    // For now, we'll add placeholders that can be customized
    if (companySettings.footer_text) {
      const statsMatch = companySettings.footer_text.match(/(\+[\d.]+ clientes atendidos|\+ R\$ [\d.,]+ de economia gerada)/gi);
      if (statsMatch) {
        contactLines.push(...statsMatch);
      }
    }
    
    // If no special formatting found, use standard contact info
    if (contactLines.length === 0) {
      if (companySettings.website) {
        contactLines.push(`site oficial: ${companySettings.website}`);
      }
      if (companySettings.email) {
        contactLines.push(companySettings.email);
      }
      if (companySettings.phone) {
        contactLines.push(companySettings.phone);
      }
    }
    
    if (contactLines.length > 0) {
      contactLines.forEach(line => {
        pdf.addParagraph(line, 11);
      });
    }
  }

  pdf.addDivider();

  // Validity (professional formatting)
  pdf.addParagraph(
    t('clientPortal.inssPlanning.proposal.validity', {
      defaultValue: 'Proposta válida para 10 dias a contar da data de envio.'
    }),
    11
  );

  pdf.addDivider();

  // Signature Block (professional format matching original PDF)
  // Use footer_text for engineer name and CREA if available, otherwise use company name
  if (companySettings?.footer_text) {
    // Try to extract engineer name and CREA from footer_text
    const creaMatch = companySettings.footer_text.match(/CREA:\s*([^\s\n]+)/i);
    const engineerMatch = companySettings.footer_text.match(/(Eng\.?\s+[^\n]+)/i);
    
    if (engineerMatch) {
      pdf.addParagraph(engineerMatch[1].trim(), 12);
    } else {
      pdf.addParagraph(
        companySettings.company_name || t('clientPortal.inssPlanning.proposal.companyName', { defaultValue: 'Empresa' }),
        12
      );
    }
    
    if (creaMatch) {
      pdf.addParagraph(`CREA: ${creaMatch[1]}`, 11);
    }
  } else {
    pdf.addParagraph(
      companySettings?.company_name || t('clientPortal.inssPlanning.proposal.companyName', { defaultValue: 'Empresa' }),
      12
    );
  }

  pdf.addFooter(companySettings as any);
  
  if (returnBlob) {
    return pdf.getBlob();
  }
  
  pdf.save(`Proposta_INSS_${projectName.replace(/\s+/g, '_')}.pdf`);
}
