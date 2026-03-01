import { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Settings,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Key,
  Webhook,
  Shield,
  Zap,
  Mail,
  CreditCard,
  Cloud,
  BarChart3,
  MessageSquare,
  FileText,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocalization } from "@/contexts/LocalizationContext";

export interface IntegrationConfig {
  id: string;
  name: string;
  description: string;
  category: 'payment' | 'email' | 'storage' | 'analytics' | 'communication' | 'documents';
  icon: React.ComponentType<{ className?: string }>;
  type: 'api_key' | 'oauth' | 'webhook' | 'custom';
  requiredFields: string[];
  optionalFields?: string[];
  webhookFields?: string[];
  status: 'not_configured' | 'configured' | 'testing' | 'connected' | 'error';
  lastTested?: Date;
  errorMessage?: string;
  config: Record<string, any>;
}

type IntegrationDefinition = Omit<IntegrationConfig, 'status' | 'config' | 'description'> & {
  descriptionKey: string;
};

const INTEGRATION_DEFINITIONS: IntegrationDefinition[] = [
  // Payment Processors
  {
    id: 'stripe',
    name: 'Stripe',
    descriptionKey: 'settings.thirdParty.integrations.stripe.description',
    category: 'payment',
    icon: CreditCard,
    type: 'api_key',
    requiredFields: ['publishable_key', 'secret_key'],
    webhookFields: ['webhook_secret'],
  },
  {
    id: 'paypal',
    name: 'PayPal',
    descriptionKey: 'settings.thirdParty.integrations.paypal.description',
    category: 'payment',
    icon: CreditCard,
    type: 'api_key',
    requiredFields: ['client_id', 'client_secret'],
    optionalFields: ['webhook_id'],
  },

  // Email Services
  {
    id: 'sendgrid',
    name: 'SendGrid',
    descriptionKey: 'settings.thirdParty.integrations.sendgrid.description',
    category: 'email',
    icon: Mail,
    type: 'api_key',
    requiredFields: ['api_key'],
    optionalFields: ['from_email', 'from_name'],
  },
  {
    id: 'mailgun',
    name: 'Mailgun',
    descriptionKey: 'settings.thirdParty.integrations.mailgun.description',
    category: 'email',
    icon: Mail,
    type: 'api_key',
    requiredFields: ['api_key', 'domain'],
  },

  // File Storage
  {
    id: 'aws_s3',
    name: 'AWS S3',
    descriptionKey: 'settings.thirdParty.integrations.awsS3.description',
    category: 'storage',
    icon: Cloud,
    type: 'api_key',
    requiredFields: ['access_key_id', 'secret_access_key', 'bucket_name', 'region'],
    optionalFields: ['cloudfront_url'],
  },
  {
    id: 'cloudinary',
    name: 'Cloudinary',
    descriptionKey: 'settings.thirdParty.integrations.cloudinary.description',
    category: 'storage',
    icon: Cloud,
    type: 'api_key',
    requiredFields: ['cloud_name', 'api_key', 'api_secret'],
  },

  // Analytics
  {
    id: 'google_analytics',
    name: 'Google Analytics',
    descriptionKey: 'settings.thirdParty.integrations.googleAnalytics.description',
    category: 'analytics',
    icon: BarChart3,
    type: 'custom',
    requiredFields: ['tracking_id'],
    optionalFields: ['custom_domain'],
  },
  {
    id: 'mixpanel',
    name: 'Mixpanel',
    descriptionKey: 'settings.thirdParty.integrations.mixpanel.description',
    category: 'analytics',
    icon: BarChart3,
    type: 'api_key',
    requiredFields: ['project_token'],
    optionalFields: ['api_secret'],
  },

  // Communication
  {
    id: 'slack',
    name: 'Slack',
    descriptionKey: 'settings.thirdParty.integrations.slack.description',
    category: 'communication',
    icon: MessageSquare,
    type: 'oauth',
    requiredFields: ['bot_token'],
    webhookFields: ['webhook_url'],
  },
  {
    id: 'microsoft_teams',
    name: 'Microsoft Teams',
    descriptionKey: 'settings.thirdParty.integrations.microsoftTeams.description',
    category: 'communication',
    icon: MessageSquare,
    type: 'oauth',
    requiredFields: ['client_id', 'client_secret', 'tenant_id'],
  },

  // Document Services
  {
    id: 'docusign',
    name: 'DocuSign',
    descriptionKey: 'settings.thirdParty.integrations.docusign.description',
    category: 'documents',
    icon: FileText,
    type: 'oauth',
    requiredFields: ['integration_key', 'secret_key', 'account_id'],
  },
];

