import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { authenticateRequest, createServiceRoleClient, verifyProjectAdminAccess } from "../_shared/authorization.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const sendQuoteRequestSchema = z.object({
  purchase_request_id: z.string().uuid(),
  supplier_ids: z.array(z.string().uuid()).min(1),
  response_deadline: z.string().datetime(),
});

interface QuoteRequestResult {
  supplier_id: string;
  supplier_name: string;
  quote_request_id?: string;
  status: 'success' | 'failed';
  error?: string;
  sent_via?: 'email' | 'whatsapp' | 'both';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData = await req.json();
    const validated = sendQuoteRequestSchema.parse(requestData);
    const { purchase_request_id, supplier_ids, response_deadline } = validated;

    const { user } = await authenticateRequest(req);
    const supabaseClient = createServiceRoleClient();

    // Verify user has access to the purchase request's project
    const { data: purchaseRequest, error: prError } = await supabaseClient
      .from('project_purchase_requests')
      .select(`
        *,
        projects!inner(id, name, client_name, location),
        purchase_request_items(*)
      `)
      .eq('id', purchase_request_id)
      .single();

    if (prError || !purchaseRequest) {
      throw new Error('Purchase request not found');
    }

    await verifyProjectAdminAccess(user.id, purchaseRequest.project_id, supabaseClient);

    // Fetch suppliers
    const { data: suppliers, error: suppliersError } = await supabaseClient
      .from('suppliers')
      .select('*')
      .in('id', supplier_ids)
      .eq('is_active', true);

    if (suppliersError || !suppliers || suppliers.length === 0) {
      throw new Error('No active suppliers found');
    }

    const results: QuoteRequestResult[] = [];
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
    const TWILIO_WHATSAPP_FROM = Deno.env.get('TWILIO_WHATSAPP_FROM');
    const BASE_URL = Deno.env.get('SUPABASE_URL')?.replace('/rest/v1', '') || '';

