import { useState, useEffect } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { 
  ChevronLeft, 
  BookText, 
  Printer, 
  Share2, 
  Download, 
  Clock, 
  FileText,
  Loader2,
  AlertCircle,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useLocalization } from "@/contexts/LocalizationContext";
import { formatDate } from "@/utils/reportFormatters";
import ReactMarkdown from "react-markdown";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useHasRole } from "@/hooks/useUserRoles";

const ADMIN_ONLY_DOC_PATH_PREFIXES = [
  '/docs/deployment/',
  '/docs/PR-EPIC-4-SUMMARY.md',
  '/docs/components/signature-pad.md',
  '/docs/sprint-status.yaml',
  '/tests/e2e/',
  '/docs/ARCHITECTURE_OVERVIEW.md',
  '/docs/CODEBASE_ANALYSIS.md',
  '/docs/PRD.md',
  '/docs/PROCUREMENT_MODULE_REQUIREMENTS.md',
  '/docs/procurement-epics.md',
  '/docs/ROADMAP_IMPLEMENTATION.md',
]

const isAdminOnlyDocPath = (docPath: string | null) => {
  if (!docPath) return false
  if (docPath.startsWith('sprint-release-notes:')) return true
  return ADMIN_ONLY_DOC_PATH_PREFIXES.some((prefix) => docPath.startsWith(prefix))
}

