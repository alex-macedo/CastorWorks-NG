import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Monitor,
  Square,
  Pause,
  Play,
  RotateCcw,
  AlertCircle,
  Video,
  CheckCircle2,
  Loader2,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useBugRecording } from '@/hooks/useBugRecording';
import { useCreateRoadmapItem } from '@/hooks/useRoadmapItems';
import { useRegisterVideoAttachment } from '@/hooks/useRoadmapAttachments';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BugRecorderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'record' | 'processing' | 'review';

export function BugRecorderDialog({ open, onOpenChange }: BugRecorderDialogProps) {
  const { t } = useLocalization();
  const [currentStep, setCurrentStep] = useState<Step>('record');
  const [transcript, setTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [transcriptionError, setTranscriptionError] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [uploadedVideoStoragePath, setUploadedVideoStoragePath] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
  });

  const {
    state: recordingState,
    duration,
    videoBlob,
    videoBlobUrl,
    error: recordingError,
    isMaxDurationWarning,
    start: startRecording,
    stop: stopRecording,
    pause: pauseRecording,
    resume: resumeRecording,
    reset: resetRecording,
  } = useBugRecording();

  const createRoadmapItem = useCreateRoadmapItem();
  const registerVideoAttachment = useRegisterVideoAttachment();

  // Auto-minimize when recording starts, restore when stopped/paused
  useEffect(() => {
    if (recordingState === 'recording') {
      setIsMinimized(true);
    } else if (recordingState === 'stopped' || recordingState === 'idle') {
      setIsMinimized(false);
    }
  }, [recordingState]);

  const handleCleanup = useCallback(() => {
    resetRecording();
    setTranscript('');
    setIsTranscribing(false);
    setUploadProgress(0);
    setTranscriptionError(false);
    setIsMinimized(false);
    setUploadedVideoStoragePath(null);
  }, [resetRecording]);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      handleCleanup();
    } else {
      setCurrentStep('record');
      setFormData({ title: '', description: '', priority: 'medium' });
      setTranscript('');
      setTranscriptionError(false);
      setIsMinimized(false);
    }
  }, [open, handleCleanup]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRecordingComplete = useCallback(async () => {
    if (!videoBlob) return;

    setCurrentStep('processing');
    setUploadProgress(0);
    setIsTranscribing(true);
    setTranscriptionError(false);

    try {
      // Step 1: Upload video (50% progress)
      setUploadProgress(10);
      
      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError || !userData.user) {
        throw new Error(t('roadmap.bugRecorder.notAuthenticated'));
      }

      const fileExt = 'webm';
      const storagePath = `temp/${userData.user.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      // Strip codec parameters — Supabase Storage only accepts base MIME types (e.g. "video/webm")
      const uploadContentType = videoBlob.type.split(';')[0] || 'video/webm';

      const { error: uploadError } = await supabase.storage
        .from('roadmap-attachments')
        .upload(storagePath, videoBlob, {
          contentType: uploadContentType,
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`${t('roadmap.bugRecorder.uploadFailed')}: ${uploadError.message}`);
      }

      setUploadProgress(50);

      // Step 2: Transcribe audio (50-100% progress)
      let transcribedText = '';
      let didTranscriptionFail = false;

      try {
        // Generate signed URL for transcription
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from('roadmap-attachments')
          .createSignedUrl(storagePath, 3600);

        if (signedUrlError || !signedUrlData?.signedUrl) {
          throw new Error(`${t('roadmap.bugRecorder.urlGenerationFailed')}: ${signedUrlError?.message || t('roadmap.bugRecorder.unknownError')}`);
        }

        setUploadProgress(75);

        // Call transcription edge function
        const { data, error: functionError } = await supabase.functions.invoke(
          'transcribe-voice-input',
          {
            body: {
              audioUrl: signedUrlData.signedUrl,
              filePath: storagePath,
              bucket: 'roadmap-attachments',
              mimeType: videoBlob.type,
            },
          }
        );

        if (functionError || data?.error) {
          throw new Error(functionError?.message || data?.error || t('roadmap.bugRecorder.transcriptionFailed'));
        }

        transcribedText = data.text || '';
        setTranscript(transcribedText);
        setUploadProgress(100);
      } catch (transcriptionErr) {
        console.warn('Transcription failed:', transcriptionErr);
        didTranscriptionFail = true;
        setTranscriptionError(true);
        setUploadProgress(100); // Still complete the process
      }

      setIsTranscribing(false);
      setCurrentStep('review');
      setUploadedVideoStoragePath(storagePath);

      // Pre-fill description using local variables (avoid stale closure on state)
      setFormData(prev => ({
        ...prev,
        description: didTranscriptionFail
          ? t('roadmap.bugRecorder.transcriptionError')
          : transcribedText,
      }));

    } catch (error) {
      console.error('Processing failed:', error);
      toast.error(t('roadmap.bugRecorder.uploadError'));
      setCurrentStep('record');
      resetRecording();
    }
  }, [videoBlob, t, resetRecording]);

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error(t('roadmap.bugRecorder.titleRequired'));
      return;
    }

    try {
      // Create roadmap item
      const newItem = await createRoadmapItem.mutateAsync({
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: 'bug_fix',
        priority: formData.priority,
        status: 'backlog',
      });

      // Register video attachment using the actual upload path (must match where file was uploaded)
      if (videoBlob && videoBlobUrl && uploadedVideoStoragePath) {
        try {
          const fileName = uploadedVideoStoragePath.split('/').pop() || `bug-recording-${Date.now()}.webm`;

          await registerVideoAttachment.mutateAsync({
            roadmapItemId: newItem.id,
            storagePath: uploadedVideoStoragePath,
            fileName,
            fileSize: videoBlob.size,
            signedUrl: videoBlobUrl,
          });
        } catch (attachmentError) {
          console.warn('Failed to register video attachment:', attachmentError);
          toast.warning(t('roadmap.bugRecorder.attachmentFailed'));
        }
      }

      toast.success(t('roadmap.bugRecorder.createSuccess'));
      handleClose();
    } catch (error) {
      console.error('Failed to create bug report:', error);
      toast.error(t('roadmap.bugRecorder.createBugReportFailed'));
    }
  };

  const handleReRecord = () => {
    resetRecording();
    setCurrentStep('record');
    setFormData({ title: '', description: '', priority: 'medium' });
    setTranscript('');
    setTranscriptionError(false);
  };

  // Auto-advance when recording stops
  useEffect(() => {
    if (recordingState === 'stopped' && videoBlob && currentStep === 'record') {
      handleRecordingComplete();
    }
  }, [recordingState, videoBlob, currentStep, handleRecordingComplete]);

  const handleStopFromMinimized = () => {
    stopRecording();
    setIsMinimized(false);
  };

  const handlePauseFromMinimized = () => {
    pauseRecording();
    // Stay minimized when pausing, allow user to resume from the pill
  };

  const handleResumeFromMinimized = () => {
    resumeRecording();
    // Stay minimized for continued recording
  };

  const renderStepIndicator = () => {
    const steps = [
      { key: 'record', label: t('roadmap.bugRecorder.steps.record') },
      { key: 'processing', label: t('roadmap.bugRecorder.steps.processing') },
      { key: 'review', label: t('roadmap.bugRecorder.steps.review') },
    ];

    return (
      <div className="flex items-center justify-center space-x-4 mb-6">
        {steps.map((step, index) => (
          <div key={step.key} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep === step.key
                  ? 'bg-primary text-primary-foreground'
                  : steps.findIndex(s => s.key === currentStep) > index
                  ? 'bg-green-500 text-white'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {steps.findIndex(s => s.key === currentStep) > index ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                index + 1
              )}
            </div>
            <span className="ml-2 text-sm font-medium">{step.label}</span>
            {index < steps.length - 1 && (
              <div className="w-8 h-0.5 bg-muted mx-4" />
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderRecordStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-muted-foreground mb-4">
          {t('roadmap.bugRecorder.recordInstructions')}
        </p>
        
        {recordingError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{recordingError}</AlertDescription>
          </Alert>
        )}

        {isMaxDurationWarning && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{t('roadmap.bugRecorder.maxDurationWarning')}</AlertDescription>
          </Alert>
        )}
      </div>

      {/* Recording UI */}
      <div className="flex flex-col items-center space-y-4">
        {recordingState === 'idle' && (
          <Button
            onClick={startRecording}
            className="w-full max-w-xs"
            size="lg"
          >
            <Monitor className="w-4 h-4 mr-2" />
            {t('roadmap.bugRecorder.startRecording')}
          </Button>
        )}

        {recordingState === 'requesting-permission' && (
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
            <p>{t('roadmap.bugRecorder.requestingPermission')}</p>
          </div>
        )}

        {(recordingState === 'recording' || recordingState === 'paused') && (
          <div className="text-center space-y-4">
            <div className="text-2xl font-mono font-bold">
              {formatTime(duration)}
            </div>
            
            <Badge variant={recordingState === 'recording' ? 'destructive' : 'secondary'}>
              {recordingState === 'recording' ? t('roadmap.bugRecorder.recording') : t('roadmap.bugRecorder.paused')}
            </Badge>

            <div className="flex space-x-2">
              {recordingState === 'recording' ? (
                <>
                  <Button onClick={pauseRecording} variant="outline" size="sm">
                    <Pause className="w-4 h-4 mr-1" />
                    {t('roadmap.bugRecorder.pauseRecording')}
                  </Button>
                  <Button onClick={stopRecording} variant="destructive" size="sm">
                    <Square className="w-4 h-4 mr-1" />
                    {t('roadmap.bugRecorder.stopRecording')}
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={resumeRecording} size="sm">
                    <Play className="w-4 h-4 mr-1" />
                    {t('roadmap.bugRecorder.resumeRecording')}
                  </Button>
                  <Button onClick={stopRecording} variant="destructive" size="sm">
                    <Square className="w-4 h-4 mr-1" />
                    {t('roadmap.bugRecorder.stopRecording')}
                  </Button>
                </>
              )}
            </div>

            {/* Minimize hint */}
            <p className="text-xs text-muted-foreground">
              The dialog minimizes automatically while recording.
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderProcessingStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium mb-2">
          {t('roadmap.bugRecorder.processingTitle')}
        </h3>
        
        <div className="space-y-4">
          <Progress value={uploadProgress} className="w-full" />
          
          <div className="text-sm text-muted-foreground">
            {uploadProgress < 50 && t('roadmap.bugRecorder.uploading')}
            {uploadProgress >= 50 && uploadProgress < 100 && t('roadmap.bugRecorder.transcribing')}
            {uploadProgress === 100 && !isTranscribing && t('roadmap.bugRecorder.recordingComplete')}
          </div>

          {transcriptionError && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{t('roadmap.bugRecorder.transcriptionError')}</AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  );

  const renderReviewStep = () => (
    <div className="space-y-6">
      {/* Video Preview */}
      {videoBlobUrl && (
        <div className="space-y-2">
          <Label>{t('roadmap.bugRecorder.videoPreview')}</Label>
          <video
            src={videoBlobUrl}
            controls
            className="w-full max-h-64 rounded-lg border"
          />
        </div>
      )}

      <Separator />

      {/* Form Fields */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="title">{t('roadmap.bugRecorder.titleLabel')}</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder={t('roadmap.bugRecorder.titlePlaceholder')}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="description">{t('roadmap.bugRecorder.descriptionLabel')}</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder={t('roadmap.bugRecorder.descriptionPlaceholder')}
            className="mt-1"
            rows={4}
          />
          {transcript && !transcriptionError && (
            <p className="text-xs text-muted-foreground mt-1">
              {t('roadmap.bugRecorder.transcribedFromRecording')}
            </p>
          )}
        </div>

        <div>
          <Label>{t('roadmap.bugRecorder.priorityLabel')}</Label>
          <Select
            value={formData.priority}
            onValueChange={(value: 'low' | 'medium' | 'high' | 'urgent') =>
              setFormData(prev => ({ ...prev, priority: value }))
            }
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">{t('roadmap.priority.low')}</SelectItem>
              <SelectItem value="medium">{t('roadmap.priority.medium')}</SelectItem>
              <SelectItem value="high">{t('roadmap.priority.high')}</SelectItem>
              <SelectItem value="urgent">{t('roadmap.priority.urgent')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant="secondary">
            {t('roadmap.category.bugFix')}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {t('roadmap.bugRecorder.categoryFixed')}
          </span>
        </div>
      </div>
    </div>
  );

  // ─── Minimized floating pill ───────────────────────────────────────────────
  const isActiveRecording = recordingState === 'recording' || recordingState === 'paused';

  if (open && isMinimized && isActiveRecording) {
    return (
      <div
        className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border border-border/60 backdrop-blur-md bg-background/95 min-w-[280px]"
      >
        {/* Pulsing record dot */}
        <div className="relative flex-shrink-0">
          <span
            className={`block w-3 h-3 rounded-full ${
              recordingState === 'recording' ? 'bg-red-500' : 'bg-yellow-500'
            }`}
          />
          {recordingState === 'recording' && (
            <span className="absolute inset-0 w-3 h-3 rounded-full bg-red-500 animate-ping opacity-75" />
          )}
        </div>

        {/* Status + Timer */}
        <div className="flex flex-col flex-1 min-w-0">
          <span className="text-xs font-semibold leading-none text-foreground">
            {recordingState === 'recording'
              ? t('roadmap.bugRecorder.recording')
              : t('roadmap.bugRecorder.paused')}
          </span>
          <span className="text-sm font-mono font-bold text-foreground mt-0.5">
            {formatTime(duration)}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {recordingState === 'recording' ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={handlePauseFromMinimized}
              title={t('roadmap.bugRecorder.pauseRecording')}
            >
              <Pause className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={handleResumeFromMinimized}
              title={t('roadmap.bugRecorder.resumeRecording')}
            >
              <Play className="w-4 h-4" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleStopFromMinimized}
            title={t('roadmap.bugRecorder.stopRecording')}
          >
            <Square className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => setIsMinimized(false)}
            title="Expand"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  // ─── Full dialog ───────────────────────────────────────────────────────────
  return (
    <Dialog open={open && !isMinimized} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center space-x-2">
              <Video className="w-5 h-5" />
              <span>{t('roadmap.bugRecorder.title')}</span>
            </DialogTitle>

            {/* Minimize button — only shown while actively recording */}
            {isActiveRecording && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground -mr-1"
                onClick={() => setIsMinimized(true)}
                title="Minimize"
              >
                <Minimize2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </DialogHeader>

        {renderStepIndicator()}

        {currentStep === 'record' && renderRecordStep()}
        {currentStep === 'processing' && renderProcessingStep()}
        {currentStep === 'review' && renderReviewStep()}

        {/* Dialog Actions */}
        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={currentStep === 'processing'}
          >
            {t('common.cancel')}
          </Button>

          <div className="flex space-x-2">
            {currentStep === 'review' && (
              <>
                <Button
                  variant="outline"
                  onClick={handleReRecord}
                  disabled={createRoadmapItem.isPending}
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  {t('roadmap.bugRecorder.reRecord')}
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!formData.title.trim() || createRoadmapItem.isPending}
                >
                  {createRoadmapItem.isPending ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : null}
                  {t('roadmap.bugRecorder.submit')}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
