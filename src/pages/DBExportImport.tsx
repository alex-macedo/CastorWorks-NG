import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

import { useLocalization } from "@/contexts/LocalizationContext";
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";

const execCommand = async (cmd: string) => {
  // Call the secure Supabase Edge Function which verifies admin role
  const { data, error } = await supabase.functions.invoke(cmd === 'export' ? 'export-database-dump' : 'import-database-dump', {
    body: {},
  });

  if (error) {
    throw new Error(error.message || 'Function invocation failed');
  }

  return data;
};

export default function DBExportImport() {
  const [logs, setLogs] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const { t } = useLocalization();

  const appendLog = (line: string) => setLogs(prev => [...prev, line]);

  const handleExport = async () => {
    setBusy(true);
    appendLog('Starting export...');
    try {
      const result = await execCommand('export');
      appendLog(JSON.stringify(result));
      toast({ title: t('toast.exportTriggered') });
    } catch (err) {
      appendLog('Export failed: ' + (err as Error).message);
      toast({ title: t('toast.exportFailed'), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async () => {
    setBusy(true);
    appendLog('Starting import...');
    try {
      const result = await execCommand('import');
      appendLog(JSON.stringify(result));
      toast({ title: t('toast.importTriggered') });
    } catch (err) {
      appendLog('Import failed: ' + (err as Error).message);
      toast({ title: t('toast.importFailed'), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <SidebarHeaderShell>
<div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Database Export / Import</h1>

      <div className="flex gap-4 mb-6">
        <Button onClick={handleExport} disabled={busy}>{t("buttons.export")}</Button>
        <Button onClick={handleImport} disabled={busy}>{t("buttons.import")}</Button>
      </div>

      <Card>
        <div className="p-4 h-64 overflow-auto font-mono text-sm">
          {logs.length === 0 ? <div className="text-muted-foreground">{t('toast.noActivityYet')}</div> : (
            logs.map((l, idx) => <div key={idx}>{l}</div>)
          )}
        </div>
      </Card>
    </div>
</SidebarHeaderShell>
  );
}