    // Process each supplier
    for (const supplier of suppliers) {
      try {
        // Create quote request record
        const { data: quoteRequest, error: qrError } = await supabaseClient
          .from('quote_requests')
          .insert({
            purchase_request_id,
            supplier_id: supplier.id,
            response_deadline,
            status: 'draft',
            metadata: {
              sent_attempts: 0,
              last_attempt_at: null,
            },
          })
          .select()
          .single();

        if (qrError || !quoteRequest) {
          results.push({
            supplier_id: supplier.id,
            supplier_name: supplier.name,
            status: 'failed',
            error: `Failed to create quote request: ${qrError?.message}`,
          });
          continue;
        }

        // Determine send method based on supplier preference
        const sendMethod = supplier.preferred_contact_method || 'email';
        const sendVia = sendMethod === 'both' ? 'both' : sendMethod;

        // Generate tracking code
        const trackingCode = quoteRequest.request_number;

        // Fetch purchase request items
        const { data: items } = await supabaseClient
          .from('purchase_request_items')
          .select('*')
          .eq('request_id', purchase_request_id);

        // Get project details
        const projectName = (purchaseRequest.projects as any)?.name || 'Unknown Project';
        const clientName = (purchaseRequest.projects as any)?.client_name || 'N/A';
        const location = (purchaseRequest.projects as any)?.location || 'N/A';

        // Generate message content
        const messageContent = generateQuoteRequestMessage(
          quoteRequest.request_number,
          {
            ...purchaseRequest,
            project_name: projectName,
            client_name: clientName,
            location: location,
          },
          items || [],
          new Date(response_deadline),
          trackingCode,
          BASE_URL
        );

        let emailSent = false;
        let whatsappSent = false;

        // Send via email if applicable
        if (sendVia === 'email' || sendVia === 'both') {
          if (supplier.email && RESEND_API_KEY) {
            try {
              const emailResponse = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${RESEND_API_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  from: 'Construction Management <onboarding@resend.dev>',
                  to: [supplier.email],
                  subject: `Quote Request ${trackingCode} - ${projectName}`,
                  html: messageContent.emailHtml,
                }),
              });

              if (emailResponse.ok) {
                emailSent = true;
              }
            } catch (err) {
              console.error(`Email send error for supplier ${supplier.id}:`, err);
            }
          }
        }

        // Send via WhatsApp if applicable
        if (sendVia === 'whatsapp' || sendVia === 'both') {
          if (supplier.whatsapp_number && TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_WHATSAPP_FROM) {
            try {
              const formattedPhone = supplier.whatsapp_number.startsWith('+') 
                ? supplier.whatsapp_number 
                : `+${supplier.whatsapp_number}`;

              const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
              const body = new URLSearchParams({
                From: `whatsapp:${TWILIO_WHATSAPP_FROM}`,
                To: `whatsapp:${formattedPhone}`,
                Body: messageContent.whatsappText,
              });

              const twilioResponse = await fetch(twilioUrl, {
                method: 'POST',
                headers: {
                  'Authorization': `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
                  'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: body.toString(),
              });

              if (twilioResponse.ok) {
                whatsappSent = true;
              }
            } catch (err) {
              console.error(`WhatsApp send error for supplier ${supplier.id}:`, err);
            }
          }
        }

        // Update quote request with send status
        if (emailSent || whatsappSent) {
          const finalSentVia = emailSent && whatsappSent ? 'both' : 
                              emailSent ? 'email' : 'whatsapp';

          await supabaseClient
            .from('quote_requests')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              sent_via: finalSentVia,
              metadata: {
                sent_attempts: 1,
                last_attempt_at: new Date().toISOString(),
                email_sent: emailSent,
                whatsapp_sent: whatsappSent,
              },
            })
            .eq('id', quoteRequest.id);

          // Log to activity_logs
          await supabaseClient
            .from('activity_logs')
            .insert({
              project_id: purchaseRequest.project_id,
              activity_type: 'quote_request_sent',
              title: `Quote request sent to ${supplier.name}`,
              description: `Quote request ${trackingCode} sent via ${finalSentVia}`,
            });

          results.push({
            supplier_id: supplier.id,
            supplier_name: supplier.name,
            quote_request_id: quoteRequest.id,
            status: 'success',
            sent_via: finalSentVia,
          });
        } else {
          results.push({
            supplier_id: supplier.id,
            supplier_name: supplier.name,
            quote_request_id: quoteRequest.id,
            status: 'failed',
            error: 'No valid contact method or API credentials missing',
          });
        }
      } catch (error) {
        results.push({
          supplier_id: supplier.id,
          supplier_name: supplier.name,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending quote requests:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function generateQuoteRequestMessage(
  requestNumber: string,
  purchaseRequest: any,
  items: any[],
  deadline: Date,
  trackingCode: string,
   _baseUrl: string
) {
  const itemsTable = items.map((item, idx) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${idx + 1}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.description || 'N/A'}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${item.quantity || 0}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.unit || 'pcs'}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.supplier || 'N/A'}</td>
    </tr>
  `).join('');

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9fafb; }
        .table { width: 100%; border-collapse: collapse; margin: 20px 0; background-color: white; }
        .table th { background-color: #2563eb; color: white; padding: 12px; text-align: left; }
        .deadline { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
        .tracking { background-color: #dbeafe; padding: 10px; border-radius: 4px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Quote Request</h1>
          <p>Request Number: ${requestNumber}</p>
        </div>
        <div class="content">
          <h2>Project Information</h2>
          <p><strong>Project:</strong> ${purchaseRequest.project_name}</p>
          <p><strong>Client:</strong> ${purchaseRequest.client_name || 'N/A'}</p>
          <p><strong>Location:</strong> ${purchaseRequest.location || 'N/A'}</p>
          <p><strong>Requested By:</strong> ${purchaseRequest.requested_by}</p>
          <p><strong>Priority:</strong> ${purchaseRequest.priority || 'Medium'}</p>

          <h2>Required Items</h2>
          <table class="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Description</th>
                <th>Quantity</th>
                <th>Unit</th>
                <th>Supplier</th>
              </tr>
            </thead>
            <tbody>
              ${itemsTable}
            </tbody>
          </table>

          <div class="deadline">
            <strong>⚠️ Response Deadline:</strong> ${deadline.toLocaleDateString()} ${deadline.toLocaleTimeString()}
          </div>

          <div class="tracking">
            <strong>Tracking Code:</strong> ${trackingCode}
            <br>
            <small>Please include this code in your response</small>
          </div>

          <h2>How to Respond</h2>
          <p>Please provide a detailed quote including:</p>
          <ul>
            <li>Unit price for each item</li>
            <li>Total price per item</li>
            <li>Delivery timeframe</li>
            <li>Payment terms</li>
            <li>Quote validity period</li>
          </ul>
          <p>You can respond via email or WhatsApp using the tracking code: <strong>${trackingCode}</strong></p>
        </div>
        <div class="footer">
          <p>This is an automated message from Construction Management System</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const whatsappText = `
📋 *Quote Request ${requestNumber}*

🏗️ *Project:* ${purchaseRequest.project_name}
👤 *Requested By:* ${purchaseRequest.requested_by}
⚡ *Priority:* ${purchaseRequest.priority || 'Medium'}

📦 *Required Items:*
${items.map((item, idx) => 
  `${idx + 1}. ${item.description || 'N/A'} - Qty: ${item.quantity || 0} ${item.unit || 'pcs'}${item.supplier ? `\n   Supplier: ${item.supplier}` : ''}`
).join('\n')}

⏰ *Response Deadline:* ${deadline.toLocaleDateString()} ${deadline.toLocaleTimeString()}

🔖 *Tracking Code:* ${trackingCode}
Please include this code in your response.

📧 Respond via email or WhatsApp with:
• Unit prices
• Total prices
• Delivery timeframe
• Payment terms
• Quote validity

Thank you for your prompt response!
  `.trim();

  return { emailHtml, whatsappText };
}

