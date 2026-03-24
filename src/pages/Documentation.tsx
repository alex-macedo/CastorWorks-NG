import { useNavigate } from "react-router-dom";
import { BookText, FileText, TestTube, ChevronRight, Eye, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useLocalization } from "@/contexts/LocalizationContext";
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";
import { useSprints } from "@/hooks/useSprints";
import { useHasRole } from "@/hooks/useUserRoles";

interface DocumentSection {
  title: string;
  description: string;
  items: DocumentItem[];
}

interface DocumentItem {
  name: string;
  description: string;
  path: string;
  category?: string;
}

export default function Documentation() {
  const navigate = useNavigate();
  const { language, t } = useLocalization();
  const { data: sprints = [] } = useSprints();
  const isAdmin = useHasRole('admin');
  const closedSprints = sprints.filter((s) => s.status === 'closed');

  // Map language codes to documentation paths
  const getLocalizedPath = (basePath: string) => {
    const langMap: Record<string, string> = {
      'pt-BR': 'pt-BR',
      'es-ES': 'es-ES',
      'fr-FR': 'fr-FR',
      'en-US': ''
    };
    const langPath = langMap[language] || '';
    return langPath ? basePath.replace('/docs/', `/docs/${langPath}/`) : basePath;
  };

  // User Guides Documentation
  const userGuides: DocumentSection = {
    title: t("documentation.sections.userGuides.title"),
    description: t("documentation.sections.userGuides.description"),
    items: [
      {
        name: t("documentation.documents.budgetGuide.name"),
        description: t("documentation.documents.budgetGuide.description"),
        path: getLocalizedPath("/docs/user-guides/budget-guide.md"),
        category: t("documentation.categories.projectManagers")
      },
      {
        name: t("documentation.documents.sinapiGuide.name"),
        description: t("documentation.documents.sinapiGuide.description"),
        path: getLocalizedPath("/docs/user-guides/Guide-SINAPI-Brazil.md"),
        category: t("documentation.categories.projectManagers")
      },
      {
        name: t("documentation.documents.supervisorGuide.name"),
        description: t("documentation.documents.supervisorGuide.description"),
        path: getLocalizedPath("/docs/user-guides/supervisor-delivery-confirmation-guide.md"),
        category: t("documentation.categories.supervisors")
      },
      {
        name: t("documentation.documents.adminPaymentGuide.name"),
        description: t("documentation.documents.adminPaymentGuide.description"),
        path: getLocalizedPath("/docs/user-guides/admin-payment-processing-guide.md"),
        category: t("documentation.categories.accountants")
      },
      {
        name: t("documentation.documents.supplierAckGuide.name"),
        description: t("documentation.documents.supplierAckGuide.description"),
        path: getLocalizedPath("/docs/user-guides/supplier-po-acknowledgment-guide.md"),
        category: t("documentation.categories.suppliers")
      },
      {
        name: t("documentation.documents.pmAckGuide.name"),
        description: t("documentation.documents.pmAckGuide.description"),
        path: getLocalizedPath("/docs/user-guides/pm-po-acknowledgment-guide.md"),
        category: t("documentation.categories.projectManagers")
      },
      {
        name: t("documentation.documents.calendarGuide.name"),
        description: t("documentation.documents.calendarGuide.description"),
        path: getLocalizedPath("/docs/user-guides/project-calendar-guide.md"),
        category: t("documentation.categories.projectManagers")
      },
      {
        name: t("documentation.documents.constructionPMAISkillGuide.name"),
        description: t("documentation.documents.constructionPMAISkillGuide.description"),
        path: getLocalizedPath("/docs/user-guides/construction-pm-ai-skill-user-guide.md"),
        category: t("documentation.categories.aiFeatures")
      },
      {
        name: t("documentation.documents.inssStrategyGuide.name"),
        description: t("documentation.documents.inssStrategyGuide.description"),
        path: getLocalizedPath("/docs/user-guides/inss-strategy-planning-guide.md"),
        category: t("documentation.categories.projectManagers")
      },
      {
        name: t("documentation.documents.benchmarkGuide.name"),
        description: t("documentation.documents.benchmarkGuide.description"),
        path: getLocalizedPath("/docs/user-guides/benchmark-cost-analysis-guide.md"),
        category: t("documentation.categories.projectManagers")
      },
      {
        name: t("documentation.documents.timelineAnalyticsGuide.name"),
        description: t("documentation.documents.timelineAnalyticsGuide.description"),
        path: getLocalizedPath("/docs/user-guides/timeline-analytics-guide.md"),
        category: t("documentation.categories.projectManagers")
      },
      {
        name: t("documentation.documents.financialPaymentGuide.name"),
        description: t("documentation.documents.financialPaymentGuide.description"),
        path: getLocalizedPath("/docs/user-guides/financial-payment-links-guide.md"),
        category: t("documentation.categories.accountants")
      },
      {
        name: t("documentation.documents.whatsappGuide.name"),
        description: t("documentation.documents.whatsappGuide.description"),
        path: getLocalizedPath("/docs/user-guides/whatsapp-integration-guide.md"),
        category: t("documentation.categories.aiFeatures")
      },
    ]
  };

  // Technical Documentation (static + Release Notes from closed sprints)
  const technicalDocsStatic: DocumentItem[] = [
    {
      name: t("documentation.documents.deploymentGuide.name"),
      description: t("documentation.documents.deploymentGuide.description"),
      path: "/docs/deployment/deployment-guide.md",
      category: t("documentation.categories.devOps")
    },
    {
      name: t("documentation.documents.prEpic4Summary.name"),
      description: t("documentation.documents.prEpic4Summary.description"),
      path: "/docs/PR-EPIC-4-SUMMARY.md",
      category: t("documentation.categories.development")
    },
    {
      name: t("documentation.documents.signaturePad.name"),
      description: t("documentation.documents.signaturePad.description"),
      path: "/docs/components/signature-pad.md",
      category: t("documentation.categories.components")
    },
    {
      name: t("documentation.documents.sprintStatus.name"),
      description: t("documentation.documents.sprintStatus.description"),
      path: "/docs/sprint-status.yaml",
      category: t("documentation.categories.projectManagement")
    }
  ];
  const releaseNotesItems: DocumentItem[] = closedSprints.map((s) => ({
    name: t("documentation.documents.sprintReleaseNotes.name", { sprint: s.sprint_identifier }),
    description: t("documentation.documents.sprintReleaseNotes.description", { sprint: s.sprint_identifier, title: s.title }),
    path: `sprint-release-notes:${s.id}`,
    category: t("documentation.documents.sprintReleaseNotes.category")
  }));
  const technicalDocs: DocumentSection = {
    title: t("documentation.sections.technical.title"),
    description: t("documentation.sections.technical.description"),
    items: [...releaseNotesItems, ...technicalDocsStatic]
  };

  // Test Documentation
  const testDocs: DocumentSection = {
    title: t("documentation.sections.tests.title"),
    description: t("documentation.sections.tests.description"),
    items: [
      {
        name: t("documentation.documents.deliveryTests.name"),
        description: t("documentation.documents.deliveryTests.description"),
        path: "/tests/e2e/delivery-confirmation-workflow.test.md",
        category: t("documentation.categories.testing")
      },
      {
        name: t("documentation.documents.paymentTests.name"),
        description: t("documentation.documents.paymentTests.description"),
        path: "/tests/e2e/payment-processing-workflow.test.md",
        category: t("documentation.categories.testing")
      },
      {
        name: t("documentation.documents.supplierTests.name"),
        description: t("documentation.documents.supplierTests.description"),
        path: "/tests/e2e/supplier-acknowledgment-workflow.test.md",
        category: t("documentation.categories.testing")
      }
    ]
  };

  // Architecture Documentation
  const architectureDocs: DocumentSection = {
    title: t("documentation.sections.architecture.title"),
    description: t("documentation.sections.architecture.description"),
    items: [
      {
        name: t("documentation.documents.architectureOverview.name"),
        description: t("documentation.documents.architectureOverview.description"),
        path: "/docs/ARCHITECTURE_OVERVIEW.md",
        category: t("documentation.categories.architecture")
      },
      {
        name: t("documentation.documents.codebaseAnalysis.name"),
        description: t("documentation.documents.codebaseAnalysis.description"),
        path: "/docs/CODEBASE_ANALYSIS.md",
        category: t("documentation.categories.architecture")
      },
      {
        name: t("documentation.documents.prd.name"),
        description: t("documentation.documents.prd.description"),
        path: "/docs/PRD.md",
        category: t("documentation.categories.product")
      },
      {
        name: t("documentation.documents.procurementRequirements.name"),
        description: t("documentation.documents.procurementRequirements.description"),
        path: "/docs/PROCUREMENT_MODULE_REQUIREMENTS.md",
        category: t("documentation.categories.product")
      },
      {
        name: t("documentation.documents.procurementEpics.name"),
        description: t("documentation.documents.procurementEpics.description"),
        path: "/docs/procurement-epics.md",
        category: t("documentation.categories.product")
      },
      {
        name: t("documentation.documents.roadmapImplementation.name"),
        description: t("documentation.documents.roadmapImplementation.description"),
        path: "/docs/ROADMAP_IMPLEMENTATION.md",
        category: t("documentation.categories.planning")
      }
    ]
  };

  // AI Features Documentation
  const aiFeaturesDocs: DocumentSection = {
    title: t("documentation.sections.aiFeatures.title"),
    description: t("documentation.sections.aiFeatures.description"),
    items: [
      {
        name: t("documentation.documents.aiFeatures.name"),
        description: t("documentation.documents.aiFeatures.description"),
        path: getLocalizedPath("/docs/user-guides/ai-features-guide.md"),
        category: t("documentation.categories.aiFeatures")
      }
    ]
  };

  const handleViewDocument = (name: string, path: string) => {
    navigate(`/documentation/viewer?path=${encodeURIComponent(path)}&name=${encodeURIComponent(name)}`);
  };

  const visibleTabs = [
    {
      value: 'user-guides',
      icon: FileText,
      label: t('documentation.tabs.userGuides'),
      section: userGuides,
    },
    ...(isAdmin
      ? [
          {
            value: 'ai-features',
            icon: Sparkles,
            label: t('documentation.tabs.aiFeatures'),
            section: aiFeaturesDocs,
          },
          {
            value: 'technical',
            icon: BookText,
            label: t('documentation.tabs.technical'),
            section: technicalDocs,
          },
          {
            value: 'tests',
            icon: TestTube,
            label: t('documentation.tabs.tests'),
            section: testDocs,
          },
          {
            value: 'architecture',
            icon: ChevronRight,
            label: t('documentation.tabs.architecture'),
            section: architectureDocs,
          },
        ]
      : []),
  ];

  const renderDocumentList = (section: DocumentSection) => (
    <div className="space-y-4">
      <div className="mb-6">
        <h3 className="text-lg font-semibold">{section.title}</h3>
        <p className="text-sm text-muted-foreground">{section.description}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {section.items.map((item, index) => (
          <Card key={index} className="hover:border-primary transition-colors flex flex-col">
            <CardHeader className="flex-1">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 flex-shrink-0" />
                    <span className="line-clamp-2">{item.name}</span>
                  </CardTitle>
                </div>
                {item.category && (
                  <Badge variant="secondary" className="w-fit">
                    {item.category}
                  </Badge>
                )}
                <CardDescription className="line-clamp-3">
                  {item.description}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => handleViewDocument(item.name, item.path)}
              >
                <Eye className="h-4 w-4 mr-1" />
                {t("documentation.buttons.view")}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex-1 space-y-6">
      <SidebarHeaderShell>
<div className="flex items-center justify-between"><div>
          <h1 className="text-2xl font-bold">{t("documentation.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("documentation.subtitle")}</p>
        </div>
      </div>
</SidebarHeaderShell>

      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>{t("documentation.stats.userGuides")}</CardDescription>
              <CardTitle className="text-3xl">7</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {t("documentation.stats.userGuidesDesc")}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>{t("documentation.stats.testCases")}</CardDescription>
              <CardTitle className="text-3xl">35</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {t("documentation.stats.testCasesDesc")}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>{t("documentation.stats.technicalDocs")}</CardDescription>
              <CardTitle className="text-3xl">10+</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {t("documentation.stats.technicalDocsDesc")}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>{t("documentation.stats.storiesComplete")}</CardDescription>
              <CardTitle className="text-3xl">40/40</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {t("documentation.stats.storiesCompleteDesc")}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="user-guides" variant="pill" className="space-y-6">
        <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-5' : 'grid-cols-1'}`}>
          {visibleTabs.map((tab) => {
            const Icon = tab.icon

            return (
              <TabsTrigger key={tab.value} value={tab.value}>
                <Icon className="h-4 w-4 mr-2" />
                {tab.label}
              </TabsTrigger>
            )
          })}
        </TabsList>

        {visibleTabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            <ScrollArea className="h-[600px] pr-4">
              {renderDocumentList(tab.section)}
            </ScrollArea>
          </TabsContent>
        ))}
      </Tabs>

      {isAdmin && (
        <>
          <Separator className="my-8" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("documentation.quickAccess.title")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleViewDocument(
                    t("documentation.documents.supervisorGuide.name"),
                    getLocalizedPath("/docs/user-guides/supervisor-delivery-confirmation-guide.md")
                  )}
                >
                  👷 {t("documentation.quickAccess.supervisors")}
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleViewDocument(
                    t("documentation.documents.adminPaymentGuide.name"),
                    getLocalizedPath("/docs/user-guides/admin-payment-processing-guide.md")
                  )}
                >
                  💰 {t("documentation.quickAccess.accountants")}
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleViewDocument(
                    t("documentation.documents.supplierAckGuide.name"),
                    getLocalizedPath("/docs/user-guides/supplier-po-acknowledgment-guide.md")
                  )}
                >
                  📦 {t("documentation.quickAccess.suppliers")}
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleViewDocument(
                    t("documentation.documents.budgetGuide.name"),
                    getLocalizedPath("/docs/user-guides/project-budget-expenses-guide.md")
                  )}
                >
                  📊 {t("documentation.documents.budgetGuide.name")} (PM)
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleViewDocument(
                    t("documentation.documents.pmAckGuide.name"),
                    getLocalizedPath("/docs/user-guides/pm-po-acknowledgment-guide.md")
                  )}
                >
                  👔 {t("documentation.quickAccess.projectManagers")}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("documentation.implementationInfo.title")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t("documentation.implementationInfo.filesChanged")}</span>
                  <Badge>19 files</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t("documentation.implementationInfo.linesOfCode")}</span>
                  <Badge>~4,200 LOC</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t("documentation.implementationInfo.newRoutes")}</span>
                  <Badge>9 routes</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t("documentation.implementationInfo.documentation")}</span>
                  <Badge>~2,500 lines</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
