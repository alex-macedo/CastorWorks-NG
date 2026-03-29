import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authenticateRequest } from '../_shared/authorization.ts';
import { createErrorResponse } from '../_shared/errorHandler.ts';
import { consumeAIActions } from '../_shared/ai-metering.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TranscriptionRequest {
  audioUrl: string;
  filePath?: string; // Optional: direct path for service role access
  bucket?: string;  // Optional: storage bucket name (defaults to 'estimate-files')
  language?: string;
  estimateId?: string;
  mimeType?: string; // Optional: audio/video mime type
}

interface TranscriptionResponse {
  text: string;
  language: string;
  duration: number;
  confidence: number;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
  processingTimeMs: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const { user } = await authenticateRequest(req);

    // Check API key
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // AI Metering: consume credits before transcription (2 actions per call)
    const tenantId = user.app_metadata?.tenant_id as string | undefined ?? '';
    const metering = await consumeAIActions({
      tenantId,
      feature: 'transcribe-voice-input',
      actions: 2,
      userId: user.id,
      modelUsed: 'whisper-1',
    });
    // Note: transcribe-voice-input uses OpenAI Whisper — no preferredProvider routing applies
    // metering.degraded is available if future routing is needed
    void metering;

    // Parse request
    const requestData: TranscriptionRequest = await req.json();
    const { audioUrl, filePath: providedFilePath, bucket: providedBucket, language = 'en', estimateId, mimeType: providedMimeType } = requestData;
    // Default to 'estimate-files' to preserve backward compatibility
    const storageBucket = providedBucket || 'estimate-files';

    if (!audioUrl && !providedFilePath) {
      throw new Error('Either audioUrl or filePath is required');
    }

    const startTime = Date.now();

    // Download audio file from Supabase Storage
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    let audioData: Blob | null = null;
    let downloadError: Error | null = null;

    // Prefer direct file path access (more reliable with service role)
    if (providedFilePath) {
      const { data, error } = await supabaseClient
        .storage
        .from(storageBucket)
        .download(providedFilePath);
      
      audioData = data;
      downloadError = error;
    } else if (audioUrl) {
      // If audioUrl looks like a storage path (not an http URL), treat it as a file path
      let filePath = '';

      const isHttp = /^https?:\/\//i.test(String(audioUrl));

      if (!isHttp) {
        // audioUrl provided as a storage path directly
        filePath = String(audioUrl);
      } else {
        // audioUrl is an http(s) URL - try to extract path for supabase object URLs
        if (audioUrl.includes('/object/public/')) {
          const urlParts = audioUrl.split('/object/public/');
          if (urlParts.length === 2) {
            filePath = urlParts[1].split('?')[0];
          }
        } else if (audioUrl.includes('/object/sign/')) {
          const urlParts = audioUrl.split('/object/sign/');
          if (urlParts.length === 2) {
            filePath = urlParts[1].split('?')[0];
          }
        }
      }

      if (filePath) {
        // Try direct download using path (service role client)
        const { data, error } = await supabaseClient
          .storage
          .from(storageBucket)
          .download(filePath);

        audioData = data;
        downloadError = error;
      } else {
        // Fallback: download from signed or external URL directly
        const response = await fetch(audioUrl);
        if (!response.ok) {
          throw new Error(`Failed to download audio from URL: ${response.status}`);
        }
        audioData = await response.blob();
      }
    }

    if (downloadError) {
      console.error('Failed to download audio:', downloadError);
      throw new Error(`Failed to download audio file: ${downloadError.message || 'Unknown error'}`);
    }

    if (!audioData) {
      throw new Error('Audio file is empty or could not be downloaded');
    }

    // Detect mime type: prefer provided, then blob type, fallback to webm
    const detectedMimeType = providedMimeType || audioData.type || 'audio/webm';
    
    // Determine file extension from mime type (support both audio/* and video/*)
    const extensionMap: Record<string, string> = {
      'audio/webm': 'webm',
      'audio/mp4': 'mp4',
      'audio/mpeg': 'mp3',
      'audio/wav': 'wav',
      'audio/ogg': 'ogg',
      'audio/m4a': 'm4a',
      // Video types — Whisper accepts video files and extracts audio internally
      'video/webm': 'webm',
      'video/mp4': 'mp4',
      'video/ogg': 'ogg',
      'video/quicktime': 'mov',
    };
    const extension = extensionMap[detectedMimeType] || 'webm';

