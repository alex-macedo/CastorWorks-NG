/**
 * AIRecommendationList - Actionable AI Recommendations Component
 *
 * Displays AI recommendations with:
 * - Priority badges
 * - Expected impact display
 * - Accept/Reject actions
 * - Implementation status tracking
 * - Filtering and grouping
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDateFormat } from '@/hooks/useDateFormat';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Lightbulb,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  DollarSign,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocalization } from "@/contexts/LocalizationContext";

export interface Recommendation {
  id: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description: string;
  reasoning?: string;
  expectedImpact?: {
    savings?: number;
    timeSavedDays?: number;
    riskReduction?: number;
    [key: string]: any;
  };
  actionType?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'applied' | 'expired';
  createdAt?: string;
  expiresAt?: string;
}

export interface AIRecommendationListProps {
  recommendations: Recommendation[];
  onAccept?: (id: string) => void;
  onReject?: (id: string, reason: string) => void;
  onViewDetails?: (recommendation: Recommendation) => void;
  groupBy?: 'priority' | 'category' | 'none';
  showImpact?: boolean;
  filterStatus?: 'all' | 'pending' | 'accepted' | 'rejected' | 'applied';
  className?: string;
}

export const AIRecommendationList: React.FC<AIRecommendationListProps> = ({
  recommendations,
  onAccept,
  onReject,
  onViewDetails,
  groupBy = 'none',
  showImpact = true,
  filterStatus = 'all',
  className,
}) => {
  const { formatDate } = useDateFormat();
  const [selectedRec, setSelectedRec] = useState<Recommendation | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Filter recommendations by status
  const filteredRecommendations =
    filterStatus === 'all'
      ? recommendations
      : recommendations.filter((r) => r.status === filterStatus);

  // Group recommendations
  const groupedRecommendations = groupRecommendations(filteredRecommendations, groupBy);

  // Priority styling
  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return { variant: 'destructive' as const, icon: AlertTriangle, color: 'text-red-500' };
      case 'high':
        return { variant: 'default' as const, icon: TrendingUp, color: 'text-orange-500' };
      case 'medium':
        return { variant: 'secondary' as const, icon: Clock, color: 'text-yellow-500' };
      case 'low':
        return { variant: 'outline' as const, icon: Clock, color: 'text-blue-500' };
      default:
        return { variant: 'outline' as const, icon: Clock, color: 'text-gray-500' };
    }
  };

  // Status styling
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'accepted':
      case 'applied':
        return { variant: 'default' as const, icon: CheckCircle, text: status };
      case 'rejected':
        return { variant: 'destructive' as const, icon: XCircle, text: status };
      case 'expired':
        return { variant: 'outline' as const, icon: Clock, text: status };
      default:
        return { variant: 'secondary' as const, icon: Clock, text: 'pending' };
    }
  };

  const handleAccept = (rec: Recommendation) => {
    if (onAccept) {
      onAccept(rec.id);
    }
  };

  const handleRejectClick = (rec: Recommendation) => {
    setSelectedRec(rec);
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = () => {
    if (onReject && selectedRec) {
      onReject(selectedRec.id, rejectionReason);
      setRejectDialogOpen(false);
      setRejectionReason('');
      setSelectedRec(null);
    }
  };

  if (filteredRecommendations.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center">
          <Lightbulb className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
          <p className="mt-2 text-sm text-muted-foreground">{t("aiComponent.noRecommendations")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className={cn('space-y-4', className)}>
        {Object.entries(groupedRecommendations).map(([group, recs]) => (
          <div key={group}>
            {groupBy !== 'none' && (
              <h3 className="mb-2 text-sm font-semibold capitalize">
                {group.replace(/_/g, ' ')}
              </h3>
            )}
            <div className="space-y-3">
              {recs.map((rec) => {
                const priorityConfig = getPriorityConfig(rec.priority);
                const statusConfig = getStatusConfig(rec.status);
                const PriorityIcon = priorityConfig.icon;
                const StatusIcon = statusConfig.icon;

                return (
                  <Card key={rec.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <PriorityIcon className={cn('h-4 w-4', priorityConfig.color)} />
                            <CardTitle className="text-base">{rec.title}</CardTitle>
                          </div>
                          <CardDescription className="mt-1">{rec.description}</CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant={priorityConfig.variant} className="capitalize">
                            {rec.priority}
                          </Badge>
                          <Badge variant={statusConfig.variant} className="capitalize gap-1">
                            <StatusIcon className="h-3 w-3" />
                            {statusConfig.text}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      {/* Reasoning */}
                      {rec.reasoning && (
                        <div className="rounded-lg bg-muted/50 p-3">
                          <p className="text-xs font-medium text-muted-foreground">{t("aiComponent.why")}</p>
                          <p className="mt-1 text-sm">{rec.reasoning}</p>
                        </div>
                      )}

                      {/* Expected Impact */}
                      {showImpact && rec.expectedImpact && (
                        <div className="grid gap-2 sm:grid-cols-3">
                          {rec.expectedImpact.savings !== undefined && (
                            <div className="flex items-center gap-2 rounded-lg border p-2">
                              <DollarSign className="h-4 w-4 text-green-500" />
                              <div>
                                <p className="text-xs text-muted-foreground">Savings</p>
                                <p className="text-sm font-medium">
                                  ${rec.expectedImpact.savings.toLocaleString()}
                                </p>
                              </div>
                            </div>
                          )}
                          {rec.expectedImpact.timeSavedDays !== undefined && (
                            <div className="flex items-center gap-2 rounded-lg border p-2">
                              <Calendar className="h-4 w-4 text-blue-500" />
                              <div>
                                <p className="text-xs text-muted-foreground">{t("aiComponent.timeSaved")}</p>
                                <p className="text-sm font-medium">
                                  {rec.expectedImpact.timeSavedDays} days
                                </p>
                              </div>
                            </div>
                          )}
                          {rec.expectedImpact.riskReduction !== undefined && (
                            <div className="flex items-center gap-2 rounded-lg border p-2">
                              <TrendingUp className="h-4 w-4 text-orange-500" />
                              <div>
                                <p className="text-xs text-muted-foreground">{t("aiComponent.riskReduction")}</p>
                                <p className="text-sm font-medium">
                                  {rec.expectedImpact.riskReduction}%
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Expiration Warning */}
                      {rec.expiresAt && rec.status === 'pending' && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Expires {formatDate(rec.expiresAt)}
                        </div>
                      )}

                      {/* Actions */}
                      {rec.status === 'pending' && (
                        <div className="flex gap-2">
                          {onAccept && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleAccept(rec)}
                              className="gap-1"
                            >
                              <CheckCircle className="h-4 w-4" />
                              Accept
                            </Button>
                          )}
                          {onReject && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRejectClick(rec)}
                              className="gap-1"
                            >
                              <XCircle className="h-4 w-4" />
                              Reject
                            </Button>
                          )}
                          {onViewDetails && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onViewDetails(rec)}
                            >
                              View Details
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Recommendation</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this recommendation. This helps improve
              future suggestions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm font-medium">{selectedRec?.title}</p>
            <Textarea
              placeholder={t("additionalPlaceholders.rejectReason")}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={!rejectionReason.trim()}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

/**
 * Group recommendations by specified criteria
 */
function groupRecommendations(
  recommendations: Recommendation[],
  groupBy: 'priority' | 'category' | 'none'
): Record<string, Recommendation[]> {
  if (groupBy === 'none') {
    return { all: recommendations };
  }

  const grouped: Record<string, Recommendation[]> = {};

  recommendations.forEach((rec) => {
    const key = groupBy === 'priority' ? rec.priority : rec.category;
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(rec);
  });

  // Sort groups by priority
  if (groupBy === 'priority') {
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    const sortedKeys = Object.keys(grouped).sort(
      (a, b) => priorityOrder[a as keyof typeof priorityOrder] - priorityOrder[b as keyof typeof priorityOrder]
    );
    const sortedGrouped: Record<string, Recommendation[]> = {};
    sortedKeys.forEach((key) => {
      sortedGrouped[key] = grouped[key];
    });
    return sortedGrouped;
  }

  return grouped;
}
