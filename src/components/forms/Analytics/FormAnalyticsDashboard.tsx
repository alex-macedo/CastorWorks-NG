import { useFormAnalytics } from '@/hooks/useFormAnalytics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BarChart, Clock, CheckCircle, Users } from 'lucide-react';

interface FormAnalyticsDashboardProps {
  formId: string;
}

/**
 * FormAnalyticsDashboard Component
 * 
 * Displays aggregated analytics for a form:
 * - Response summary (total, completed, completion rate)
 * - Average completion time
 * - Per-question statistics (charts to be added)
 * - Daily response trends (charts to be added)
 * 
 * TODO: Add chart visualizations using recharts
 * TODO: Add export functionality
 * TODO: Add date range filtering
 */
export function FormAnalyticsDashboard({ formId }: FormAnalyticsDashboardProps) {
  const { analytics, isLoading } = useFormAnalytics(formId);

  if (isLoading) {
    return (
      <div className="container max-w-6xl py-8">
        <p className="text-muted-foreground">Loading analytics...</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="container max-w-6xl py-8">
        <p className="text-muted-foreground">No analytics data available</p>
      </div>
    );
  }

  const formatTime = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="container max-w-6xl py-8 space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Form Analytics</h2>
        <p className="text-muted-foreground">
          Last updated: {new Date(analytics.lastCalculatedAt).toLocaleString()}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalResponses}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.completedResponses}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.completionRate}%</div>
            <Progress value={analytics.completionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatTime(analytics.averageCompletionTimeSeconds)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Question Analytics */}
      <Card>
        <CardHeader>
          <CardTitle>Question Statistics</CardTitle>
          <CardDescription>
            Response distribution per question
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(analytics.questionAnalytics).length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No question data available yet
              </p>
            ) : (
              Object.entries(analytics.questionAnalytics).map(([questionId, stats]) => (
                <div key={questionId} className="border-b pb-4 last:border-0">
                  <p className="font-medium mb-2">Question ID: {questionId}</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Responses:</span>{' '}
                      {stats.responseCount}
                    </div>
                    {stats.average !== undefined && (
                      <div>
                        <span className="text-muted-foreground">Average:</span>{' '}
                        {stats.average}
                      </div>
                    )}
                  </div>
                  {stats.distribution && (
                    <div className="mt-2">
                      <p className="text-sm text-muted-foreground mb-1">Distribution:</p>
                      <div className="space-y-1">
                        {Object.entries(stats.distribution).map(([option, count]) => (
                          <div key={option} className="flex items-center gap-2 text-sm">
                            <span className="flex-1">{option}</span>
                            <span className="text-muted-foreground">{count}</span>
                            <Progress 
                              value={(count / stats.responseCount) * 100} 
                              className="w-24"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
