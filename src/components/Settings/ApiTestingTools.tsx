import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Play,
  Save,
  History,
  Trash2,
  Copy,
  Download,
  Upload,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocalization } from "@/contexts/LocalizationContext";

interface ApiTestRequest {
  id: string;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers: Record<string, string>;
  body: string;
  authType: 'none' | 'bearer' | 'basic' | 'api-key';
  authToken: string;
  apiKeyName: string;
  apiKeyValue: string;
  username: string;
  password: string;
}

interface ApiTestResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: any;
  responseTime: number;
  size: number;
}

interface SavedTest extends ApiTestRequest {
  createdAt: string;
  lastUsed: string;
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const;
const AUTH_TYPES = ['none', 'bearer', 'basic', 'api-key'] as const;

export function ApiTestingTools() {
  const { t } = useLocalization();
  const { toast } = useToast();

  const [currentRequest, setCurrentRequest] = useState<ApiTestRequest>({
    id: '',
    name: '',
    method: 'GET',
    url: '',
    headers: { 'Content-Type': 'application/json' },
    body: '',
    authType: 'none',
    authToken: '',
    apiKeyName: '',
    apiKeyValue: '',
    username: '',
    password: '',
  });

  const [response, setResponse] = useState<ApiTestResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [savedTests, setSavedTests] = useState<SavedTest[]>([]);
  const [activeTab, setActiveTab] = useState('request');

  // Load saved tests from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('api-testing-saved-tests');
    if (saved) {
      try {
        setSavedTests(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load saved tests:', error);
      }
    }
  }, []);

  // Save tests to localStorage
  const saveTestsToStorage = (tests: SavedTest[]) => {
    localStorage.setItem('api-testing-saved-tests', JSON.stringify(tests));
    setSavedTests(tests);
  };

