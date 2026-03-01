import { Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useLocalization } from '@/contexts/LocalizationContext';

export function KeyboardShortcutsHelp() {
  const { t } = useLocalization();

  const shortcuts = [
    {
      key: 'Ctrl/Cmd + N',
      description: t('roadmap.shortcuts.newItem'),
    },
    {
      key: 'Ctrl/Cmd + D',
      description: t('roadmap.shortcuts.toggleDependencies'),
    },
    {
      key: 'Ctrl/Cmd + R',
      description: t('roadmap.shortcuts.refresh'),
    },
    {
      key: '←/→',
      description: t('roadmap.shortcuts.navigateColumns'),
    },
    {
      key: '↑/↓',
      description: t('roadmap.shortcuts.navigateItems'),
    },
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="glass-style-white">
          <Keyboard className="mr-2 h-4 w-4" />
          {t('roadmap.shortcuts.title')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('roadmap.shortcuts.title')}</DialogTitle>
          <DialogDescription>
            {t('roadmap.shortcuts.description')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-4">
          {shortcuts.map((shortcut, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
            >
              <span className="text-sm text-muted-foreground">
                {shortcut.description}
              </span>
              <kbd className="px-2 py-1 text-xs font-semibold bg-background border border-border rounded">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
