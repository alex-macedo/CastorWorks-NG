import { useNavigate } from 'react-router-dom'
import { useTenant } from '@/contexts/TenantContext'
import { useLocalization } from '@/contexts/LocalizationContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TenantPicker() {
  const { t } = useLocalization()
  const navigate = useNavigate()
  const { tenants, setTenantId } = useTenant()

  const handleSelect = (tenantId: string) => {
    setTenantId(tenantId)
    navigate('/', { replace: true })
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t('common:tenantPicker.title')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {tenants.map((tenant) => (
            <Button
              key={tenant.id}
              variant="outline"
              className="justify-start"
              onClick={() => handleSelect(tenant.id)}
            >
              {tenant.name}
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
