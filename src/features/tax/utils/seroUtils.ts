/**
 * CastorWorks INSS Obra Module - SERO Compliance Utilities
 * Logic for generating documentation checklists for RFB regularization
 */

import type { TaxProject, TaxDocumentType } from '../types/tax.types';

export interface SeroChecklistItem {
  id: string;
  label: string;
  description: string;
  required: boolean;
  status: 'MISSING' | 'UPLOADED' | 'VERIFIED';
  documentType?: TaxDocumentType;
}

export interface SeroChecklistResult {
  ready: boolean;
  checklist: SeroChecklistItem[];
  missing_items: string[];
  warnings: string[];
}

/**
 * Generates a documentation checklist based on project classification
 */
export function generateSeroChecklist(
  project: TaxProject,
  uploadedDocs: TaxDocumentType[]
): SeroChecklistResult {
  const checklist: SeroChecklistItem[] = [];
  const warnings: string[] = [];

  // 1. Base Documents (Always Required)
  const baseItems: Array<{ type: TaxDocumentType; label: string; desc: string }> = [
    { 
      type: 'ALVARA_CONSTRUCAO', 
      label: 'Alvará de Construção', 
      desc: 'Licença municipal para início da obra' 
    },
    { 
      type: 'PROJETO_ARQUITETONICO', 
      label: 'Projeto Arquitetônico', 
      desc: 'Planta baixa aprovada com área total' 
    },
    { 
      type: 'ART_RRT', 
      label: 'ART/RRT de Execução', 
      desc: 'Responsabilidade técnica do profissional' 
    },
  ];

  baseItems.forEach((item) => {
    checklist.push({
      id: `base-${item.type}`,
      label: item.label,
      description: item.desc,
      required: true,
      status: uploadedDocs.includes(item.type) ? 'UPLOADED' : 'MISSING',
      documentType: item.type,
    });
  });

  // 2. Specific Requirements based on Strategy
  if (project.owner_type === 'PF' && project.category === 'OBRA_NOVA') {
    checklist.push({
      id: 'strat-habite-se',
      label: 'Habite-se',
      description: 'Necessário para aplicação do Fator Social',
      required: true,
      status: uploadedDocs.includes('HABITE_SE') ? 'UPLOADED' : 'MISSING',
      documentType: 'HABITE_SE',
    });
  }

  if (project.construction_type === 'PRE_MOLDADO') {
    checklist.push({
      id: 'strat-nf-pre',
      label: 'NF de Pré-moldado',
      description: 'Comprovação de estrutura industrializada',
      required: true,
      status: uploadedDocs.includes('NF_PRE_MOLDADO') ? 'UPLOADED' : 'MISSING',
      documentType: 'NF_PRE_MOLDADO',
    });
  }

  // 3. Financial Requirements
  if (project.status === 'SERO_DONE') {
    checklist.push({
      id: 'fin-dctfweb',
      label: 'Recibo DCTFWeb',
      description: 'Transmitido após o fechamento do SERO',
      required: true,
      status: uploadedDocs.includes('DCTFWEB_RECIBO') ? 'UPLOADED' : 'MISSING',
      documentType: 'DCTFWEB_RECIBO',
    });
  }

  // Calculate readiness
  const missingRequired = checklist.filter(i => i.required && i.status === 'MISSING');
  const missing_items = missingRequired.map(i => i.label);

  // General Warnings
  if (project.area_total > 400 && project.owner_type === 'PF') {
    warnings.push("Área acima de 400m² limita a redução do Fator Social a 10%.");
  }

  return {
    ready: missingRequired.length === 0,
    checklist,
    missing_items,
    warnings,
  };
}
