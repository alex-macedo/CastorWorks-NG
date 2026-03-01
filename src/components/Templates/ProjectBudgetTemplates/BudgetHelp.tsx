import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HelpCircle, ExternalLink } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLocalization } from "@/contexts/LocalizationContext";

export const BudgetHelpButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useLocalization();

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
        <HelpCircle className="mr-2 h-4 w-4" />
        {t('budgets:help.button')}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="text-2xl">{t('budgets:help.title')}</DialogTitle>
          </DialogHeader>

          <ScrollArea className="h-[calc(85vh-120px)] pr-4">
            <div className="space-y-6">
              {/* Welcome Section */}
              <section>
                <h3 className="text-lg font-semibold mb-2 text-primary">
                  {t('budgets:help.sections.welcome')}
                </h3>
                <p className="text-muted-foreground">
                  {t('budgets:help.content.welcome')}
                </p>
              </section>

              {/* Data Source Section */}
              <section>
                <h3 className="text-lg font-semibold mb-2 text-primary">
                  {t('budgets:help.sections.dataSource')}
                </h3>
                <p className="text-muted-foreground mb-2">
                  {t('budgets:help.content.dataSource')}
                </p>
                <Button variant="link" className="p-0 h-auto" asChild>
                  <a 
                    href="http://www.caixa.gov.br/poder-publico/modernizacao-gestao/sinapi/Paginas/default.aspx" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    {t('budgets:help.content.accessSinapi')}
                    <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                </Button>
              </section>

              {/* Worksheets Section */}
              <section>
                <h3 className="text-lg font-semibold mb-3 text-primary">
                  {t('budgets:help.sections.worksheets')}
                </h3>
                
                <div className="space-y-3">
                  {/* Overview */}
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h4 className="font-semibold mb-1">{t('budgets:worksheets.sin')}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t('budgets:help.content.overview')}
                    </p>
                  </div>

                  {/* Line Items */}
                  <div className="border-l-4 border-green-500 pl-4">
                    <h4 className="font-semibold mb-1">{t('budgets:worksheets.ins')}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t('budgets:help.content.lineItems')}
                    </p>
                  </div>

                  {/* CPE */}
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h4 className="font-semibold mb-1">{t('budgets:worksheets.cpe')}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t('budgets:help.content.cpe')}
                    </p>
                  </div>

                  {/* Reports */}
                  <div className="border-l-4 border-orange-500 pl-4">
                    <h4 className="font-semibold mb-1">{t('budgets:worksheets.rel')}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t('budgets:help.content.reports')}
                    </p>
                  </div>

                  {/* Dashboard */}
                  <div className="border-l-4 border-red-500 pl-4">
                    <h4 className="font-semibold mb-1">{t('budgets:worksheets.das')}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t('budgets:help.content.dashboard')}
                    </p>
                  </div>
                </div>
              </section>

              {/* How to Fill Out Section */}
              <section>
                <h3 className="text-lg font-semibold mb-2 text-primary">
                  {t('budgets:help.sections.howToFill')}
                </h3>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>{t('budgets:help.content.fillStep1')}</li>
                  <li>{t('budgets:help.content.fillStep2')}</li>
                  <li>{t('budgets:help.content.fillStep3')}</li>
                </ul>
              </section>

              {/* Tips Section */}
              <section className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-2 text-blue-900 dark:text-blue-100">
                  💡 {t('budgets:help.sections.tips')}
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-blue-800 dark:text-blue-200">
                  <li>{t('budgets:help.content.tip1')}</li>
                  <li>{t('budgets:help.content.tip2')}</li>
                  <li>{t('budgets:help.content.tip3')}</li>
                </ul>
              </section>

              {/* Keyboard Shortcuts Section */}
              <section>
                <h3 className="text-lg font-semibold mb-2 text-primary">
                  {t('budgets:help.sections.shortcuts')}
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between items-center p-2 bg-muted rounded">
                    <span>{t('budgets:help.content.shortcut1')}</span>
                    <kbd className="px-2 py-1 bg-background rounded border">Ctrl+S</kbd>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted rounded">
                    <span>{t('budgets:help.content.shortcut2')}</span>
                    <kbd className="px-2 py-1 bg-background rounded border">Ctrl+N</kbd>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted rounded">
                    <span>{t('budgets:help.content.shortcut3')}</span>
                    <kbd className="px-2 py-1 bg-background rounded border">Ctrl+P</kbd>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted rounded">
                    <span>{t('budgets:help.content.shortcut4')}</span>
                    <kbd className="px-2 py-1 bg-background rounded border">Ctrl+E</kbd>
                  </div>
                </div>
              </section>

              {/* Note Section */}
              <section className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <h3 className="text-lg font-semibold mb-2 text-yellow-900 dark:text-yellow-100 flex items-center">
                  ⚠️ {t('budgets:help.sections.important')}
                </h3>
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  {t('budgets:help.content.important')}
                </p>
              </section>
            </div>
          </ScrollArea>

          <div className="flex justify-end pt-4 border-t">
            <Button onClick={() => setIsOpen(false)}>
              {t('common.close')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

