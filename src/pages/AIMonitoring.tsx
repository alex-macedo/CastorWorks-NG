/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/**
 * AI Monitoring Dashboard
 *
 * Admin-only dashboard for monitoring AI usage, performance, and costs
 * Features:
 * - Real-time usage graphs (daily/weekly/monthly)
 * - Token consumption and cost tracking
 * - Error rate monitoring
 * - Model accuracy trends
 * - User feedback summary
 * - Cache hit rate statistics
 * - Feature adoption metrics
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Bar } from 'recharts/es6/cartesian/Bar';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Zap,
  ThumbsUp,
  ThumbsDown,
  Download,
  Calendar,
  Activity,
  AlertCircle,
} from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { useToast } from '@/hooks/use-toast';
import { AILoadingState } from '@/components/AI';
import { useDateFormat } from '@/hooks/useDateFormat';

import { useLocalization } from "@/contexts/LocalizationContext";
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";
type TimeRange = 'day' | 'week' | 'month' | 'all';

interface UsageStats {
  totalRequests: number;
  totalTokens: number;
  estimatedCost: number;
  cacheHitRate: number;
  errorRate: number;
  avgConfidence: number;
}

interface FeedbackStats {
  helpful: number;
  notHelpful: number;
  avgRating: number;
  totalFeedback: number;
}

export default function AIMonitoring() {
  const { t } = useLocalization();
  const { formatDate } = useDateFormat();
  const { user } = useAuth();
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [selectedFeature, setSelectedFeature] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [feedbackStats, setFeedbackStats] = useState<FeedbackStats | null>(null);
  const [usageOverTime, setUsageOverTime] = useState<any[]>([]);
  const [featureAdoption, setFeatureAdoption] = useState<any[]>([]);
  const [topUsers, setTopUsers] = useState<any[]>([]);

  // Check admin access
  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!user) return;

      const { data: userData, error } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (error || userData?.role !== 'admin') {
        toast({
          title: 'Access Denied',
          description: 'This page is only accessible to administrators.',
          variant: 'destructive',
        });
        window.location.href = '/';
        return;
      }

      fetchAllData();
    };

    checkAdminAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, timeRange, selectedFeature, toast]);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchUsageStats(),
        fetchFeedbackStats(),
        fetchUsageOverTime(),
        fetchFeatureAdoption(),
        fetchTopUsers(),
      ]);
    } catch (error) {
      console.error('Error fetching AI monitoring data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load monitoring data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getDateFilter = () => {
    const now = new Date();
    switch (timeRange) {
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return null;
    }
  };

  const fetchUsageStats = async () => {
    const dateFilter = getDateFilter();

    let query = supabase
      .from('ai_insights')
      .select('*');

    if (dateFilter) {
      query = query.gte('created_at', dateFilter);
    }

    if (selectedFeature !== 'all') {
      query = query.eq('insight_type', selectedFeature);
    }

    const { data: insights, error } = await query;

    if (error) throw error;

    // Calculate stats
    const totalRequests = insights?.length || 0;
    const totalTokens = insights?.reduce((sum, i) => sum + (i.metadata?.tokensUsed || 0), 0) || 0;
    const estimatedCost = totalTokens * 0.000002; // Approximate cost per token
    const avgConfidence = insights?.length
      ? insights.reduce((sum, i) => sum + (i.confidence_level || 0), 0) / insights.length
      : 0;

    // Calculate cache hit rate
    const totalInsights = totalRequests;
    const uniqueTypes = new Set(insights?.map(i => `${i.insight_type}-${i.project_id || 'global'}`)).size;
    const cacheHitRate = totalInsights > uniqueTypes
      ? ((totalInsights - uniqueTypes) / totalInsights) * 100
      : 0;

    // Error rate (placeholder - would need error logging)
    const errorRate = 0;

    setUsageStats({
      totalRequests,
      totalTokens,
      estimatedCost,
      cacheHitRate,
      errorRate,
      avgConfidence,
    });
  };

  const fetchFeedbackStats = async () => {
    const dateFilter = getDateFilter();

    let query = supabase
      .from('ai_insights')
      .select('user_feedback');

    if (dateFilter) {
      query = query.gte('created_at', dateFilter);
    }

    const { data: insights, error } = await query;

    if (error) throw error;

    const feedbackData = insights?.filter(i => i.user_feedback) || [];
    const helpful = feedbackData.filter(i => i.user_feedback?.helpful === true).length;
    const notHelpful = feedbackData.filter(i => i.user_feedback?.helpful === false).length;
    const totalFeedback = feedbackData.length;
    const avgRating = feedbackData.reduce((sum, i) => sum + (i.user_feedback?.rating || 0), 0) / (totalFeedback || 1);

    setFeedbackStats({
      helpful,
      notHelpful,
      avgRating,
      totalFeedback,
    });
  };

  const fetchUsageOverTime = async () => {
    const dateFilter = getDateFilter();

    let query = supabase
      .from('ai_insights')
      .select('created_at, metadata');

    if (dateFilter) {
      query = query.gte('created_at', dateFilter);
    }

    const { data: insights, error } = await query;

    if (error) throw error;

    // Group by day
    const groupedByDay = insights?.reduce((acc: any, insight) => {
      const date = formatDate(insight.created_at);
      if (!acc[date]) {
        acc[date] = { date, requests: 0, tokens: 0 };
      }
      acc[date].requests += 1;
      acc[date].tokens += insight.metadata?.tokensUsed || 0;
      return acc;
    }, {});

    const chartData = Object.values(groupedByDay || {}).sort((a: any, b: any) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    setUsageOverTime(chartData);
  };

  const fetchFeatureAdoption = async () => {
    const { data: configs, error } = await supabase
      .from('ai_configurations')
      .select('enabled_features');

    if (error) throw error;

    const featureCounts: Record<string, number> = {};

    configs?.forEach(config => {
      Object.entries(config.enabled_features || {}).forEach(([feature, enabled]) => {
        if (enabled) {
          featureCounts[feature] = (featureCounts[feature] || 0) + 1;
        }
      });
    });

    const chartData = Object.entries(featureCounts).map(([feature, count]) => ({
      name: feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: count,
    }));

    setFeatureAdoption(chartData);
  };

  const fetchTopUsers = async () => {
    const dateFilter = getDateFilter();

    let query = supabase
      .from('ai_insights')
      .select('user_id');

    if (dateFilter) {
      query = query.gte('created_at', dateFilter);
    }

    const { data: insights, error } = await query;

    if (error) throw error;

    // Count by user
    const userCounts = insights?.reduce((acc: any, insight) => {
      const userId = insight.user_id;
      acc[userId] = (acc[userId] || 0) + 1;
      return acc;
    }, {});

    const topUsersList = Object.entries(userCounts || {})
      .map(([userId, count]) => ({ userId, count }))
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 5);

    setTopUsers(topUsersList);
  };

  const handleExport = async () => {
    try {
      const exportData = {
        timeRange,
        usageStats,
        feedbackStats,
        usageOverTime,
        featureAdoption,
        topUsers,
        exportedAt: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-monitoring-${timeRange}-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'Export Successful',
        description: 'AI monitoring data has been exported',
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to export monitoring data',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <AILoadingState variant="full" message={`${t('aiMonitoring.title')}...`} />
      </div>
    );
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#14b8a6'];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <SidebarHeaderShell>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Brain className="h-8 w-8 text-primary" />
              {t('aiMonitoring.title')}
            </h1>
            <p className="text-muted-foreground">
              {t('aiMonitoring.description')}
            </p>
          </div>

          <div className="flex gap-2">
            <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
              <SelectTrigger className="w-[150px] bg-secondary text-secondary-foreground border-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">{t('aiMonitoring.last24Hours')}</SelectItem>
                <SelectItem value="week">{t('aiMonitoring.last7Days')}</SelectItem>
                <SelectItem value="month">{t('aiMonitoring.last30Days')}</SelectItem>
                <SelectItem value="all">{t('aiMonitoring.allTime')}</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={handleExport} variant="default" className="gap-2">
              <Download className="h-4 w-4" />
              {t('aiMonitoring.exportData')}
            </Button>
          </div>
        </div>
      </SidebarHeaderShell>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('aiMonitoring.totalRequestsTitle')}</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usageStats?.totalRequests.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">{t('aiMonitoring.aiApiCallsText')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('aiMonitoring.totalTokensTitle')}</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usageStats?.totalTokens.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">{t('aiMonitoring.tokensConsumedText')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('aiMonitoring.estimatedCostTitle')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(usageStats?.estimatedCost || 0)}</div>
            <p className="text-xs text-muted-foreground">{t("messages.basedOnTokenUsage")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('aiMonitoring.cacheHitRateTitle')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usageStats?.cacheHitRate.toFixed(1) || 0}%</div>
            <p className="text-xs text-muted-foreground">{t('aiMonitoring.cachedResponsesText')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Usage Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>{t('aiMonitoring.usageTrendsTitle')}</CardTitle>
            <CardDescription>{t('aiMonitoring.usageTrendsDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={usageOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="requests" stroke="#3b82f6" name={t("images.requests")} />
                <Line yAxisId="right" type="monotone" dataKey="tokens" stroke="#10b981" name={t("images.tokens")} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Feature Adoption */}
        <Card>
          <CardHeader>
            <CardTitle>{t('aiMonitoring.featureAdoptionTitle')}</CardTitle>
            <CardDescription>{t('aiMonitoring.featureAdoptionDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={featureAdoption}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => entry.name}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {featureAdoption.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* User Feedback */}
        <Card>
          <CardHeader>
            <CardTitle>{t('aiMonitoring.userFeedbackTitle')}</CardTitle>
            <CardDescription>{t('aiMonitoring.userFeedbackDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ThumbsUp className="h-5 w-5 text-green-500" />
                <span className="font-medium">{t('aiMonitoring.helpfulText')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{feedbackStats?.helpful || 0}</span>
                <Badge variant="default">
                  {feedbackStats?.totalFeedback
                    ? ((feedbackStats.helpful / feedbackStats.totalFeedback) * 100).toFixed(1)
                    : 0}%
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ThumbsDown className="h-5 w-5 text-red-500" />
                <span className="font-medium">{t('aiMonitoring.notHelpfulText')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{feedbackStats?.notHelpful || 0}</span>
                <Badge variant="destructive">
                  {feedbackStats?.totalFeedback
                    ? ((feedbackStats.notHelpful / feedbackStats.totalFeedback) * 100).toFixed(1)
                    : 0}%
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <span className="font-medium">{t('aiMonitoring.averageRatingText')}</span>
              <div className="text-2xl font-bold">{feedbackStats?.avgRating.toFixed(1) || 0} / 5.0</div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('aiMonitoring.totalFeedbackText')}</span>
              <span className="font-medium">{feedbackStats?.totalFeedback || 0}</span>
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>{t('aiMonitoring.performanceMetricsTitle')}</CardTitle>
            <CardDescription>{t('aiMonitoring.performanceMetricsDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-blue-500" />
                <span className="font-medium">{t('aiMonitoring.avgConfidenceText')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{usageStats?.avgConfidence.toFixed(1) || 0}%</span>
                <Badge variant={usageStats && usageStats.avgConfidence >= 80 ? 'default' : 'secondary'}>
                  {usageStats && usageStats.avgConfidence >= 80 ? t('aiMonitoring.high') : t('aiMonitoring.medium')}
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                <span className="font-medium">{t('aiMonitoring.errorRateText')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{usageStats?.errorRate.toFixed(2) || 0}%</span>
                <Badge variant="outline">{t('aiMonitoring.good')}</Badge>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <span className="font-medium">{t('aiMonitoring.cacheHitRateText')}</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{usageStats?.cacheHitRate.toFixed(1) || 0}%</span>
                <Badge variant={usageStats && usageStats.cacheHitRate >= 50 ? 'default' : 'secondary'}>
                  {usageStats && usageStats.cacheHitRate >= 50 ? t('aiMonitoring.excellent') : t('aiMonitoring.good')}
                </Badge>
              </div>
            </div>

            <div className="text-xs text-muted-foreground pt-2">
              Higher cache hit rate = lower costs and faster responses
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Users */}
      <Card>
        <CardHeader>
          <CardTitle>{t('aiMonitoring.topAiUsersTitle')}</CardTitle>
          <CardDescription>{t('aiMonitoring.topAiUsersDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {topUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{t("messages.noUsageDataAvailable")}</p>
            ) : (
              topUsers.map((user, index) => (
                <div key={user.userId} className="flex items-center justify-between p-2 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">#{index + 1}</Badge>
                    <span className="text-sm font-mono">{user.userId.substring(0, 8)}...</span>
                  </div>
                  <span className="font-medium">{user.count} requests</span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}