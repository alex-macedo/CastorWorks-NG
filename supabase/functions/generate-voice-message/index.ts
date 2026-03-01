import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authenticateRequest } from '../_shared/authorization.ts';
import { createErrorResponse as _createErrorResponse } from '../_shared/errorHandler.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VoiceGenerationRequest {
  recipient_id: string;
  message_text: string;
  voice_config?: {
    voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
    model?: 'tts-1' | 'tts-1-hd';
    speed?: number; // 0.25 to 4.0
  };
}

interface VoiceGenerationResponse {
  success: boolean;
  voice_message_url?: string;
  duration?: number;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authenticate user (service role or authenticated user)
    const authHeader = req.headers.get('authorization');
    const isServiceRole = authHeader?.includes(SUPABASE_SERVICE_ROLE_KEY);

    if (!isServiceRole) {
      await authenticateRequest(req);
    }

    // Check API key
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Parse request
    const requestData: VoiceGenerationRequest = await req.json();
    const { recipient_id, message_text, voice_config } = requestData;

    if (!recipient_id || !message_text) {
      throw new Error('recipient_id and message_text are required');
    }

    console.log(`Generating voice message for recipient ${recipient_id}`);

    const startTime = Date.now();

    // Initialize Supabase client
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get recipient details to verify it exists
    const { data: recipient, error: recipientError } = await supabaseClient
      .from('campaign_recipients')
      .select('id, campaign_id, contact_name')
      .eq('id', recipient_id)
      .single();

    if (recipientError || !recipient) {
      throw new Error(`Recipient not found: ${recipient_id}`);
    }

    // Call OpenAI TTS API
    const voice = voice_config?.voice || 'alloy';
    const model = voice_config?.model || 'tts-1'; // Use standard quality by default for cost efficiency
    const speed = voice_config?.speed || 1.0;

    console.log(`Calling OpenAI TTS API with voice: ${voice}, model: ${model}, speed: ${speed}`);

    const ttsResponse = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        voice,
        input: message_text,
        speed,
        response_format: 'mp3', // WhatsApp supports MP3
      }),
    });

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      console.error('OpenAI TTS API error:', errorText);
      throw new Error(`OpenAI TTS API error: ${ttsResponse.status} - ${errorText}`);
    }

    // Get the audio blob
    const audioBlob = await ttsResponse.blob();
    const audioBuffer = await audioBlob.arrayBuffer();
    const audioBytes = new Uint8Array(audioBuffer);

    console.log(`Voice message generated, size: ${audioBytes.length} bytes`);

    // Upload to Supabase Storage
    const fileName = `campaign-voice-${recipient_id}-${Date.now()}.mp3`;
    const filePath = `campaigns/${recipient.campaign_id}/${fileName}`;

    const { data: _uploadData, error: uploadError } = await supabaseClient
      .storage
      .from('estimate-files') // Reuse existing bucket
      .upload(filePath, audioBytes, {
        contentType: 'audio/mpeg',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Failed to upload voice message: ${uploadError.message}`);
    }

    console.log(`Voice message uploaded to: ${filePath}`);

    // Optionally create a short-lived signed URL for immediate use (don't persist it)
    const SIGN_TTL_SECONDS = 3600; // 1 hour for immediate consumption
    let signedUrl: string | undefined = undefined;
    try {
      const { data: urlData, error: signError } = await supabaseClient
        .storage
        .from('estimate-files')
        .createSignedUrl(filePath, SIGN_TTL_SECONDS);

      if (signError) {
        console.warn('Failed to generate signed URL for voice message (will still persist path):', signError);
      } else {
        signedUrl = urlData?.signedUrl;
      }
    } catch (err) {
      console.warn('Exception while creating signed URL (continuing):', err);
    }

    // Estimate duration (rough estimate: 150 words per minute, ~2.5 chars per word)
    const estimatedWords = message_text.length / 2.5;
    const estimatedDuration = Math.ceil((estimatedWords / 150) * 60); // in seconds

    // Update recipient with voice message URL
    // Persist the stable storage path in the DB (do NOT persist the expiring signed URL)
    const { error: updateError } = await supabaseClient
      .from('campaign_recipients')
      .update({
        voice_message_url: filePath,
        voice_message_duration: estimatedDuration,
        updated_at: new Date().toISOString(),
      })
      .eq('id', recipient_id);

    if (updateError) {
      console.error('Failed to update recipient with voice message:', updateError);
      // Don't throw - voice was generated successfully, just log failed
    }

    // Log to campaign logs
    await supabaseClient
      .from('campaign_logs')
      .insert({
        campaign_id: recipient.campaign_id,
        recipient_id: recipient_id,
        log_level: 'success',
        event_type: 'voice_message_generated',
        message: `Voice message generated for ${recipient.contact_name}`,
        metadata: {
          voice,
          model,
          speed,
          duration: estimatedDuration,
          file_path: filePath,
          processing_time_ms: Date.now() - startTime,
        },
      });

    // Track AI usage
    const inputChars = message_text.length;
    const estimatedCost = model === 'tts-1-hd' ? (inputChars / 1000) * 0.030 : (inputChars / 1000) * 0.015;

    await supabaseClient
      .from('ai_usage_logs')
      .insert({
        feature_type: 'voice_generation',
        model_name: `openai-${model}`,
        input_tokens: 0, // TTS is character-based, not token-based
        output_tokens: 0,
        total_cost: estimatedCost,
        request_metadata: {
          recipient_id,
          campaign_id: recipient.campaign_id,
          voice,
          character_count: inputChars,
          duration: estimatedDuration,
        },
      });

    // Return a short-lived signed URL for immediate consumption when available;
    // otherwise return the stable file path so callers can request a signed URL later.
    const response: VoiceGenerationResponse = {
      success: true,
      voice_message_url: signedUrl ?? filePath,
      duration: estimatedDuration,
    };

    console.log(`Voice message generation completed in ${Date.now() - startTime}ms`);

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Voice generation error:', error);

    const errorResponse: VoiceGenerationResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };

    return new Response(
      JSON.stringify(errorResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
