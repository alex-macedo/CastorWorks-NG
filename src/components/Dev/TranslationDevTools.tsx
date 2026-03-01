/**
 * Translation Dev Tools - Development-only UI for managing missing translations
 *
 * This component provides a floating widget in development mode that shows:
 * - Number of missing translations tracked
 * - Button to generate translations
 * - Button to download generated JSON files
 * - Button to copy translations to clipboard
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, Copy, Trash2, Languages, X, ChevronUp, ChevronDown, Save } from 'lucide-react';
import {
  getMissingKeys,
  clearMissingKeys,
  generateMissingKeysReport,
  formatMissingKeysAsJSON,
} from '@/utils/translationGenerator';
import { useToast } from '@/hooks/use-toast';

export function TranslationDevToolsInner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [missingCount, setMissingCount] = useState(0);
  const { toast } = useToast();

  // Update missing count every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setMissingCount(getMissingKeys().length);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Auto-show when missing keys detected
  useEffect(() => {
    if (missingCount > 0 && !isVisible) {
      setIsVisible(true);
    }
  }, [missingCount, isVisible]);

  const handleGenerateReport = () => {
    const report = generateMissingKeysReport();
    console.log(report);
    toast({
      title: 'Translation Report Generated',
      description: 'Check the browser console for the full report',
    });
  };

  const handleCopyJSON = async () => {
    const json = formatMissingKeysAsJSON();
    const jsonString = JSON.stringify(json, null, 2);

    try {
      await navigator.clipboard.writeText(jsonString);
      toast({
        title: 'Copied to Clipboard',
        description: `Translation JSON for ${missingCount} keys copied`,
      });
    } catch (err) {
      toast({
        title: 'Copy Failed',
        description: 'Could not copy to clipboard. Check console for output.',
        variant: 'destructive',
      });
      console.log(jsonString);
    }
  };

  const handleDownload = () => {
    const json = formatMissingKeysAsJSON();

    for (const [namespace, translations] of Object.entries(json)) {
      for (const [language, content] of Object.entries(translations)) {
        const fileName = `${namespace}_${language}_missing.json`;
        const blob = new Blob([JSON.stringify(content, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
      }
    }

    toast({
      title: 'Files Downloaded',
      description: `Downloaded translation files for ${missingCount} missing keys`,
    });
  };

  const handleSaveToFiles = async () => {
    const json = formatMissingKeysAsJSON();
    const namespaces = Object.keys(json);

    if (namespaces.length === 0) {
      toast({
        title: 'No Translations',
        description: 'No missing translations to save',
        variant: 'destructive',
      });
      return;
    }

    const API_URL = 'http://localhost:3001/api/translations/save';
    let successCount = 0;
    let errorCount = 0;

    for (const namespace of namespaces) {
      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            namespace,
            translations: json[namespace],
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        if (result.success) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        console.error(`Failed to save ${namespace}:`, error);
        errorCount++;
      }
    }

    if (errorCount > 0) {
      toast({
        title: 'Partially Saved',
        description: `${successCount} namespaces saved, ${errorCount} failed. Is the translation API running?`,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Saved to Files! ✅',
        description: `${successCount} namespace(s) automatically saved to locale files`,
      });
      // Clear after successful save
      clearMissingKeys();
      setMissingCount(0);
    }
  };

  const handleClear = () => {
    clearMissingKeys();
    setMissingCount(0);
    toast({
      title: 'Cleared',
      description: 'All tracked missing translations cleared',
    });
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-[9999]">
      <Card className="w-80 shadow-2xl border-2 border-primary/50">
        <CardHeader className="pb-3 bg-gradient-to-r from-primary/10 to-primary/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Languages className="h-5 w-5 text-primary" />
              <CardTitle className="text-sm font-semibold">Translation Dev Tools</CardTitle>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setIsVisible(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Missing Keys:</span>
              <Badge variant={missingCount > 0 ? 'destructive' : 'secondary'}>
                {missingCount}
              </Badge>
            </div>

            {missingCount > 0 && (
              <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                <strong>Tip:</strong> Missing translations are automatically tracked. Generate
                translations and copy the JSON to your locale files.
              </div>
            )}

            <div className="space-y-2">
              <Button
                size="sm"
                variant="default"
                className="w-full justify-start gap-2 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600"
                onClick={handleSaveToFiles}
                disabled={missingCount === 0}
              >
                <Save className="h-4 w-4" />
                Save to Files (Auto)
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={handleGenerateReport}
                disabled={missingCount === 0}
              >
                <Languages className="h-4 w-4" />
                Generate Report (Console)
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={handleCopyJSON}
                disabled={missingCount === 0}
              >
                <Copy className="h-4 w-4" />
                Copy JSON to Clipboard
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={handleDownload}
                disabled={missingCount === 0}
              >
                <Download className="h-4 w-4" />
                Download JSON Files
              </Button>

              <Button
                size="sm"
                variant="destructive"
                className="w-full justify-start gap-2"
                onClick={handleClear}
                disabled={missingCount === 0}
              >
                <Trash2 className="h-4 w-4" />
                Clear Tracked Keys
              </Button>
            </div>

            <div className="text-xs text-muted-foreground pt-2 border-t">
              <p className="mb-1">Console commands:</p>
              <code className="text-xs bg-muted px-1 py-0.5 rounded block mb-1">
                window.generateMissingTranslations()
              </code>
              <code className="text-xs bg-muted px-1 py-0.5 rounded block">
                window.clearMissingTranslations()
              </code>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

// Wrapper to avoid calling hooks conditionally when linting
export function TranslationDevTools() {
  if (import.meta.env.PROD) {
    return null;
  }
  return <TranslationDevToolsInner />;
}
