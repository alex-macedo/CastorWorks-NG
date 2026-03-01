import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, Mic, Upload, Info, Loader2, Sparkles } from 'lucide-react';
import { VoiceRecorder } from '@/components/VoiceInput/VoiceRecorder';
import { useVoiceTranscription } from '@/hooks/useVoiceTranscription';
import { Progress } from '@/components/ui/progress';
import { useLocalization } from '@/contexts/LocalizationContext';

interface Props {
  initialDescription?: string;
  onGenerate: (description: string, files?: File[]) => void;
  onBack?: () => void;
  isGenerating: boolean;
}

export const DescriptionStep = ({
  initialDescription = '',
  onGenerate,
  onBack,
  isGenerating
}: Props) => {
  const { t } = useLocalization();
  const [description, setDescription] = useState(initialDescription);
  const [activeTab, setActiveTab] = useState('text');
  const [hasVoiceInput, setHasVoiceInput] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const { transcription, isTranscribing, progress, transcribe, reset: resetTranscription } = useVoiceTranscription();

  // Update description when transcription completes
  useEffect(() => {
    if (transcription) {
      setDescription((prev) => {
        if (prev.trim()) {
          return `${prev}\n\n${t('estimates.description.voiceInputPrefix')}\n${transcription}`;
        }
        return transcription;
      });
       
      setHasVoiceInput(true);
       
      setActiveTab('text'); // Switch to text tab to show result
      resetTranscription();
    }
  }, [transcription, resetTranscription, t]);

  const handleVoiceRecordingComplete = async (audioBlob: Blob) => {
    try {
      await transcribe(audioBlob);
    } catch (err) {
      // Error handled in hook
      console.error('Transcription error:', err);
    }
  };

  const charCount = description.length;
  const isValid = charCount >= 50 && charCount <= 10000;
  const needsMore = 50 - charCount;

  const handleGenerate = () => {
    if (isValid && !isGenerating) {
      onGenerate(description, selectedFiles.length > 0 ? selectedFiles : undefined);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    const MAX_TOTAL_SIZE = 200 * 1024 * 1024; // 200MB

    // Filter valid files
    const validFiles = files.filter(file => {
      if (file.size > MAX_FILE_SIZE) {
        return false;
      }
      return true;
    });

    // Check total size
    const currentTotal = selectedFiles.reduce((sum, f) => sum + f.size, 0);
    const newTotal = validFiles.reduce((sum, f) => sum + f.size, 0);

    if (currentTotal + newTotal <= MAX_TOTAL_SIZE) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          {t('estimates.description.infoAlert')}
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab} variant="pill">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="text" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {t('estimates.description.tabs.text')}
          </TabsTrigger>
          <TabsTrigger value="voice" className="flex items-center gap-2">
            <Mic className="h-4 w-4" />
            {t('estimates.description.tabs.voice')}
            {hasVoiceInput && (
              <Badge variant="default" className="ml-1 text-xs">{t('estimates.description.voiceAdded')}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="files" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            {t('estimates.description.tabs.files')}
            {selectedFiles.length > 0 && (
              <Badge variant="default" className="ml-1 text-xs">{selectedFiles.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="text" className="space-y-4">
          <div>
            <Textarea
              placeholder={t('estimates.description.textPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={14}
              className="resize-none font-mono text-sm"
              disabled={isGenerating}
            />
            <div className="flex justify-between items-center text-sm mt-2">
              <div>
                {needsMore > 0 && (
                  <span className="text-destructive font-medium">
                    {t('estimates.description.minChars')} ({t('estimates.description.needsMore', { count: needsMore })})
                  </span>
                )}
                {charCount >= 50 && charCount <= 10000 && (
                  <span className="text-green-600 font-medium flex items-center gap-1">
                    <span className="inline-block w-2 h-2 bg-green-600 rounded-full"></span>
                    {t('estimates.description.charCount', { count: charCount })}
                  </span>
                )}
                {charCount > 10000 && (
                  <span className="text-destructive font-medium">
                    {t('estimates.description.maxChars')}
                  </span>
                )}
              </div>
              <span className="text-muted-foreground">
                {charCount.toLocaleString()} / 10,000
              </span>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-muted/50 p-4 rounded-lg border">
            <h4 className="font-semibold text-sm mb-2">{t('estimates.description.textTips.title')}</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• {t('estimates.description.textTips.beSpecific')}</li>
              <li>• {t('estimates.description.textTips.includeSize')}</li>
              <li>• {t('estimates.description.textTips.mentionQuality')}</li>
              <li>• {t('estimates.description.textTips.noteConstraints')}</li>
            </ul>
          </div>
        </TabsContent>

        <TabsContent value="voice" className="space-y-4">
          {isTranscribing ? (
            <div className="space-y-4">
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  {t('estimates.description.transcribing')}
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{t('estimates.description.processingAudio')}</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            </div>
          ) : (
            <VoiceRecorder
              onRecordingComplete={handleVoiceRecordingComplete}
              maxDurationSeconds={600} // 10 minutes
              disabled={isGenerating}
            />
          )}

          {hasVoiceInput && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                {t('estimates.description.voiceInputAdded')}
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="files" className="space-y-4">
          {/* AI Feature Notice */}
          <Alert>
            <Sparkles className="h-4 w-4 text-blue-500" />
            <AlertDescription>
              <strong>AI-Powered Document Analysis</strong> - Upload photos, PDFs, or documents.
              Our AI will automatically extract dimensions, materials, quantities, and other relevant information
              to help generate your estimate.
            </AlertDescription>
          </Alert>

          {/* File Upload Zone */}
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <input
                type="file"
                id="file-upload"
                multiple
                accept="image/*,.pdf,video/*,audio/*"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isGenerating}
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">
                  Click to upload files
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Supported: Images (JPG, PNG, HEIC), PDFs, Videos, Audio
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Badge variant="outline">Images</Badge>
                  <Badge variant="outline">PDF</Badge>
                  <Badge variant="outline">Video</Badge>
                  <Badge variant="outline">Audio</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  Max 50MB per file, 200MB total
                </p>
              </label>
            </div>

            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
              <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">
                    Selected Files ({selectedFiles.length})
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFiles([])}
                    disabled={isGenerating}
                  >
                    Clear All
                  </Button>
                </div>
                <div className="space-y-2">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-background rounded border"
                    >
                      {file.type.startsWith('image/') ? (
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="h-10 w-10 object-cover rounded"
                        />
                      ) : (
                        <div className="h-10 w-10 flex items-center justify-center bg-muted rounded">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFile(index)}
                        disabled={isGenerating}
                        className="h-8 w-8"
                      >
                        <Upload className="h-4 w-4 rotate-180" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    These files will be uploaded and analyzed by AI after you click "Generate Estimate".
                    The AI will extract relevant information like dimensions, materials, and quantities.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex gap-3">
        {onBack && (
          <Button
            onClick={onBack}
            variant="outline"
            disabled={isGenerating}
            className="flex-1"
          >
            {t('estimates.description.backButton')}
          </Button>
        )}
        <Button
          onClick={handleGenerate}
          disabled={!isValid || isGenerating}
          className="flex-1"
          size="lg"
        >
          {isGenerating ? (
            <span className="flex items-center gap-2">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"></span>
              {t('common.generating')}
            </span>
          ) : (
            t('estimates.description.generateButton')
          )}
        </Button>
      </div>
    </div>
  );
};
