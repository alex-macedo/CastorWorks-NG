import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Mic, Square, Pause, Play, RotateCcw, Check, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useLocalization } from '@/contexts/LocalizationContext';

interface Props {
  onRecordingComplete: (audioBlob: Blob) => void;
  maxDurationSeconds?: number;
  disabled?: boolean;
}

export const VoiceRecorder = ({ 
  onRecordingComplete, 
  maxDurationSeconds = 600, // 10 minutes default
  disabled = false 
}: Props) => {
  const { t } = useLocalization();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [waveformData] = useState(() => 
    Array.from({ length: 20 }).map(() => ({
      height: Math.random() * 60 + 20,
      duration: 300 + Math.random() * 200,
    }))
  );

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  const checkMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop immediately, just checking permission
      setHasPermission(true);
    } catch (err) {
      setHasPermission(false);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError(t('estimates.voiceRecorder.microphonePermissionDenied'));
        } else if (err.name === 'NotFoundError') {
          setError(t('estimates.voiceRecorder.noMicrophoneFound'));
        } else {
          setError(t('estimates.voiceRecorder.microphoneAccessFailed'));
        }
      }
    }
  };

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  // Check microphone permission on mount
  useEffect(() => {
    checkMicrophonePermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl, stopRecording]);

  const startRecording = async () => {
    try {
      setError(null);
      audioChunksRef.current = [];
      setDuration(0);

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      streamRef.current = stream;

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') 
          ? 'audio/webm' 
          : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : 'audio/ogg',
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: mediaRecorder.mimeType 
        });
        setAudioBlob(audioBlob);
        
        // Create URL for playback
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setIsPaused(false);

      // Start timer
      timerRef.current = window.setInterval(() => {
        setDuration((prev) => {
          const newDuration = prev + 1;
          if (newDuration >= maxDurationSeconds) {
            stopRecording();
            return maxDurationSeconds;
          }
          return newDuration;
        });
      }, 1000);
    } catch (err) {
      console.error('Error starting recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to start recording');
      setIsRecording(false);
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      
      // Resume timer
      timerRef.current = window.setInterval(() => {
        setDuration((prev) => {
          const newDuration = prev + 1;
          if (newDuration >= maxDurationSeconds) {
            stopRecording();
            return maxDurationSeconds;
          }
          return newDuration;
        });
      }, 1000);
    }
  };

  const resetRecording = () => {
    stopRecording();
    setAudioBlob(null);
    setDuration(0);
    setError(null);
    
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
  };

  const handleUseRecording = () => {
    if (audioBlob) {
      onRecordingComplete(audioBlob);
      resetRecording();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return t('estimates.voiceRecorder.timeFormat', { minutes: mins, seconds: secs.toString().padStart(2, '0') }) || `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = (duration / maxDurationSeconds) * 100;

  // Permission denied state
  if (hasPermission === false) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error || t('estimates.voiceRecorder.microphoneAccessFailed')}
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={checkMicrophonePermission}
              >
                {t('common.retry') || 'Retry'}
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        {/* Recording Status */}
        {!audioBlob && (
          <div className="space-y-4">
            {/* Timer and Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isRecording && (
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-red-600">
                      {isPaused ? t('estimates.voiceRecorder.paused') : t('estimates.voiceRecorder.recording')}
                    </span>
                  </div>
                )}
                {!isRecording && !audioBlob && (
                  <span className="text-sm text-muted-foreground">{t('estimates.voiceRecorder.readyToRecord')}</span>
                )}
              </div>
              <div className="text-2xl font-mono font-bold">
                {formatTime(duration)}
              </div>
            </div>

            {/* Progress Bar */}
            {isRecording && (
              <Progress value={progressPercentage} className="h-2" />
            )}

            {/* Audio Waveform Visualization (Simple) */}
            {isRecording && (
              <div className="h-16 bg-muted rounded-lg flex items-center justify-center gap-1 px-4">
                {waveformData.map((bar, i) => (
                  <div
                    key={i}
                    className="w-1 bg-primary rounded-full animate-pulse"
                    style={{
                      height: `${bar.height}%`,
                      animationDelay: `${i * 50}ms`,
                      animationDuration: `${bar.duration}ms`,
                    }}
                  />
                ))}
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center justify-center gap-2">
              {!isRecording && !audioBlob && (
                <Button
                  onClick={startRecording}
                  disabled={disabled || !hasPermission}
                  size="lg"
                  className="gap-2"
                >
                  <Mic className="h-5 w-5" />
                  {t('estimates.voiceRecorder.startRecording')}
                </Button>
              )}

              {isRecording && (
                <>
                  {!isPaused ? (
                    <Button
                      onClick={pauseRecording}
                      variant="outline"
                      size="lg"
                      className="gap-2"
                    >
                      <Pause className="h-5 w-5" />
                      {t('estimates.voiceRecorder.pause')}
                    </Button>
                  ) : (
                    <Button
                      onClick={resumeRecording}
                      variant="outline"
                      size="lg"
                      className="gap-2"
                    >
                      <Play className="h-5 w-5" />
                      {t('estimates.voiceRecorder.resume')}
                    </Button>
                  )}
                  <Button
                    onClick={stopRecording}
                    variant="destructive"
                    size="lg"
                    className="gap-2"
                  >
                    <Square className="h-5 w-5" />
                    {t('estimates.voiceRecorder.stop')}
                  </Button>
                </>
              )}
            </div>

            {/* Max Duration Warning */}
            {duration >= maxDurationSeconds * 0.9 && duration < maxDurationSeconds && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {t('estimates.voiceRecorder.maxDurationReached', { minutes: maxDurationSeconds / 60 })}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Playback Section */}
        {audioBlob && audioUrl && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="gap-2">
                <Check className="h-3 w-3" />
                {t('estimates.voiceRecorder.recording')} {t('common.completed')} ({formatTime(duration)})
              </Badge>
              <div className="text-sm text-muted-foreground">
                {t('estimates.voiceRecorder.fileSize', { size: (audioBlob.size / 1024 / 1024).toFixed(2) })}
              </div>
            </div>

            {/* Audio Player */}
            <audio
              src={audioUrl}
              controls
              className="w-full"
            />

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={handleUseRecording}
                className="flex-1 gap-2"
                size="lg"
              >
                <Check className="h-4 w-4" />
                {t('estimates.voiceRecorder.useRecording')}
              </Button>
              <Button
                onClick={resetRecording}
                variant="outline"
                className="gap-2"
                size="lg"
              >
                <RotateCcw className="h-4 w-4" />
                {t('estimates.voiceRecorder.reRecord')}
              </Button>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Help Text */}
        {!isRecording && !audioBlob && (
          <div className="text-xs text-muted-foreground text-center space-y-1">
            <p>• Speak clearly and describe your project in detail</p>
            <p>• Maximum recording time: {maxDurationSeconds / 60} minutes</p>
            <p>• You can pause and resume your recording</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