export default function DocumentViewer() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [docContent, setDocContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toc, setToc] = useState<{ id: string; text: string; level: number }[]>([]);
  const [readingProgress, setReadingProgress] = useState(0);
  const { t, dateFormat } = useLocalization();
  const isAdmin = useHasRole('admin');
  
  const docPath = searchParams.get("path");
  const docName = searchParams.get("name") || t("documentation.preview.title");
  const isSprintReleaseNotes = docPath?.startsWith('sprint-release-notes:') ?? false;

  useEffect(() => {
    const handleScroll = () => {
      const element = document.querySelector('main');
      if (element) {
        const totalHeight = element.scrollHeight - element.clientHeight;
        const windowScrollTop = element.scrollTop;
        if (windowScrollTop === 0) return setReadingProgress(0);
        if (windowScrollTop > totalHeight) return setReadingProgress(100);
        setReadingProgress((windowScrollTop / totalHeight) * 100);
      }
    };

    const mainElement = document.querySelector('main');
    mainElement?.addEventListener("scroll", handleScroll);
    return () => mainElement?.removeEventListener("scroll", handleScroll);
  }, [loading]);

  useEffect(() => {
    const fetchDocument = async () => {
      if (!docPath) {
        setError(t("documentation.preview.errorLoading"));
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        if (!isAdmin && isAdminOnlyDocPath(docPath)) {
          throw new Error(t('contentHub.errors.accessDenied'))
        }

        let content: string;
        const sprintReleaseNotesPrefix = 'sprint-release-notes:';
        if (docPath.startsWith(sprintReleaseNotesPrefix)) {
          const sprintId = docPath.slice(sprintReleaseNotesPrefix.length);
          const { data, error: fetchError } = await supabase
            .from('sprints')
            .select('release_notes')
            .eq('id', sprintId)
            .single();
          if (fetchError || !data?.release_notes) {
            throw new Error(t("documentation.preview.errorLoading"));
          }
          content = data.release_notes;
        } else {
          const response = await fetch(docPath);
          if (!response.ok) {
            throw new Error(t("documentation.preview.errorLoading"));
          }
          content = await response.text();
        }
        setDocContent(content);

        const headingLines = content.split('\n').filter(line => line.startsWith('#'));
        const generatedToc = headingLines.map(line => {
          const level = line.match(/^#+/)?.[0].length || 0;
          const text = line.replace(/^#+\s*/, '').trim();
          const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
          return { id, text, level };
        }).filter(h => h.level > 1 && h.level < 4);
        setToc(generatedToc);
      } catch (err) {
        console.error("Error loading document:", err);
        setError(err instanceof Error ? err.message : t("documentation.preview.errorLoading"));
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [docPath, isAdmin, t]);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: docName,
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      // Optional: Add a toast notification here
    }
  };

  return (
    <div className="flex flex-col h-full bg-background print:bg-white">
      {/* Header */}
      <header className="sticky top-0 z-20 w-full border-b border-sidebar-border bg-gradient-to-br from-sidebar-primary via-sidebar-primary/95 to-sidebar text-sidebar-primary-foreground print:hidden">
        {/* Reading Progress Bar */}
        <div 
          className="absolute bottom-0 left-0 h-[2px] bg-sidebar-primary-foreground/90 transition-all duration-150 ease-out" 
          style={{ width: `${readingProgress}%` }}
        />
        <div className="container flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate("/documentation")}
              className="text-sidebar-primary-foreground hover:bg-sidebar-primary-foreground/10"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              {t("common.back")}
            </Button>
            <Separator orientation="vertical" className="h-6 bg-sidebar-primary-foreground/30" />
            <div className="flex items-center gap-2">
              <BookText className="h-4 w-4 text-sidebar-primary-foreground/80" />
              <h1 className="text-sm font-semibold truncate max-w-[200px] md:max-w-md">
                {docName}
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrint}
              title={t("documentation.buttons.print") || "Print"}
              className="text-sidebar-primary-foreground hover:bg-sidebar-primary-foreground/10"
            >
              <Printer className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              title={t("documentation.buttons.share") || "Share"}
              className="text-sidebar-primary-foreground hover:bg-sidebar-primary-foreground/10"
            >
              <Share2 className="h-4 w-4" />
            </Button>
            {!isSprintReleaseNotes && (
              <a
                href={docPath || "#"}
                download
                title={t("documentation.buttons.download") || "Download"}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md text-sm font-medium text-sidebar-primary-foreground ring-offset-sidebar transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-sidebar-primary-foreground/10"
              >
                <Download className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto bg-slate-50/50 dark:bg-slate-950/20 print:bg-white print:pt-0">
        <div className="container max-w-7xl mx-auto py-8 px-4 flex flex-col lg:flex-row gap-8">
          {/* Sidebar TOC - Visible on Desktop */}
          {toc.length > 0 && (
            <aside className="hidden lg:block w-64 shrink-0 space-y-4 print:hidden">
              <div className="sticky top-24">
                <h4 className="text-sm font-semibold mb-4 uppercase tracking-wider text-muted-foreground">
                  Table of Contents
                </h4>
                <nav className="space-y-1">
                  {toc.map((item, idx) => (
                    <a
                      key={idx}
                      href={`#${item.id}`}
                      className={`block text-sm py-1.5 transition-colors border-l-2 hover:text-primary ${
                        item.level === 3 ? 'pl-6 border-transparent' : 'pl-4 border-transparent hover:border-primary/30'
                      }`}
                    >
                      {item.text}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>
          )}

          <div className="flex-1 max-w-4xl space-y-8">
            {/* Breadcrumbs for professional look */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground print:hidden">
              <span>{t("documentation.title")}</span>
              <ChevronLeft className="h-3 w-3 rotate-180" />
              <span className="font-medium text-foreground">{docName}</span>
            </div>

            <Card className="border-none shadow-sm print:shadow-none">
              <CardContent className="p-8 md:p-12 print:p-0">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-4">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="text-muted-foreground animate-pulse">{t("documentation.preview.loading")}</p>
                </div>
              ) : error ? (
                <Alert variant="destructive" className="my-12">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{t("common.errorTitle") || "Error"}</AlertTitle>
                  <AlertDescription>
                    {error}
                  </AlertDescription>
                  <div className="mt-4">
                    <Button variant="outline" size="sm" onClick={() => navigate("/documentation")}>
                      {t("common.back")}
                    </Button>
                  </div>
                </Alert>
              ) : (
                <div className="animate-in fade-in duration-500">
                  {/* Doc Metadata Section */}
                  <div className="mb-10 space-y-4 border-b pb-8 print:mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="rounded-sm">
                        {t("documentation.implementationInfo.documentation")}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(new Date(), dateFormat)}
                      </span>
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
                      {docName}
                    </h1>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        <span>Markdown</span>
                      </div>
                      {!isSprintReleaseNotes && (
                        <>
                          <Separator orientation="vertical" className="h-4" />
                          <a
                            href={docPath || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 hover:text-primary transition-colors underline-offset-4 hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {t("documentation.buttons.viewRaw") || "View Source"}
                          </a>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Main Content Area */}
                  <div className="prose prose-slate dark:prose-invert max-w-none 
                    prose-headings:scroll-m-20 prose-headings:font-bold 
                    prose-h1:text-3xl prose-h2:text-2xl prose-h2:border-b prose-h2:pb-2
                    prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                    prose-blockquote:border-l-4 prose-blockquote:border-primary/50 prose-blockquote:bg-muted/30 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:italic
                    prose-img:rounded-xl prose-img:shadow-lg
                    prose-pre:bg-slate-900 prose-pre:p-4 prose-pre:rounded-lg
                    print:prose-slate">
                    <ReactMarkdown
                      components={{
                        h2: ({ children }) => {
                          const text = Array.isArray(children) 
                            ? children.map(c => typeof c === 'string' ? c : '').join('')
                            : typeof children === 'string' ? children : '';
                          const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
                          return <h2 id={id}>{children}</h2>;
                        },
                        h3: ({ children }) => {
                          const text = Array.isArray(children) 
                            ? children.map(c => typeof c === 'string' ? c : '').join('')
                            : typeof children === 'string' ? children : '';
                          const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
                          return <h3 id={id}>{children}</h3>;
                        }
                      }}
                    >
                      {docContent}
                    </ReactMarkdown>
                  </div>
                  
                  {/* Footer note */}
                  <Separator className="my-12 print:hidden" />
                  <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground print:hidden">
                    <p>© {new Date().getFullYear()} CastorWorks. All rights reserved.</p>
                    <div className="flex items-center gap-4">
                      <button onClick={handlePrint} className="hover:text-foreground underline underline-offset-2">Print version</button>
                      <button onClick={handleShare} className="hover:text-foreground underline underline-offset-2">Copy link</button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      </main>
    </div>
  );
}
