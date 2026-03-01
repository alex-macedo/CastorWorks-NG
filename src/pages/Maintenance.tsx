import { Wrench, Clock, Mail } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocalization } from "@/contexts/LocalizationContext";

export default function Maintenance() {
  const { t } = useLocalization();
  const estimatedTime = import.meta.env.VITE_MAINTENANCE_ESTIMATED_TIME || "a few hours";
  const contactEmail = import.meta.env.VITE_MAINTENANCE_CONTACT_EMAIL || "support@engproapp.com";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted">
      <Card className="w-full max-w-2xl shadow-2xl border-border/50">
        <CardHeader className="text-center space-y-6 pb-8">
          <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
            <Wrench className="h-10 w-10 text-primary" />
          </div>
          <div className="space-y-3">
            <CardTitle className="text-3xl font-bold">{t("pages.maintenance.title")}</CardTitle>
            <CardDescription className="text-lg text-muted-foreground">
              {t("pages.maintenance.description")}
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-8 pb-8">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">{t("pages.maintenance.estimatedDuration")}</h3>
                <p className="text-sm text-muted-foreground">
                  We expect to be back online in {estimatedTime}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">{t("help")}</h3>
                <p className="text-sm text-muted-foreground">
                  Contact us at{" "}
                  <a
                    href={`mailto:${contactEmail}`}
                    className="text-primary hover:underline"
                  >
                    {contactEmail}
                  </a>
                </p>
              </div>
            </div>
          </div>

          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("pages.maintenance.thanksForPatience")}
            </p>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              size="lg"
              className="gap-2"
            >
              {t("refresh")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
