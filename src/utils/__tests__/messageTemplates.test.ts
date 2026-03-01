import { describe, expect, it } from 'vitest';
import { generateEmailTemplate, generateWhatsAppTemplateWithLabels } from '@/utils/messageTemplates';
import { format } from 'date-fns';

describe('messageTemplates', () => {
  const baseData = {
    requestNumber: 'QR-123',
    projectName: 'Test Project',
    clientName: 'ACME Ltd',
    location: 'Test City',
    requestedBy: 'Alice',
    priority: 'High',
    items: [
      { description: 'Item A', quantity: 2, unit: 'pcs', supplier: 'Supplier 1' },
    ],
    deadline: new Date('2025-11-12T10:00:00Z'),
    trackingCode: 'TRACK-1'
  } as any;

  it('includes localized labels in email template and dark-mode CSS', () => {
    const labels = {
      project: 'Projeto',
      client: 'Cliente',
      location: 'Local',
      requestedBy: 'Solicitado Por',
      priority: 'Prioridade',
      requiredItems: 'Itens Requeridos',
      description: 'Descrição',
      quantity: 'Quantidade',
      unit: 'Unidade',
      preferredSupplier: 'Fornecedor Preferido',
      responseDeadline: 'Prazo de Resposta',
      trackingCode: 'Código de Rastreamento',
      howToRespond: 'Como Responder',
    };

    const html = generateEmailTemplate(baseData, labels);

    // localized labels present
    expect(html).toContain('Projeto');
    expect(html).toContain('Cliente');
    expect(html).toContain('Prazo de Resposta');

    // dark-mode CSS block present
    expect(html).toMatch(/@media \(prefers-color-scheme: dark\)/);
    expect(html).toContain('background-color: rgba(255,255,255,0.03)');
  });

  it('includes localized labels in whatsapp template', () => {
    const labels = {
      project: 'Projecto',
      requestedBy: 'Requested By',
      priority: 'Priority',
      requiredItems: 'Required Items',
      trackingCode: 'Tracking Code',
    };

    const text = generateWhatsAppTemplateWithLabels(baseData, labels as any);

    expect(text).toContain('*Quote Request QR-123*');
    expect(text).toContain(labels.project);
    expect(text).toContain(labels.trackingCode);
    expect(text).toContain(format(baseData.deadline, 'PPP'));
  });

  it('email template contains formatted instruction HTML with bold tracking code', () => {
    const labels = {
      project: 'Projeto',
      client: 'Cliente',
      location: 'Local',
      requestedBy: 'Solicitado Por',
      priority: 'Prioridade',
      requiredItems: 'Itens Requeridos',
      responseDeadline: 'Prazo de Resposta',
      trackingCode: 'Código de Rastreamento',
      quoteRequestInstructions: 'Por favor, forneça uma cotação detalhada incluindo:\n- Preço unitário para cada item\n- Preço total por item\n- Prazo de entrega\n- Condições de pagamento\n- Período de validade da cotação\n\nVocê pode responder por email ou WhatsApp usando o código de rastreio: {trackingCode}',
    } as any;

    const html = generateEmailTemplate(baseData, labels);

    // Should render list items
    expect(html).toContain('<ul');
    expect(html).toContain('<li>Preço unitário para cada item</li>');

    // Tracking code must be bold
    expect(html).toContain('<strong>TRACK-1</strong>');
  });

  it('whatsapp template includes localized instruction and bold tracking code', () => {
    const labels = {
      quoteRequestInstructions: 'Por favor, forneça uma cotação detalhada incluindo:\n- Preço unitário para cada item\n\nUse o código: {trackingCode}',
    } as any;

    const wp = generateWhatsAppTemplateWithLabels(baseData, labels);
    expect(wp).toContain('Por favor, forneça uma cotação detalhada');
    expect(wp).toContain('**TRACK-1**');
  });
});