export function ThirdPartyServices() {
  const { t } = useLocalization();
  const { toast } = useToast();
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>([]);
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationConfig | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const integrationDefinitions = useMemo(
    () =>
      INTEGRATION_DEFINITIONS.map((integration) => ({
        ...integration,
        description: t(integration.descriptionKey),
      })),
    [t]
  );
  const categoryLabels = useMemo(
    () => ({
      payment: t('settings.thirdParty.categories.payment'),
      email: t('settings.thirdParty.categories.email'),
      storage: t('settings.thirdParty.categories.storage'),
      analytics: t('settings.thirdParty.categories.analytics'),
      communication: t('settings.thirdParty.categories.communication'),
      documents: t('settings.thirdParty.categories.documents'),
    }),
    [t]
  );

  // Load integrations from localStorage (in production, this would be from backend)
  useEffect(() => {
    const savedConfigs = localStorage.getItem('third-party-configs');
    if (savedConfigs) {
      try {
        const configs = JSON.parse(savedConfigs);
        const loadedIntegrations = integrationDefinitions.map(integration => ({
          ...integration,
          status: configs[integration.id]?.status || 'not_configured',
          config: configs[integration.id]?.config || {},
          lastTested: configs[integration.id]?.lastTested ? new Date(configs[integration.id].lastTested) : undefined,
          errorMessage: configs[integration.id]?.errorMessage,
        }));
        setIntegrations(loadedIntegrations);
      } catch (error) {
        console.error('Failed to load integration configs:', error);
        setIntegrations(integrationDefinitions.map(i => ({ ...i, status: 'not_configured', config: {} })));
      }
    } else {
      setIntegrations(integrationDefinitions.map(i => ({ ...i, status: 'not_configured', config: {} })));
    }
  }, [integrationDefinitions]);

  const saveConfigs = (configs: Record<string, any>) => {
    localStorage.setItem('third-party-configs', JSON.stringify(configs));
  };

  const updateIntegration = (integrationId: string, updates: Partial<IntegrationConfig>) => {
    setIntegrations(prev =>
      prev.map(integration =>
        integration.id === integrationId
          ? { ...integration, ...updates }
          : integration
      )
    );

    // Save to localStorage
    const currentConfigs = JSON.parse(localStorage.getItem('third-party-configs') || '{}');
    currentConfigs[integrationId] = {
      ...currentConfigs[integrationId],
      ...updates,
      lastTested: updates.lastTested?.toISOString(),
    };
    saveConfigs(currentConfigs);
  };

  const testConnection = async (integration: IntegrationConfig) => {
    updateIntegration(integration.id, { status: 'testing' });

    try {
      // Simulate API testing - in production this would call actual APIs
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock success/failure based on configuration completeness
      const hasRequiredFields = integration.requiredFields.every(field =>
        integration.config[field] && integration.config[field].trim()
      );

      if (hasRequiredFields) {
        updateIntegration(integration.id, {
          status: 'connected',
          lastTested: new Date(),
          errorMessage: undefined,
        });
        toast({
          title: t("settings:thirdParty.toast.connectionSuccessTitle"),
          description: t("settings:thirdParty.toast.connectionSuccessDescription", {
            name: integration.name,
          }),
        });
      } else {
        throw new Error(t("settings:thirdParty.errors.missingRequiredFields"));
      }
    } catch (error: any) {
      updateIntegration(integration.id, {
        status: 'error',
        lastTested: new Date(),
        errorMessage: error.message || t("settings:thirdParty.errors.connectionFailed"),
      });
      toast({
        title: t("settings:thirdParty.toast.connectionFailedTitle"),
        description: error.message || t("settings:thirdParty.toast.connectionFailedDescription"),
        variant: 'destructive',
      });
    }
  };

  const saveConfiguration = (integrationId: string, config: Record<string, any>) => {
    updateIntegration(integrationId, { config, status: 'configured' });
    toast({
      title: t("settings:thirdParty.toast.configurationSavedTitle"),
      description: t("settings:thirdParty.toast.configurationSavedDescription"),
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'testing':
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'text-green-600 bg-green-50';
      case 'error':
        return 'text-red-600 bg-red-50';
      case 'testing':
        return 'text-blue-600 bg-blue-50';
      case 'configured':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const groupedIntegrations = integrations.reduce((acc, integration) => {
    if (!acc[integration.category]) {
      acc[integration.category] = [];
    }
    acc[integration.category].push(integration);
    return acc;
  }, {} as Record<string, IntegrationConfig[]>);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t("settings:thirdParty.title")}
          </CardTitle>
          <CardDescription>
            {t("settings:thirdParty.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} variant="pill" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview">{t("settings:thirdParty.tabs.overview")}</TabsTrigger>
              <TabsTrigger value="configure" disabled={!selectedIntegration}>
                {t("settings:thirdParty.tabs.configure", { name: selectedIntegration?.name || "" })}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {Object.entries(groupedIntegrations).map(([category, categoryIntegrations]) => (
                <div key={category} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{categoryLabels[category as keyof typeof categoryLabels]}</h3>
                    <Separator className="flex-1" />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {categoryIntegrations.map((integration) => {
                      const IconComponent = integration.icon;
                      return (
                        <Card
                          key={integration.id}
                          className={`cursor-pointer transition-all hover:shadow-md ${
                            selectedIntegration?.id === integration.id ? 'ring-2 ring-primary' : ''
                          }`}
                          onClick={() => {
                            setSelectedIntegration(integration);
                            setActiveTab('configure');
                          }}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-primary/10">
                                  <IconComponent className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                  <h4 className="font-medium">{integration.name}</h4>
                                  <p className="text-sm text-muted-foreground line-clamp-2">
                                    {integration.description}
                                  </p>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                {getStatusIcon(integration.status)}
                                <Badge variant="outline" className={getStatusColor(integration.status)}>
                                  {t(`settings.thirdParty.status.${integration.status}`)}
                                </Badge>
                              </div>
                            </div>

                            {integration.lastTested && (
                              <div className="mt-3 text-xs text-muted-foreground">
                                {t("settings:thirdParty.lastTested", {
                                  date: integration.lastTested.toLocaleString(),
                                })}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="configure" className="space-y-6">
              {selectedIntegration && (
                <IntegrationConfigurator
                  integration={selectedIntegration}
                  onSave={(config) => saveConfiguration(selectedIntegration.id, config)}
                  onTest={() => testConnection(selectedIntegration)}
                  onBack={() => {
                    setSelectedIntegration(null);
                    setActiveTab('overview');
                  }}
                />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

interface IntegrationConfiguratorProps {
  integration: IntegrationConfig;
  onSave: (config: Record<string, any>) => void;
  onTest: () => void;
  onBack: () => void;
}

function IntegrationConfigurator({ integration, onSave, onTest, onBack }: IntegrationConfiguratorProps) {
  const [config, setConfig] = useState<Record<string, any>>(integration.config || {});
  const [isEnabled, setIsEnabled] = useState(integration.status !== 'not_configured');
  const { t } = useLocalization();

  const handleFieldChange = (field: string, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const formatFieldLabel = (field: string) =>
    field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  const handleSave = () => {
    onSave({ ...config, enabled: isEnabled });
  };

  const IconComponent = integration.icon;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onBack}>
            {t("settings:thirdParty.backButton")}
          </Button>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <IconComponent className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{integration.name}</h2>
              <p className="text-sm text-muted-foreground">{integration.description}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={isEnabled}
              onCheckedChange={setIsEnabled}
            />
            <Label>{t("settings:thirdParty.enabledLabel")}</Label>
          </div>
          <Button onClick={onTest} disabled={integration.status === 'testing'}>
            {integration.status === 'testing' ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            {t("settings:thirdParty.testConnectionButton")}
          </Button>
          <Button onClick={handleSave}>
            <Key className="h-4 w-4 mr-2" />
            {t("settings:thirdParty.saveConfigurationButton")}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings:thirdParty.configurationTitle")}</CardTitle>
          <CardDescription>
            {t("settings:thirdParty.configurationDescription", { name: integration.name })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Required Fields */}
          <div className="space-y-4">
            <h4 className="font-medium">{t("settings:thirdParty.requiredSettingsTitle")}</h4>
            <div className="grid gap-4">
              {integration.requiredFields.map((field) => (
                <div key={field}>
                  <Label htmlFor={field} className="text-sm font-medium">
                    {t("settings:thirdParty.requiredFieldLabel", { field: formatFieldLabel(field) })}
                  </Label>
                  {field.includes('secret') || field.includes('key') || field.includes('token') ? (
                    <Input
                      id={field}
                      type="password"
                      placeholder={t("settings:thirdParty.placeholders.enterField", {
                        field: formatFieldLabel(field).toLowerCase(),
                      })}
                      value={config[field] || ''}
                      onChange={(e) => handleFieldChange(field, e.target.value)}
                    />
                  ) : (
                    <Input
                      id={field}
                      placeholder={t("settings:thirdParty.placeholders.enterField", {
                        field: formatFieldLabel(field).toLowerCase(),
                      })}
                      value={config[field] || ''}
                      onChange={(e) => handleFieldChange(field, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Optional Fields */}
          {integration.optionalFields && integration.optionalFields.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-medium">{t("settings:thirdParty.optionalSettingsTitle")}</h4>
              <div className="grid gap-4">
                {integration.optionalFields.map((field) => (
                  <div key={field}>
                    <Label htmlFor={field} className="text-sm font-medium">
                      {formatFieldLabel(field)}
                    </Label>
                    <Input
                      id={field}
                      placeholder={t("settings:thirdParty.placeholders.enterOptionalField", {
                        field: formatFieldLabel(field).toLowerCase(),
                      })}
                      value={config[field] || ''}
                      onChange={(e) => handleFieldChange(field, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Webhook Fields */}
          {integration.webhookFields && integration.webhookFields.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Webhook className="h-4 w-4" />
                {t("settings:thirdParty.webhookTitle")}
              </h4>
              <div className="grid gap-4">
                {integration.webhookFields.map((field) => (
                  <div key={field}>
                    <Label htmlFor={field} className="text-sm font-medium">
                      {formatFieldLabel(field)}
                    </Label>
                    <Input
                      id={field}
                      placeholder={t("settings:thirdParty.placeholders.enterField", {
                        field: formatFieldLabel(field).toLowerCase(),
                      })}
                      value={config[field] || ''}
                      onChange={(e) => handleFieldChange(field, e.target.value)}
                    />
                    {field.includes('url') && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("settings:thirdParty.webhookUrlHelp", { name: integration.name })}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Integration Type Specific Instructions */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium">{t("settings:thirdParty.setupInstructionsTitle")}</h4>
            <div className="text-sm text-muted-foreground space-y-2">
              {integration.type === 'api_key' && (
                <div>
                  <p><strong>{t("settings:thirdParty.apiKeySetupTitle")}</strong></p>
                  <ol className="list-decimal list-inside space-y-1 mt-2">
                    <li>{t("settings:thirdParty.apiKeySteps.login", { name: integration.name })}</li>
                    <li>{t("settings:thirdParty.apiKeySteps.navigate")}</li>
                    <li>{t("settings:thirdParty.apiKeySteps.generate")}</li>
                    <li>{t("settings:thirdParty.apiKeySteps.paste")}</li>
                  </ol>
                </div>
              )}
              {integration.type === 'oauth' && (
                <div>
                  <p><strong>{t("settings:thirdParty.oauthSetupTitle")}</strong></p>
                  <ol className="list-decimal list-inside space-y-1 mt-2">
                    <li>{t("settings:thirdParty.oauthSteps.createApp", { name: integration.name })}</li>
                    <li>
                      {t("settings:thirdParty.oauthSteps.setRedirect")}
                      <code className="bg-muted px-1 py-0.5 rounded text-xs">{window.location.origin}/auth/{integration.id}/callback</code>
                    </li>
                    <li>{t("settings:thirdParty.oauthSteps.copyCredentials")}</li>
                    <li>{t("settings:thirdParty.oauthSteps.configure")}</li>
                  </ol>
                </div>
              )}
              {integration.type === 'webhook' && (
                <div>
                  <p><strong>{t("settings:thirdParty.webhookSetupTitle")}</strong></p>
                  <ol className="list-decimal list-inside space-y-1 mt-2">
                    <li>{t("settings:thirdParty.webhookSteps.configure", { name: integration.name })}</li>
                    <li>
                      {t("settings:thirdParty.webhookSteps.endpoint")}
                      <code className="bg-muted px-1 py-0.5 rounded text-xs">{window.location.origin}/webhooks/{integration.id}</code>
                    </li>
                    <li>{t("settings:thirdParty.webhookSteps.secret")}</li>
                  </ol>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
