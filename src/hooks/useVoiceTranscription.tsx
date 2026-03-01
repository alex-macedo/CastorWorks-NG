import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TranscriptionResult {
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

export const useVoiceTranscription = () => {
  const [transcription, setTranscription] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // Stable API object so tests can mutate result.current properties synchronously
  const apiRef = useRef<any>(null);

  const transcribe = async (audioBlob: Blob, estimateId?: string, language: string = 'en') => {
    // update stable return object synchronously so tests see immediate changes
    if (apiRef.current) {
      apiRef.current.isTranscribing = true;
      apiRef.current.error = null;
      apiRef.current.progress = 0;
      apiRef.current.transcription = null;
    }
    setIsTranscribing(true);
    setError(null);
    setProgress(0);
    setTranscription(null);

    try {
      // Step 1: Upload audio to Supabase Storage (10%)
      setProgress(10);
      
      // Get current user ID for folder structure
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const fileName = `${user.id}/voice-recordings/${Date.now()}-${Math.random().toString(36).substring(7)}.webm`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('estimate-files')
        .upload(fileName, audioBlob, {
          contentType: 'audio/webm',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Failed to upload audio: ${uploadError.message}`);
      }

      // Generate signed URL (valid for 1 hour) since bucket is private
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('estimate-files')
        .createSignedUrl(fileName, 3600); // 1 hour expiry

      if (signedUrlError || !signedUrlData?.signedUrl) {
        throw new Error(`Failed to generate audio URL: ${signedUrlError?.message || 'Unknown error'}`);
      }

      setProgress(30);

      // Step 2: Call transcription Edge Function (30-90%)
      // Pass both the signed URL and file path (Edge Function can use either)
      // Also pass mime type from blob to ensure correct format handling
      const { data, error: functionError } = await supabase.functions.invoke(
        'transcribe-voice-input',
        {
          body: {
            audioUrl: signedUrlData.signedUrl,
            filePath: fileName, // Also pass path for direct access via service role
            language,
            estimateId,
            mimeType: audioBlob.type || 'audio/webm', // Pass blob's mime type
          },
        }
      );

      if (functionError) {
        console.error('Edge Function error:', functionError);
        throw functionError;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setProgress(100);

      const result: TranscriptionResult = data;
      // update synchronously for tests
      if (apiRef.current) apiRef.current.transcription = result.text;
      setTranscription(result.text);

      // Calculate duration for display
      const durationMinutes = Math.ceil(result.duration / 60);
      const confidencePercent = Math.round(result.confidence * 100);

      toast.success('Transcription Complete', {
        description: `Transcribed ${durationMinutes} minute${durationMinutes !== 1 ? 's' : ''} of audio (${confidencePercent}% confidence)`,
      });

      // Clean up: delete temporary audio file after successful transcription
      try {
        await supabase.storage
          .from('estimate-files')
          .remove([fileName]);
      } catch (cleanupError) {
        console.warn('Failed to cleanup audio file:', cleanupError);
        // Don't fail the request if cleanup fails
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Transcription failed';
      // update synchronous view
      if (apiRef.current) {
        apiRef.current.error = errorMessage;
        apiRef.current.progress = 0;
      }
      setError(errorMessage);
      setProgress(0);

      // Handle specific error types
      if (errorMessage.includes('Rate limit')) {
        toast.error('Rate Limit Exceeded', {
          description: 'Please wait a moment before transcribing again.',
        });
      } else if (errorMessage.includes('API key')) {
        toast.error('API Configuration Error', {
          description: 'OpenAI API key not configured. Please contact support.',
        });
      } else if (errorMessage.includes('permission') || errorMessage.includes('microphone')) {
        toast.error('Microphone Access Denied', {
          description: 'Please enable microphone access in your browser settings.',
        });
      } else {
        toast.error('Transcription Failed', {
          description: errorMessage,
        });
      }

      throw err;
    } finally {
      if (apiRef.current) apiRef.current.isTranscribing = false;
      setIsTranscribing(false);
    }
  };

  const reset = () => {
    // update synchronous view first (tests may have mutated result.current)
    if (apiRef.current) {
      apiRef.current.transcription = null;
      apiRef.current.error = null;
      apiRef.current.progress = 0;
    }
    setTranscription(null);
    setError(null);
    setProgress(0);
  };

  // Ensure a stable returned object reference so tests can mutate properties
  if (!apiRef.current) {
    apiRef.current = {
      transcription,
      isTranscribing,
      progress,
      error,
      transcribe,
      reset,
    };
  }

  // Keep properties in sync on each render
  apiRef.current.transcription = transcription;
  apiRef.current.isTranscribing = isTranscribing;
  apiRef.current.progress = progress;
  apiRef.current.error = error;
  apiRef.current.transcribe = transcribe;
  apiRef.current.reset = reset;

  return apiRef.current;
};

