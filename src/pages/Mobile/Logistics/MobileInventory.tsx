import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  Search, 
  ChevronLeft,
  Filter,
  ArrowUpDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Container } from '@/components/Layout';

export default function MobileInventory() {
  const navigate = useNavigate();
  const { t } = useLocalization();
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch Inventory
  const { data: inventory, isLoading } = useQuery({
    queryKey: ['mobileInventory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_inventory')
        .select('*, projects(name)');
      if (error) throw error;
      return data;
    }
  });

  const filteredItems = inventory?.filter(i => 
    i.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.projects?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Container size="sm" className="pb-20">
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate('/mobile/logistics')}>
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-xl font-bold">{t('logistics:inventory') || 'Inventory'}</h1>
        </div>

        {/* Search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              className="w-full pl-10 pr-4 py-2 rounded-full bg-muted/50 border-none text-sm"
              placeholder={t('logistics:searchInventory') || 'Search items...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon" className="rounded-full">
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        {/* Inventory List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-10 text-muted-foreground">Loading stock...</div>
          ) : filteredItems?.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed rounded-2xl">
              <p className="text-muted-foreground">{t('logistics:noItemsFound') || 'No inventory items found.'}</p>
            </div>
          ) : filteredItems?.map((item: any) => (
            <Card key={item.id} className="border-none shadow-sm overflow-hidden">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-sm">{item.item_name}</h3>
                    <p className="text-[10px] text-muted-foreground">{item.sku || 'No SKU'}</p>
                    <p className="text-[10px] font-medium text-primary mt-1">{item.projects?.name}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={item.current_stock <= item.min_stock_level ? 'destructive' : 'secondary'} className="text-xs">
                      {item.current_stock} {item.unit}
                    </Badge>
                    <p className="text-[10px] text-muted-foreground mt-1">Min: {item.min_stock_level}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Container>
  );
}
