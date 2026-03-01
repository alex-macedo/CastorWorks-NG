import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  QrCode, 
  Truck, 
  Package, 
  MapPin, 
  ChevronRight,
  TrendingDown,
  AlertTriangle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLocalization } from '@/contexts/LocalizationContext';
import { Container } from '@/components/Layout';
import { SidebarHeaderShell } from '@/components/Layout/SidebarHeaderShell';

export default function MobileLogisticsHome() {
  const navigate = useNavigate();
  const { t } = useLocalization();

  const actions = [
    {
      id: 'scanner',
      title: t('logistics:qrScanner') || 'Material Scanner',
      description: t('logistics:scanToUpdateStock') || 'Scan QR code to update inventory',
      icon: QrCode,
      color: 'bg-primary',
      path: '/mobile/logistics/scanner'
    },
    {
      id: 'deliveries',
      title: t('logistics:dailyDeliveries') || 'Daily Deliveries',
      description: t('logistics:trackOnMap') || 'Track incoming deliveries on map',
      icon: Truck,
      color: 'bg-blue-600',
      path: '/mobile/logistics/deliveries'
    },
    {
      id: 'inventory',
      title: t('logistics:inventoryLookup') || 'Inventory Lookup',
      description: t('logistics:checkStockLevels') || 'Browse and search project stock',
      icon: Package,
      color: 'bg-green-600',
      path: '/mobile/logistics/inventory'
    }
  ];

  return (
    <Container size="sm" className="pb-20">
      <div className="space-y-6">
        <SidebarHeaderShell variant="auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{t('logistics:mobileTitle') || 'Field Logistics'}</h1>
              <p className="text-sm text-sidebar-primary-foreground/80">
                {t('logistics:mobileSubtitle') || 'On-site tools for materials and supply chain.'}
              </p>
            </div>
          </div>
        </SidebarHeaderShell>

        <div className="grid gap-4">
          {actions.map((action) => (
            <Card 
              key={action.id} 
              className="active:scale-[0.98] transition-transform cursor-pointer border-none shadow-md overflow-hidden"
              onClick={() => navigate(action.path)}
            >
              <CardContent className="p-0">
                <div className="flex items-center">
                  <div className={`p-6 ${action.color} text-white`}>
                    <action.icon className="h-8 w-8" />
                  </div>
                  <div className="flex-1 p-4">
                    <h3 className="font-bold text-lg">{action.title}</h3>
                    <p className="text-xs text-muted-foreground">{action.description}</p>
                  </div>
                  <div className="px-4">
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Low Stock Alerts */}
        <Card className="border-orange-200 bg-orange-50/30">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <CardTitle className="text-sm font-bold text-orange-900">
                {t('logistics:criticalStockAlerts') || 'Critical Stock Alerts'}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-orange-800">
              {t('logistics:noCriticalAlerts') || 'No critical stock shortages detected today.'}
            </p>
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
