import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  Search, 
  Filter,
  ArrowUpDown,
  TrendingDown,
  AlertTriangle,
  Grid3X3,
  List
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MobileHeader } from '@/components/supervisor/MobileHeader';
import { MobileBottomNav } from '@/components/supervisor/MobileBottomNav';
import { PullToRefresh } from '@/components/supervisor/PullToRefresh';
import { SyncStatusBar } from '@/components/supervisor/SyncStatusBar';
import { cn } from '@/lib/utils';

export default function SupervisorInventory() {
  const navigate = useNavigate();
  const { t } = useLocalization();
  const { vibrate } = useHapticFeedback();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'project'>('name');

  // Fetch Inventory
  const { data: inventory, isLoading } = useQuery({
    queryKey: ['supervisorInventory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_inventory')
        .select('*, projects(name)')
        .order('item_name', { ascending: true });
      if (error) throw error;
      return data;
    }
  });

  const filteredItems = inventory?.filter(i => 
    i.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.projects?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort items
  const sortedItems = filteredItems?.sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.item_name.localeCompare(b.item_name);
      case 'stock':
        return a.current_stock - b.current_stock;
      case 'project':
        return (a.projects?.name || '').localeCompare(b.projects?.name || '');
      default:
        return 0;
    }
  });

  // Calculate stats
  const totalItems = sortedItems?.length || 0;
  const criticalItems = sortedItems?.filter(i => i.current_stock <= i.min_stock_level).length || 0;
  const lowStockItems = sortedItems?.filter(i => i.current_stock <= i.min_stock_level * 1.5).length || 0;

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      supabase.refetchQueries(['supervisorInventory'])
    ]);
    setRefreshing(false);
  };

  const handleItemClick = (item: any) => {
    vibrate('light');
    // Could navigate to item details or open a modal
    console.log('Item clicked:', item);
  };

  const handleSort = (sort: 'name' | 'stock' | 'project') => {
    vibrate('light');
    setSortBy(sort);
  };

  return (
    <>
      <SyncStatusBar />
      <PullToRefresh onRefresh={handleRefresh} disabled={refreshing}>
        <div className="supervisor-mobile min-h-screen pb-32 bg-background">
          {/* Mobile Header */}
          <MobileHeader
            onRefresh={handleRefresh}
            refreshing={refreshing}
            title={t('supervisor.logistics.inventory') || 'Inventory'}
          />

          <div className="p-4 space-y-6">
            {/* Page Title */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Package className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold">{t('supervisor.logistics.inventory') || 'Inventory'}</h1>
                <p className="text-sm text-muted-foreground">
                  {t('supervisor.logistics.checkStockLevels') || 'Browse and search project stock'}
                </p>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="bg-muted/30 border-muted">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold">{totalItems}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">{t('supervisor.logistics.totalItems') || 'Items'}</p>
                </CardContent>
              </Card>
              <Card className="bg-orange-50/50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{lowStockItems}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">{t('supervisor.logistics.lowStock') || 'Low Stock'}</p>
                </CardContent>
              </Card>
              <Card className="bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{criticalItems}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">{t('supervisor.logistics.critical') || 'Critical'}</p>
                </CardContent>
              </Card>
            </div>

            {/* Search and Filters */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input 
                  className="w-full pl-10 pr-4 py-3 rounded-full bg-muted/50 border-none text-sm focus:ring-2 focus:ring-primary"
                  placeholder={t('supervisor.logistics.searchInventory') || 'Search inventory...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -transform -translate-y-1/2 h-8 w-8 rounded-full">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>

              {/* Sort and View Options */}
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Button
                    variant={sortBy === 'name' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleSort('name')}
                    className="text-xs"
                  >
                    {t('supervisor.logistics.sortByName') || 'Name'}
                  </Button>
                  <Button
                    variant={sortBy === 'stock' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleSort('stock')}
                    className="text-xs"
                  >
                    {t('supervisor.logistics.sortByStock') || 'Stock'}
                  </Button>
                  <Button
                    variant={sortBy === 'project' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleSort('project')}
                    className="text-xs"
                  >
                    {t('supervisor.logistics.sortByProject') || 'Project'}
                  </Button>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => {
                      setViewMode('list');
                      vibrate('light');
                    }}
                    className="h-8 w-8"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => {
                      setViewMode('grid');
                      vibrate('light');
                    }}
                    className="h-8 w-8"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Critical Stock Alert */}
            {criticalItems > 0 && (
              <Card className="border-l-4 border-l-red-500 bg-red-50/30 dark:bg-red-950/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-red-900 dark:text-red-200">
                        {t('supervisor.logistics.criticalStockAlert') || 'Critical Stock Alert'}
                      </p>
                      <p className="text-xs text-red-800 dark:text-red-300">
                        {criticalItems} {t('supervisor.logistics.itemsNeedAttention') || 'items need immediate attention'}
                      </p>
                    </div>
                    <Badge variant="destructive" className="text-xs">
                      {criticalItems}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Inventory List/Grid */}
            <div className={cn(
              viewMode === 'grid' ? 'grid grid-cols-2 gap-3' : 'space-y-3'
            )}>
              {isLoading ? (
                <div className="text-center py-10 text-muted-foreground">
                  {t('supervisor.logistics.loading') || 'Loading...'}
                </div>
              ) : sortedItems?.length === 0 ? (
                <Card className="border-dashed border-2 border-muted-foreground/20">
                  <CardContent className="p-8 text-center">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold text-muted-foreground mb-2">
                      {t('supervisor.logistics.noItemsFound') || 'No Items Found'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t('supervisor.logistics.tryDifferentSearch') || 'Try adjusting your search terms.'}
                    </p>
                  </CardContent>
                </Card>
              ) : sortedItems?.map((item: any) => (
                <Card 
                  key={item.id} 
                  className={cn(
                    "active:scale-[0.98] transition-transform cursor-pointer overflow-hidden",
                    item.current_stock <= item.min_stock_level && "border-l-4 border-l-red-500",
                    viewMode === 'grid' && "h-full"
                  )}
                  onClick={() => handleItemClick(item)}
                >
                  <CardContent className={cn(
                    "p-4",
                    viewMode === 'grid' && "h-full flex flex-col justify-between"
                  )}>
                    <div className={cn(
                      "flex justify-between items-start",
                      viewMode === 'grid' && "flex-col gap-2"
                    )}>
                      <div className={cn("flex-1", viewMode === 'grid' && "text-center")}>
                        <h3 className="font-bold text-sm mb-1">{item.item_name}</h3>
                        <p className="text-[10px] text-muted-foreground mb-2">{item.sku || 'No SKU'}</p>
                        <p className="text-[10px] font-medium text-primary">{item.projects?.name}</p>
                      </div>
                      <div className={cn(
                        "text-right",
                        viewMode === 'grid' && "text-center mt-2"
                      )}>
                        <div className="flex items-center gap-1">
                          <Badge 
                            variant={item.current_stock <= item.min_stock_level ? 'destructive' : 'secondary'} 
                            className="text-xs"
                          >
                            {item.current_stock} {item.unit}
                          </Badge>
                          {item.current_stock <= item.min_stock_level && (
                            <TrendingDown className="h-3 w-3 text-red-500" />
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Min: {item.min_stock_level}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </PullToRefresh>

      {/* Bottom Navigation */}
      <MobileBottomNav />
    </>
  );
}
