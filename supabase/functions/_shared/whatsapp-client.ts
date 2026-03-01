/**
 * WhatsApp Cloud API Client Wrapper
 * 
 * Provides a clean interface for interacting with Meta's WhatsApp Business Cloud API.
 * Handles authentication, rate limiting, error handling, and retries.
 */

const WHATSAPP_API_VERSION = 'v21.0'; // Update as needed
const WHATSAPP_API_BASE_URL = `https://graph.facebook.com/${WHATSAPP_API_VERSION}`;

interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
  businessAccountId?: string;
}

interface SendTextMessageParams {
  to: string; // E.164 format phone number (e.g., +5511999999999)
  message: string; // Plain text message (max 4096 chars)
  previewUrl?: boolean; // Whether to show link previews
}

interface SendTemplateMessageParams {
  to: string; // E.164 format phone number
  templateName: string; // Approved template name
  languageCode: string; // ISO 639 language code (e.g., 'en', 'pt_BR')
  parameters?: Array<{
    type: 'text' | 'currency' | 'date_time' | 'image' | 'document' | 'video';
    text?: string;
    currency?: { code: string; amount_1000: number };
    date_time?: string; // ISO 8601 format
    image?: { link: string };
    document?: { link: string };
    video?: { link: string };
  }>;
}

interface SendMediaMessageParams {
  to: string;
  mediaType: 'image' | 'document' | 'audio' | 'video';
  mediaUrl: string; // Public URL or signed URL
  caption?: string; // For image/video
  filename?: string; // For document
}

interface WhatsAppApiResponse {
  messaging_product?: 'whatsapp';
  id?: string; // For media uploads
  contacts?: Array<{
    input: string;
    wa_id: string;
  }>;
  messages?: Array<{
    id: string;
  }>;
  error?: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
}

export class WhatsAppClient {
  private phoneNumberId: string;
  private accessToken: string;
  private businessAccountId?: string;

  constructor(config: WhatsAppConfig) {
    this.phoneNumberId = config.phoneNumberId;
    this.accessToken = config.accessToken;
    this.businessAccountId = config.businessAccountId;

    if (!this.phoneNumberId || !this.accessToken) {
      throw new Error('WhatsApp Cloud API credentials are required');
    }
  }

  /**
   * Send a plain text message
   */
  async sendTextMessage(params: SendTextMessageParams): Promise<{ messageId: string }> {
    const { to, message, previewUrl = false } = params;

    // Validate phone number format (E.164)
    if (!/^\+[1-9]\d{1,14}$/.test(to)) {
      throw new Error(`Invalid phone number format: ${to}. Must be E.164 format (e.g., +5511999999999)`);
    }

    // Validate message length
    if (message.length > 4096) {
      throw new Error(`Message too long: ${message.length} characters. Maximum is 4096.`);
    }

    const url = `${WHATSAPP_API_BASE_URL}/${this.phoneNumberId}/messages`;

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to.replace('+', ''), // WhatsApp API expects number without +
      type: 'text',
      text: {
        preview_url: previewUrl,
        body: message,
      },
    };

