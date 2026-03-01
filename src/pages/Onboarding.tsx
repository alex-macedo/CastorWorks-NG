import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useTenant } from '@/contexts/TenantContext'
import { useLocalization } from '@/contexts/LocalizationContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'workspace'
}

export default function Onboarding() {
  const { t } = useLocalization()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { setTenantId, refreshTenants } = useTenant()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [loading, setLoading] = useState(false)

  const handleNameChange = (value: string) => {
    setName(value)
    if (!slug || slug === slugify(name)) {
      setSlug(slugify(value))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) return
    const finalSlug = (slug || slugify(name)).trim() || slugify(name)
    const finalName = name.trim()
    if (!finalName) return

    setLoading(true)
    try {
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({ name: finalName, slug: finalSlug })
        .select('id')
        .single()

      if (tenantError) {
        console.error('[Onboarding] Tenant insert failed:', tenantError)
        toast.error(t('common:onboarding.errorCreating'))
        return
      }

      const { error: memberError } = await supabase.from('tenant_users').insert({
        tenant_id: tenant.id,
        user_id: user.id,
        role: 'admin',
        is_owner: true,
      })

      if (memberError) {
        console.error('[Onboarding] tenant_users insert failed:', memberError)
        toast.error(t('common:onboarding.errorCreating'))
        return
      }

      setTenantId(tenant.id)
      await refreshTenants()
      navigate('/', { replace: true })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t('common:onboarding.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="onboarding-name">{t('common:onboarding.companyName')}</Label>
              <Input
                id="onboarding-name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder={t('common:onboarding.companyName')}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="onboarding-slug">{t('common:onboarding.slugOptional')}</Label>
              <Input
                id="onboarding-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder={slugify(name) || 'workspace'}
                disabled={loading}
              />
            </div>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? t('common:onboarding.creating') : t('common:onboarding.create')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