    // Convert Blob to File for OpenAI API with correct mime type
    const audioFile = new File([audioData], `audio.${extension}`, { type: detectedMimeType });

    // Call OpenAI Whisper API
    const formData = new FormData();
    formData.append('file', audioFile);
    formData.append('model', 'whisper-1');
    formData.append('language', language);
    formData.append('response_format', 'verbose_json'); // Get detailed response with segments

    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error('OpenAI Whisper API error:', errorText);
      
      if (whisperResponse.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment before trying again.');
      } else if (whisperResponse.status === 401) {
        throw new Error('OpenAI API key is invalid or expired.');
      } else {
        throw new Error(`Transcription failed: ${whisperResponse.status}`);
      }
    }

    const whisperData = await whisperResponse.json();
    const processingTime = Date.now() - startTime;

    // Calculate duration from segments if available
    let duration = 0;
    if (whisperData.segments && whisperData.segments.length > 0) {
      const lastSegment = whisperData.segments[whisperData.segments.length - 1];
      duration = Math.ceil(lastSegment.end);
    } else {
      // Fallback: estimate duration from file size if segments not available
      // Average bitrate estimates: webm ~64kbps, mp3 ~128kbps, wav ~1411kbps
      const bitrateMap: Record<string, number> = {
        'audio/webm': 64000, // ~64 kbps
        'audio/mp4': 128000,  // ~128 kbps
        'audio/mpeg': 128000, // ~128 kbps
        'audio/wav': 1411000, // ~1411 kbps (uncompressed)
        'audio/ogg': 96000,   // ~96 kbps
        'audio/m4a': 128000,  // ~128 kbps
      };
      const estimatedBitrate = bitrateMap[detectedMimeType] || 128000; // Default to 128kbps
      const fileSizeBytes = audioData.size;
      // Duration in seconds = (file size in bytes * 8) / (bitrate in bits per second)
      duration = Math.max(1, Math.ceil((fileSizeBytes * 8) / estimatedBitrate));
      console.warn(`No segments returned from Whisper API. Estimated duration: ${duration}s from file size: ${fileSizeBytes} bytes`);
    }

    // Calculate confidence score (Whisper doesn't provide this directly, so we estimate)
    // Based on average segment confidence or use a default high value
    const confidence = whisperData.segments?.length > 0 
      ? Math.min(0.95, 0.85 + (whisperData.segments.length * 0.01))
      : 0.90;

    const result: TranscriptionResponse = {
      text: whisperData.text,
      language: whisperData.language || language,
      duration,
      confidence,
      segments: whisperData.segments?.map((seg: any) => ({
        start: seg.start,
        end: seg.end,
        text: seg.text,
      })),
      processingTimeMs: processingTime,
    };

    // Log transcription to database (optional)
    if (estimateId) {
      try {
        await supabaseClient
          .from('voice_transcriptions')
          .insert({
            estimate_id: estimateId,
            user_id: user.id,
            audio_url: audioUrl,
            duration_seconds: duration,
            transcription: whisperData.text,
            confidence_score: confidence,
            language: whisperData.language || language,
            whisper_model: 'whisper-1',
            segments: whisperData.segments || null,
            processing_time_ms: processingTime,
          });
      } catch (logError) {
        console.error('Failed to log transcription:', logError);
        // Don't fail the request if logging fails
      }
    }

    // Log usage for cost tracking
    try {
      await supabaseClient
        .from('ai_usage_logs')
        .insert({
          user_id: user.id,
          feature: 'voice_transcription',
          model: 'whisper-1',
          input_tokens: 0, // Whisper doesn't use tokens
          output_tokens: 0,
          total_cost: (duration / 60) * 0.006, // $0.006 per minute
        });
    } catch (logError) {
      console.error('Failed to log usage:', logError);
      // Don't fail the request if logging fails
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error transcribing voice:', error);
    return createErrorResponse(error, corsHeaders);
  }
});