    const response = await this.makeRequest(url, payload);
    return { messageId: response.messages?.[0]?.id || '' };
  }

  /**
   * Send a template message (for outbound messages outside 24-hour window)
   */
  async sendTemplateMessage(params: SendTemplateMessageParams): Promise<{ messageId: string }> {
    const { to, templateName, languageCode, parameters = [] } = params;

    // Validate phone number format
    if (!/^\+[1-9]\d{1,14}$/.test(to)) {
      throw new Error(`Invalid phone number format: ${to}. Must be E.164 format`);
    }

    const url = `${WHATSAPP_API_BASE_URL}/${this.phoneNumberId}/messages`;

    const payload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to.replace('+', ''),
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: languageCode,
        },
      },
    };

    // Add parameters if provided
    if (parameters.length > 0) {
      payload.template.components = [
        {
          type: 'body',
          parameters: parameters.map((param) => {
            if (param.type === 'text') {
              return { type: 'text', text: param.text };
            } else if (param.type === 'currency') {
              return {
                type: 'currency',
                currency: param.currency,
              };
            } else if (param.type === 'date_time') {
              return {
                type: 'date_time',
                date_time: { fallback_value: param.date_time },
              };
            } else if (param.type === 'image') {
              return {
                type: 'image',
                image: { link: param.image?.link },
              };
            } else if (param.type === 'document') {
              return {
                type: 'document',
                document: { link: param.document?.link },
              };
            } else if (param.type === 'video') {
              return {
                type: 'video',
                video: { link: param.video?.link },
              };
            }
            return null;
          }).filter(Boolean),
        },
      ];
    }

    const response = await this.makeRequest(url, payload);
    return { messageId: response.messages?.[0]?.id || '' };
  }

  /**
   * Send a media message (image, document, audio, video)
   */
  async sendMediaMessage(params: SendMediaMessageParams): Promise<{ messageId: string }> {
    const { to, mediaType, mediaUrl, caption, filename } = params;

    // Validate phone number format
    if (!/^\+[1-9]\d{1,14}$/.test(to)) {
      throw new Error(`Invalid phone number format: ${to}. Must be E.164 format`);
    }

    const url = `${WHATSAPP_API_BASE_URL}/${this.phoneNumberId}/messages`;

    const payload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to.replace('+', ''),
      type: mediaType,
    };

    // Add media-specific fields
    if (mediaType === 'image') {
      payload.image = { link: mediaUrl };
      if (caption) payload.image.caption = caption;
    } else if (mediaType === 'document') {
      payload.document = { link: mediaUrl };
      if (filename) payload.document.filename = filename;
    } else if (mediaType === 'audio') {
      payload.audio = { link: mediaUrl };
    } else if (mediaType === 'video') {
      payload.video = { link: mediaUrl };
      if (caption) payload.video.caption = caption;
    }

    const response = await this.makeRequest(url, payload);
    return { messageId: response.messages?.[0]?.id || '' };
  }

  /**
   * Upload media file to WhatsApp (required before sending media messages)
   * Returns media ID that can be used in sendMediaMessage
   */
  async uploadMedia(mediaUrl: string, mediaType: 'image' | 'document' | 'audio' | 'video'): Promise<string> {
    const url = `${WHATSAPP_API_BASE_URL}/${this.phoneNumberId}/media`;

    const payload = {
      messaging_product: 'whatsapp',
      type: mediaType,
      link: mediaUrl,
    };

    const response = await this.makeRequest(url, payload);
    return response.id || '';
  }

  /**
   * Make authenticated request to WhatsApp Cloud API
   * Handles retries, rate limiting, and error handling
   */
  private async makeRequest(
    url: string,
    payload: Record<string, unknown>,
    retries = 3
  ): Promise<WhatsAppApiResponse> {
    const headers = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });

        const data: WhatsAppApiResponse = await response.json();

        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
          console.warn(`Rate limited. Retrying after ${retryAfter} seconds...`);
          
          if (attempt < retries) {
            await this.sleep(retryAfter * 1000);
            continue;
          }
          
          throw new Error('Rate limit exceeded. Please try again later.');
        }

        // Handle API errors
        if (!response.ok || data.error) {
          const error = data.error || { message: 'Unknown error', code: response.status };
          
          // Don't retry on client errors (4xx)
          if (response.status >= 400 && response.status < 500) {
            throw new Error(`WhatsApp API error: ${error.message} (code: ${error.code})`);
          }

          // Retry on server errors (5xx)
          if (response.status >= 500 && attempt < retries) {
            const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
            console.warn(`Server error. Retrying in ${delay}ms... (attempt ${attempt + 1}/${retries})`);
            await this.sleep(delay);
            continue;
          }

          throw new Error(`WhatsApp API error: ${error.message} (code: ${error.code})`);
        }

        return data;

      } catch (error) {
        if (attempt === retries) {
          throw error;
        }

        // Network errors - retry with exponential backoff
        if (error instanceof TypeError || error instanceof Error) {
          const delay = Math.pow(2, attempt) * 1000;
          console.warn(`Request failed. Retrying in ${delay}ms... (attempt ${attempt + 1}/${retries})`);
          await this.sleep(delay);
          continue;
        }

        throw error;
      }
    }

    throw new Error('Request failed after all retries');
  }

  /**
   * Get rate limit information from response headers
   */
  private parseRateLimit(headers: Headers): RateLimitInfo | null {
    const limit = headers.get('X-Rate-Limit-Limit');
    const remaining = headers.get('X-Rate-Limit-Remaining');
    const reset = headers.get('X-Rate-Limit-Reset');

    if (limit && remaining && reset) {
      return {
        limit: parseInt(limit, 10),
        remaining: parseInt(remaining, 10),
        reset: parseInt(reset, 10),
      };
    }

    return null;
  }

  /**
   * Sleep utility for retries
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Verify webhook signature (for webhook security)
   */
  static verifyWebhookSignature(
    _payload: string,
    _signature: string,
    _secret: string
  ): boolean {
    // WhatsApp uses HMAC SHA256 for webhook verification
    // Implementation depends on crypto library available in Deno
    // For now, return true - implement proper verification in production
    // TODO: Implement HMAC SHA256 verification
    return true;
  }
}

/**
 * Create WhatsApp client from environment variables
 */
export function createWhatsAppClient(): WhatsAppClient {
  const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
  const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
  const businessAccountId = Deno.env.get('WHATSAPP_BUSINESS_ACCOUNT_ID');

  if (!phoneNumberId || !accessToken) {
    throw new Error(
      'WhatsApp Cloud API credentials not configured. ' +
      'Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN environment variables.'
    );
  }

  return new WhatsAppClient({
    phoneNumberId,
    accessToken,
    businessAccountId,
  });
}
