// Story 3.5: PO Empty State Component
// Displays when no purchase orders exist

import { Card, CardContent } from '@/components/ui/card'
import { FileText } from 'lucide-react'

export const POEmptyState: React.FC = () => {
  return (
    <Card className="mt-8">
      <CardContent className="flex flex-col items-center justify-center py-16">
        <FileText className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Purchase Orders Yet</h3>
        <p className="text-muted-foreground text-center max-w-md">
          Purchase orders will appear here when customers approve quotes.
          The system will automatically generate POs from approved quotes.
        </p>
      </CardContent>
    </Card>
  )
}
