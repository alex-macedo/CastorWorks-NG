import { format } from 'date-fns';
import * as DOMPurifyModule from 'dompurify';
const DOMPurify = (DOMPurifyModule as any).default || DOMPurifyModule;

export interface MessageTemplateData {
  requestNumber?: string;
  projectName?: string;
  clientName?: string;
  location?: string;
  requestedBy?: string;
  priority?: string;
  items?: Array<{
    description?: string;
    quantity?: number;
    unit?: string;
    supplier?: string;
  }>;
  deadline: Date;
  trackingCode?: string;
}

export interface MessageTemplateLabels {
  project?: string;
  client?: string;
  location?: string;
  requestedBy?: string;
  priority?: string;
  requiredItems?: string;
  description?: string;
  quantity?: string;
  unit?: string;
  preferredSupplier?: string;
  responseDeadline?: string;
  trackingCode?: string;
  howToRespond?: string;
  quoteRequestTitle?: string;
  quoteRequestInstructions?: string;
  footer?: string;
}

export function generateEmailTemplate(data: MessageTemplateData, labels?: MessageTemplateLabels): string {
  const {
    requestNumber = 'TBD',
    projectName = 'Project',
    clientName = '',
    location = '',
    requestedBy = '',
    priority = 'Medium',
    items = [],
    deadline,
    trackingCode = 'TBD'
  } = data;

  const l = {
    project: 'Project',
    client: 'Client',
    location: 'Location',
    requestedBy: 'Requested By',
    priority: 'Priority',
    requiredItems: 'Required Items',
    description: 'Description',
    quantity: 'Quantity',
    unit: 'Unit',
    preferredSupplier: 'Preferred Supplier',
    responseDeadline: 'Response Deadline',
    trackingCode: 'Tracking Code',
    howToRespond: 'How to Respond',
    quoteRequestTitle: 'Quote Request',
    quoteRequestInstructions: 'Please provide a detailed quote including:\n- Unit price for each item\n- Total price per item\n- Delivery timeframe\n- Payment terms\n- Quote validity period\n\nYou can respond via email or WhatsApp using the tracking code: {{trackingCode}}',
    footer: 'This is an automated message from Construction Management System',
    ...labels,
  };

  // Sanitize user-provided data to prevent XSS attacks
  const sanitize = (value: string | undefined | null, fallback: string = 'N/A'): string => {
    const text = value || fallback;
    return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
  };

  const itemsTable = items.map((item, idx) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${idx + 1}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${sanitize(item.description)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${item.quantity || 0}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${sanitize(item.unit, 'pcs')}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${sanitize(item.supplier)}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Quote Request ${requestNumber}</title>
      <style>
        /* Dark mode overrides for previews (use !important to override inline styles) */
        @media (prefers-color-scheme: dark) {
          body {
            background: transparent !important;
            color: #e5e7eb !important;
            -webkit-font-smoothing: antialiased;
          }
          h1 { color: #60a5fa !important; }
          h2 { color: #9ca3af !important; border-bottom-color: rgba(255,255,255,0.06) !important; }
          /* Neutralize common light backgrounds used inline in the template */
          div[style*="#f8f9fa"] { background-color: rgba(255,255,255,0.03) !important; }
          thead tr[style*="#f3f4f6"] { background-color: rgba(255,255,255,0.02) !important; }
          td, th { border-color: rgba(255,255,255,0.06) !important; }
          div[style*="#fef3c7"] { background-color: rgba(245,158,11,0.06) !important; color: #f59e0b !important; }
          div[style*="#e0f2fe"] { background-color: rgba(14,165,233,0.04) !important; color: #7dd3fc !important; }
          div[style*="border-top: 1px solid #e5e7eb"] { border-top-color: rgba(255,255,255,0.06) !important; }
          /* Make links and emphasis readable */
          a { color: #93c5fd !important; }
          strong { color: #f3f4f6 !important; }
        }
      </style>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
  <h1 style="color: #2563eb; margin-bottom: 10px; font-size: 20px;">📋 ${l.quoteRequestTitle} ${requestNumber}</h1>
        <p style="margin: 5px 0;"><strong>🏗️ ${l.project}:</strong> ${sanitize(projectName, 'Project')}</p>
        ${clientName ? `<p style="margin: 5px 0;"><strong>👤 ${l.client}:</strong> ${sanitize(clientName)}</p>` : ''}
        ${location ? `<p style="margin: 5px 0;"><strong>📍 ${l.location}:</strong> ${sanitize(location)}</p>` : ''}
        ${requestedBy ? `<p style="margin: 5px 0;"><strong>📋 ${l.requestedBy}:</strong> ${sanitize(requestedBy)}</p>` : ''}
        <p style="margin: 5px 0;"><strong>⚡ ${l.priority}:</strong> ${sanitize(priority, 'Medium')}</p>
      </div>

      <div style="margin-bottom: 20px;">
        <h2 style="color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">📦 ${l.requiredItems}</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="padding: 12px 8px; text-align: left; border-bottom: 2px solid #d1d5db;">#</th>
              <th style="padding: 12px 8px; text-align: left; border-bottom: 2px solid #d1d5db;">${l.description}</th>
              <th style="padding: 12px 8px; text-align: right; border-bottom: 2px solid #d1d5db;">${l.quantity}</th>
              <th style="padding: 12px 8px; text-align: left; border-bottom: 2px solid #d1d5db;">${l.unit}</th>
              <th style="padding: 12px 8px; text-align: left; border-bottom: 2px solid #d1d5db;">${l.preferredSupplier}</th>
            </tr>
          </thead>
          <tbody>
            ${itemsTable}
          </tbody>
        </table>
      </div>

      <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
        <div style="color: #92400e; font-weight: bold; font-size: 16px;">
          ⚠️ ${l.responseDeadline}: ${format(deadline, 'PPP')} at ${format(deadline, 'p')}
        </div>
      </div>

      <div style="background-color: #e0f2fe; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
        <strong>🔖 ${l.trackingCode}:</strong> <strong>${trackingCode}</strong>
      </div>

  <h2 style="color: #374151;">📋 ${l.howToRespond || 'How to Respond'}</h2>
      <div style="margin-left: 0; margin-top: 8px; margin-bottom: 8px;">
        ${(() => {
          const raw = (l.quoteRequestInstructions || 'Please provide a detailed quote including:\n- Unit price for each item\n- Total price per item\n- Delivery timeframe\n- Payment terms\n- Quote validity period\n\nYou can respond via email or WhatsApp using the tracking code: {{trackingCode}}').replace('{{trackingCode}}', `<strong>${trackingCode}</strong>`);
          const parts = raw.split('\n');
          let html = '';
          let inList = false;
          for (const line of parts) {
            const trimmed = line.trim();
            if (!trimmed) {
              if (inList) { html += '</ul>'; inList = false; }
              continue;
            }
            if (trimmed.startsWith('- ')) {
              if (!inList) { html += '<ul style="margin-left: 20px;">'; inList = true; }
              html += `<li>${trimmed.substring(2)}</li>`;
            } else {
              if (inList) { html += '</ul>'; inList = false; }
              html += `<p style="margin: 6px 0;">${trimmed}</p>`;
            }
          }
          if (inList) html += '</ul>';
          return html;
        })()}
      </div>

      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
        <p>This is an automated message from Construction Management System</p>
      </div>
    </body>
    </html>
  `;
}

export function generateWhatsAppTemplate(data: MessageTemplateData): string {
  const {
    requestNumber = 'TBD',
    projectName = 'Project',
    requestedBy = '',
    priority = 'Medium',
    items = [],
    deadline,
    trackingCode = 'TBD'
  } = data;

  const itemsList = items.map((item, idx) => 
    `${idx + 1}. ${item.description || 'N/A'} - Qty: ${item.quantity || 0} ${item.unit || 'pcs'}${item.supplier ? `\n   Supplier: ${item.supplier}` : ''}`
  ).join('\n');

  return `
📋 *Quote Request ${requestNumber}*

🏗️ *Project:* ${projectName}
${requestedBy ? `👤 *Requested By:* ${requestedBy}\n` : ''}⚡ *Priority:* ${priority}

📦 *Required Items:*
${itemsList}

⏰ *Response Deadline:* ${format(deadline, 'PPP')} ${format(deadline, 'p')}

🔖 *Tracking Code:* **${trackingCode}**
Please include this code in your response.
${'📧 Respond via email or WhatsApp with:\n• Unit prices\n• Total prices\n• Delivery timeframe\n• Payment terms\n• Quote validity\n\nThank you for your prompt response!'.replace(/\n/g, '\n')}
  `.trim();
}

export function generateWhatsAppTemplateWithLabels(data: MessageTemplateData, labels?: MessageTemplateLabels): string {
  const l = {
    project: 'Project',
    requestedBy: 'Requested By',
    priority: 'Priority',
    requiredItems: 'Required Items',
    trackingCode: 'Tracking Code',
    quoteRequestInstructions: 'Please provide a detailed quote including:\n- Unit price for each item\n- Total price per item\n- Delivery timeframe\n- Payment terms\n- Quote validity period\n\nYou can respond via email or WhatsApp using the tracking code: {{trackingCode}}',
    ...labels,
  };

  const {
    requestNumber = 'TBD',
    projectName = 'Project',
    requestedBy = '',
    priority = 'Medium',
    items = [],
    deadline,
    trackingCode = 'TBD'
  } = data;

  const itemsList = items.map((item, idx) => 
    `${idx + 1}. ${item.description || 'N/A'} - Qty: ${item.quantity || 0} ${item.unit || 'pcs'}${item.supplier ? `\n   Supplier: ${item.supplier}` : ''}`
  ).join('\n');

  return `
📋 *${l.quoteRequestTitle || 'Quote Request'} ${requestNumber}*

🏗️ *${l.project}:* ${projectName}
${requestedBy ? `👤 *${l.requestedBy}:* ${requestedBy}\n` : ''}⚡ *${l.priority}:* ${priority}

📦 *${l.requiredItems}:*
${itemsList}

⏰ *${l.responseDeadline || 'Response Deadline'}:* ${format(deadline, 'PPP')} ${format(deadline, 'p')}

🔖 *${l.trackingCode}:* **${trackingCode}**
Please include this code in your response.
${(l.quoteRequestInstructions || 'Please provide a detailed quote including:\n- Unit price for each item\n- Total price per item\n- Delivery timeframe\n- Payment terms\n- Quote validity period\n\nYou can respond via email or WhatsApp using the tracking code: {{trackingCode}}').replace('{{trackingCode}}', `**${trackingCode}**`)}
  `.trim();
}