  const sendRequest = async () => {
    if (!currentRequest.url.trim()) {
      toast({
        title: t("settings:apiTesting.toast.errorTitle"),
        description: t("settings:apiTesting.toast.invalidUrl"),
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setResponse(null);

    const startTime = Date.now();

    try {
      // Prepare headers
      const headers = new Headers(currentRequest.headers);

      // Add authentication
      if (currentRequest.authType === 'bearer' && currentRequest.authToken) {
        headers.set('Authorization', `Bearer ${currentRequest.authToken}`);
      } else if (currentRequest.authType === 'basic' && currentRequest.username && currentRequest.password) {
        const credentials = btoa(`${currentRequest.username}:${currentRequest.password}`);
        headers.set('Authorization', `Basic ${credentials}`);
      } else if (currentRequest.authType === 'api-key' && currentRequest.apiKeyName && currentRequest.apiKeyValue) {
        headers.set(currentRequest.apiKeyName, currentRequest.apiKeyValue);
      }

      // Prepare request options
      const requestOptions: RequestInit = {
        method: currentRequest.method,
        headers,
      };

      // Add body for non-GET requests
      if (['POST', 'PUT', 'PATCH'].includes(currentRequest.method) && currentRequest.body.trim()) {
        requestOptions.body = currentRequest.body;
      }

      // Make the request
      const response = await fetch(currentRequest.url, requestOptions);
      const responseTime = Date.now() - startTime;

      // Parse response
      let responseBody: any;
      const contentType = response.headers.get('content-type');

      if (contentType?.includes('application/json')) {
        responseBody = await response.json();
      } else {
        responseBody = await response.text();
      }

      // Convert headers to object
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      const responseSize = new Blob([JSON.stringify(responseBody)]).size;

      const apiResponse: ApiTestResponse = {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body: responseBody,
        responseTime,
        size: responseSize,
      };

      setResponse(apiResponse);
      setActiveTab('response');

      toast({
        title: t("settings:apiTesting.toast.requestCompletedTitle"),
        description: t("settings:apiTesting.toast.requestCompletedDescription", {
          status: response.status,
          time: responseTime,
        }),
      });

    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      setResponse({
        status: 0,
        statusText: 'Network Error',
        headers: {},
        body: { error: error.message || 'Request failed' },
        responseTime,
        size: 0,
      });

      toast({
        title: t("settings:apiTesting.toast.requestFailedTitle"),
        description: error.message || t("settings:apiTesting.toast.networkError"),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveTest = () => {
    if (!currentRequest.name.trim()) {
      toast({
        title: t("settings:apiTesting.toast.errorTitle"),
        description: t("settings:apiTesting.toast.missingTestName"),
        variant: 'destructive',
      });
      return;
    }

    const testToSave: SavedTest = {
      ...currentRequest,
      id: currentRequest.id || `test-${Date.now()}`,
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
    };

    const existingIndex = savedTests.findIndex(test => test.id === testToSave.id);
    let updatedTests: SavedTest[];

    if (existingIndex >= 0) {
      // Update existing
      updatedTests = [...savedTests];
      updatedTests[existingIndex] = { ...testToSave, createdAt: updatedTests[existingIndex].createdAt };
    } else {
      // Add new
      updatedTests = [...savedTests, testToSave];
    }

    saveTestsToStorage(updatedTests);

    toast({
      title: t("settings:apiTesting.toast.testSavedTitle"),
      description: t("settings:apiTesting.toast.testSavedDescription", {
        name: currentRequest.name,
      }),
    });
  };

  const loadTest = (test: SavedTest) => {
    setCurrentRequest(test);
    setResponse(null);
    setActiveTab('request');

    // Update last used
    const updatedTests = savedTests.map(t =>
      t.id === test.id ? { ...t, lastUsed: new Date().toISOString() } : t
    );
    saveTestsToStorage(updatedTests);

    toast({
      title: t("settings:apiTesting.toast.testLoadedTitle"),
      description: t("settings:apiTesting.toast.testLoadedDescription", {
        name: test.name,
      }),
    });
  };

  const deleteTest = (testId: string) => {
    const updatedTests = savedTests.filter(test => test.id !== testId);
    saveTestsToStorage(updatedTests);

    toast({
      title: t("settings:apiTesting.toast.testDeletedTitle"),
      description: t("settings:apiTesting.toast.testDeletedDescription"),
    });
  };

  const formatJson = (obj: any): string => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: t("settings:apiTesting.toast.copiedTitle"),
      description: t("settings:apiTesting.toast.copiedDescription"),
    });
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-green-600';
    if (status >= 300 && status < 400) return 'text-yellow-600';
    if (status >= 400 && status < 500) return 'text-orange-600';
    if (status >= 500) return 'text-red-600';
    return 'text-gray-600';
  };

  const getStatusIcon = (status: number) => {
    if (status >= 200 && status < 300) return <CheckCircle className="h-4 w-4" />;
    if (status >= 400) return <XCircle className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            {t("settings:apiTesting.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} variant="pill" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="request">{t("settings:apiTesting.tabs.request")}</TabsTrigger>
              <TabsTrigger value="response">{t("settings:apiTesting.tabs.response")}</TabsTrigger>
              <TabsTrigger value="headers">{t("settings:apiTesting.tabs.headers")}</TabsTrigger>
              <TabsTrigger value="history">{t("settings:apiTesting.tabs.history")}</TabsTrigger>
            </TabsList>

            <TabsContent value="request" className="space-y-4">
              {/* Test Name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="test-name">{t("settings:apiTesting.testNameLabel")}</Label>
                  <Input
                    id="test-name"
                    placeholder={t("additionalPlaceholders.enterTestName")}
                    value={currentRequest.name}
                    onChange={(e) => setCurrentRequest(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={sendRequest} disabled={isLoading} className="flex-1">
                    {isLoading ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    {t("settings:apiTesting.sendRequestButton")}
                  </Button>
                  <Button onClick={saveTest} variant="outline">
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Method and URL */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="method">{t("settings:apiTesting.methodLabel")}</Label>
                  <Select
                    value={currentRequest.method}
                    onValueChange={(value: any) => setCurrentRequest(prev => ({ ...prev, method: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HTTP_METHODS.map(method => (
                        <SelectItem key={method} value={method}>{method}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-3">
                  <Label htmlFor="url">{t("settings:apiTesting.urlLabel")}</Label>
                  <Input
                    id="url"
                    placeholder={t("additionalPlaceholders.apiEndpoint")}
                    value={currentRequest.url}
                    onChange={(e) => setCurrentRequest(prev => ({ ...prev, url: e.target.value }))}
                  />
                </div>
              </div>

              {/* Authentication */}
              <div className="space-y-2">
                <Label>{t("settings:apiTesting.authenticationLabel")}</Label>
                <Select
                  value={currentRequest.authType}
                  onValueChange={(value: any) => setCurrentRequest(prev => ({ ...prev, authType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AUTH_TYPES.map(type => (
                      <SelectItem key={type} value={type}>
                        {type === 'none' ? t("settings:apiTesting.authOptions.none") :
                         type === 'bearer' ? t("settings:apiTesting.authOptions.bearer") :
                         type === 'basic' ? t("settings:apiTesting.authOptions.basic") :
                         t("settings:apiTesting.authOptions.apiKey")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {currentRequest.authType === 'bearer' && (
                  <Input
                    placeholder={t("additionalPlaceholders.enterBearerToken")}
                    value={currentRequest.authToken}
                    onChange={(e) => setCurrentRequest(prev => ({ ...prev, authToken: e.target.value }))}
                  />
                )}

                {currentRequest.authType === 'basic' && (
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder={t("additionalPlaceholders.username")}
                      value={currentRequest.username}
                      onChange={(e) => setCurrentRequest(prev => ({ ...prev, username: e.target.value }))}
                    />
                    <Input
                      type="password"
                      placeholder={t("additionalPlaceholders.enterPassword")}
                      value={currentRequest.password}
                      onChange={(e) => setCurrentRequest(prev => ({ ...prev, password: e.target.value }))}
                    />
                  </div>
                )}

                {currentRequest.authType === 'api-key' && (
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder={t("additionalPlaceholders.headerName")}
                      value={currentRequest.apiKeyName}
                      onChange={(e) => setCurrentRequest(prev => ({ ...prev, apiKeyName: e.target.value }))}
                    />
                    <Input
                      placeholder={t("additionalPlaceholders.apiKeyValue")}
                      value={currentRequest.apiKeyValue}
                      onChange={(e) => setCurrentRequest(prev => ({ ...prev, apiKeyValue: e.target.value }))}
                    />
                  </div>
                )}
              </div>

              {/* Headers */}
              <div className="space-y-2">
                <Label>{t("settings:apiTesting.headersLabel")}</Label>
                {Object.entries(currentRequest.headers).map(([key, value], index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder={t("additionalPlaceholders.headerName")}
                      value={key}
                      onChange={(e) => {
                        const newHeaders = { ...currentRequest.headers };
                        delete newHeaders[key];
                        newHeaders[e.target.value] = value;
                        setCurrentRequest(prev => ({ ...prev, headers: newHeaders }));
                      }}
                    />
                    <Input
                      placeholder={t("additionalPlaceholders.headerValue")}
                      value={value}
                      onChange={(e) => {
                        setCurrentRequest(prev => ({
                          ...prev,
                          headers: { ...prev.headers, [key]: e.target.value }
                        }));
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newHeaders = { ...currentRequest.headers };
                        delete newHeaders[key];
                        setCurrentRequest(prev => ({ ...prev, headers: newHeaders }));
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCurrentRequest(prev => ({
                      ...prev,
                      headers: { ...prev.headers, '': '' }
                    }));
                  }}
                >
                  {t("settings:apiTesting.addHeaderButton")}
                </Button>
              </div>

              {/* Request Body */}
              {['POST', 'PUT', 'PATCH'].includes(currentRequest.method) && (
                <div className="space-y-2">
                  <Label>{t("settings:apiTesting.requestBodyLabel")}</Label>
                  <Textarea
                    placeholder={t("additionalPlaceholders.requestBody")}
                    value={currentRequest.body}
                    onChange={(e) => setCurrentRequest(prev => ({ ...prev, body: e.target.value }))}
                    rows={6}
                  />
                </div>
              )}
            </TabsContent>

            <TabsContent value="response" className="space-y-4">
              {response ? (
                <div className="space-y-4">
                  {/* Status */}
                  <div className="flex items-center gap-2">
                    {getStatusIcon(response.status)}
                    <Badge variant={response.status >= 200 && response.status < 300 ? "default" : "destructive"}>
                      {response.status} {response.statusText}
                    </Badge>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {response.responseTime}ms
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {(response.size / 1024).toFixed(2)} KB
                    </span>
                  </div>

                  {/* Response Body */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>{t("settings:apiTesting.responseBodyLabel")}</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(formatJson(response.body))}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        {t("settings:apiTesting.copyButton")}
                      </Button>
                    </div>
                    <Textarea
                      value={formatJson(response.body)}
                      readOnly
                      rows={12}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  {t("settings:apiTesting.noResponse")}
                </div>
              )}
            </TabsContent>

            <TabsContent value="headers" className="space-y-4">
              {response ? (
                <div className="space-y-4">
                  {/* Request Headers */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">{t("settings:apiTesting.requestHeadersTitle")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.entries(currentRequest.headers).map(([key, value]) => (
                          <div key={key} className="flex justify-between text-sm">
                            <span className="font-mono text-blue-600">{key}:</span>
                            <span className="font-mono text-green-600">{value}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Response Headers */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">{t("settings:apiTesting.responseHeadersTitle")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.entries(response.headers).map(([key, value]) => (
                          <div key={key} className="flex justify-between text-sm">
                            <span className="font-mono text-blue-600">{key}:</span>
                            <span className="font-mono text-green-600">{value}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  {t("settings:apiTesting.noHeaders")}
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{t("settings:apiTesting.savedTestsTitle")}</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCurrentRequest({
                      id: '',
                      name: '',
                      method: 'GET',
                      url: '',
                      headers: { 'Content-Type': 'application/json' },
                      body: '',
                      authType: 'none',
                      authToken: '',
                      apiKeyName: '',
                      apiKeyValue: '',
                      username: '',
                      password: '',
                    });
                    setResponse(null);
                  }}
                >
                  {t("settings:apiTesting.newTestButton")}
                </Button>
              </div>

              {savedTests.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  {t("settings:apiTesting.noSavedTests")}
                </div>
              ) : (
                <div className="space-y-2">
                  {savedTests
                    .sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime())
                    .map((test) => (
                      <Card key={test.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{test.method}</Badge>
                                <span className="font-medium">{test.name}</span>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1 truncate">
                                {test.url}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {t("settings:apiTesting.lastUsed", {
                                  date: new Date(test.lastUsed).toLocaleString(),
                                })}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => loadTest(test)}
                              >
                                {t("settings:apiTesting.loadButton")}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteTest(test.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
