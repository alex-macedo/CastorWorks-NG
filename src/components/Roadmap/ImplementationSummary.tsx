import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle2, TrendingUp, Package, Database, FileCode, Download, ChevronDown } from "lucide-react";
import { useState } from "react";
import { CountUp } from "@/components/ui/count-up";

export function ImplementationSummary() {
  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const [metricsOpen, setMetricsOpen] = useState(true);

  const keyMetrics = [
    { label: "Features Delivered", value: 26, icon: Package, color: "text-primary" },
    { label: "Components Created", value: 15, icon: FileCode, color: "text-blue-500" },
    { label: "Database Tables", value: 4, icon: Database, color: "text-green-500" },
    { label: "Pages Added", value: 3, icon: TrendingUp, color: "text-blue-500" },
  ];

  const achievements = [
    {
      title: "Professional Analytics",
      items: [
        "Profitability tracking with ROI calculations",
        "Industry benchmark comparisons",
        "Portfolio-wide and project-specific views"
      ]
    },
    {
      title: "Enhanced Photo Management",
      items: [
        "Category-based organization with 6 categories",
        "Batch upload with drag-drop interface",
        "Mobile camera integration",
        "Secure signed URL access"
      ]
    },
    {
      title: "Progressive Web App",
      items: [
        "Installable on all platforms",
        "Offline support with smart caching",
        "Native app experience"
      ]
    },
    {
      title: "AI-Powered Insights",
      items: [
        "4 insight categories (Financial, Project, Budget, Materials)",
        "Lovable AI integration (Gemini 2.5 Flash)",
        "Cost prediction ML models"
      ]
    },
    {
      title: "Integration Ecosystem",
      items: [
        "Email notifications (Resend)",
        "WhatsApp messaging (Twilio)",
        "Google Calendar sync",
        "Google Drive document storage"
      ]
    }
  ];

  const handleDownloadReport = () => {
    // Create a link to download the ROADMAP_IMPLEMENTATION.md file
    window.open('/ROADMAP_IMPLEMENTATION.md', '_blank');
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <CardTitle className="text-3xl">🎉 Implementation Complete!</CardTitle>
            </div>
            <CardDescription className="text-base">
              All 3 phases delivered with 100% completion rate
            </CardDescription>
          </div>
          <Badge variant="default" className="text-lg px-4 py-2">
            <CountUp end={100} suffix="%" className="font-bold" />
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <Collapsible open={metricsOpen} onOpenChange={setMetricsOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full hover:opacity-80 transition-opacity">
            <h3 className="text-lg font-semibold">Key Metrics</h3>
            <ChevronDown className={`h-5 w-5 transition-transform ${metricsOpen ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {keyMetrics.map((metric) => {
                const Icon = metric.icon;
                return (
                  <div key={metric.label} className="flex flex-col items-center p-4 bg-card rounded-lg border">
                    <Icon className={`h-6 w-6 mb-2 ${metric.color}`} />
                    <CountUp end={metric.value} className="text-2xl font-bold" />
                    <p className="text-xs text-muted-foreground text-center mt-1">{metric.label}</p>
                  </div>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Key Achievements */}
        <Collapsible open={achievementsOpen} onOpenChange={setAchievementsOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full hover:opacity-80 transition-opacity">
            <h3 className="text-lg font-semibold">Key Achievements</h3>
            <ChevronDown className={`h-5 w-5 transition-transform ${achievementsOpen ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4">
            <div className="grid gap-3">
              {achievements.map((achievement) => (
                <div key={achievement.title} className="p-3 bg-card rounded-lg border">
                  <h4 className="font-semibold text-sm mb-2">{achievement.title}</h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {achievement.items.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Download Report */}
        <div className="flex justify-center pt-4">
          <Button onClick={handleDownloadReport} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Download Full Implementation Report
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}