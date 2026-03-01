import { useState, useRef, useCallback, useEffect } from 'react';

export type RecordingState = 'idle' | 'requesting-permission' | 'recording' | 'paused' | 'stopped';

interface UseBugRecordingReturn {
  state: RecordingState;
  duration: number;          // seconds elapsed
  videoBlob: Blob | null;
  videoBlobUrl: string | null;
  error: string | null;
  isMaxDurationWarning: boolean;
  start: () => Promise<void>;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;         // cleanup streams + blob
}

const MAX_DURATION_SECONDS = 5 * 60; // 5 minutes
const WARNING_DURATION_SECONDS = 4 * 60 + 30; // 4:30 warning

export const useBugRecording = (): UseBugRecordingReturn => {
  const [state, setState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoBlobUrl, setVideoBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMaxDurationWarning, setIsMaxDurationWarning] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  const cleanup = useCallback(() => {
    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Revoke blob URL
    if (videoBlobUrl) {
      URL.revokeObjectURL(videoBlobUrl);
      setVideoBlobUrl(null);
    }

    // Clear MediaRecorder
    mediaRecorderRef.current = null;
    videoChunksRef.current = [];
  }, [videoBlobUrl]);

  const reset = useCallback(() => {
    cleanup();
    setState('idle');
    setDuration(0);
    setVideoBlob(null);
    setError(null);
    setIsMaxDurationWarning(false);
  }, [cleanup]);

  const stop = useCallback(() => {
    if (mediaRecorderRef.current && (state === 'recording' || state === 'paused')) {
      mediaRecorderRef.current.stop();
      setState('stopped');
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [state]);

  const pause = useCallback(() => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.pause();
      setState('paused');
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [state]);

  const resume = useCallback(() => {
    if (mediaRecorderRef.current && state === 'paused') {
      mediaRecorderRef.current.resume();
      setState('recording');
      
      // Resume timer
      timerRef.current = window.setInterval(() => {
        setDuration((prev) => {
          const newDuration = prev + 1;
          
          // Show warning at 4:30
          if (newDuration === WARNING_DURATION_SECONDS) {
            setIsMaxDurationWarning(true);
          }
          
          // Auto-stop at 5 minutes
          if (newDuration >= MAX_DURATION_SECONDS) {
            stop();
            return MAX_DURATION_SECONDS;
          }
          
          return newDuration;
        });
      }, 1000);
    }
  }, [state, stop]);

  const start = useCallback(async () => {
    try {
      setError(null);
      setState('requesting-permission');
      videoChunksRef.current = [];
      setDuration(0);
      setIsMaxDurationWarning(false);

      // Check if getDisplayMedia is supported
      if (!navigator.mediaDevices.getDisplayMedia) {
        throw new Error('Screen sharing is not supported in this browser');
      }

      // Request screen share
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      // Request microphone access separately (some browsers don't include audio in screen share)
      let audioStream: MediaStream | null = null;
      try {
        audioStream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          }
        });
      } catch (audioError) {
        console.warn('Microphone access denied, continuing with screen audio only:', audioError);
      }

      // Combine streams
      const combinedStream = new MediaStream([
        ...screenStream.getVideoTracks(),
        ...(screenStream.getAudioTracks() || []),
        ...(audioStream?.getAudioTracks() || [])
      ]);

      streamRef.current = combinedStream;

      // Handle when user stops sharing via browser UI
      screenStream.getVideoTracks()[0].onended = () => {
        stop();
      };

      // Create MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : MediaRecorder.isTypeSupported('video/mp4')
        ? 'video/mp4'
        : 'video/webm';

      const mediaRecorder = new MediaRecorder(combinedStream, { mimeType });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          videoChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const videoBlob = new Blob(videoChunksRef.current, { 
          type: mediaRecorder.mimeType 
        });
        setVideoBlob(videoBlob);
        
        // Create URL for playback
        const url = URL.createObjectURL(videoBlob);
        setVideoBlobUrl(url);

        // Cleanup streams
        cleanup();
      };

      mediaRecorder.start(1000); // Collect data every second
      setState('recording');

      // Start timer
      timerRef.current = window.setInterval(() => {
        setDuration((prev) => {
          const newDuration = prev + 1;
          
          // Show warning at 4:30
          if (newDuration === WARNING_DURATION_SECONDS) {
            setIsMaxDurationWarning(true);
          }
          
          // Auto-stop at 5 minutes
          if (newDuration >= MAX_DURATION_SECONDS) {
            stop();
            return MAX_DURATION_SECONDS;
          }
          
          return newDuration;
        });
      }, 1000);

    } catch (err) {
      console.error('Error starting screen recording:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to start recording';
      setError(errorMessage);
      setState('idle');
      cleanup();
    }
  }, [stop, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    state,
    duration,
    videoBlob,
    videoBlobUrl,
    error,
    isMaxDurationWarning,
    start,
    stop,
    pause,
    resume,
    reset,
  };
};
