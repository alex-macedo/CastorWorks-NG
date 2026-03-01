import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLocalization } from '@/contexts/LocalizationContext'
import { toast } from 'sonner'

export default function ForgotPassword() {
  const { t } = useLocalization()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      toast.error(t('auth:forgotPassword.validation.emailRequired'))
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/login`
      })
      if (error) throw error
      setSent(true)
      toast.success(t('auth:forgotPassword.messages.checkEmail'))
    } catch (err: unknown) {
      const rawMessage = err instanceof Error ? err.message : String(err ?? '')
      const isRecoveryEmailError = /error sending recovery email|recovery email/i.test(rawMessage)
      const message = isRecoveryEmailError
        ? t('auth:forgotPassword.messages.recoveryEmailNotConfigured')
        : rawMessage || t('auth:forgotPassword.messages.error')
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(to bottom right, #f8fafc, #e2e8f0)',
          padding: '1rem'
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '28rem',
            borderRadius: '0.5rem',
            border: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)'
          }}
        >
          <div style={{ padding: '1.5rem' }}>
            <h1 className="text-xl font-semibold text-slate-900">
              {t('auth:forgotPassword.title')}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {t('auth:forgotPassword.messages.sentDescription')}
            </p>
            <Button asChild variant="outline" className="mt-4 w-full">
              <Link to="/login">{t('auth:forgotPassword.backToLogin')}</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(to bottom right, #f8fafc, #e2e8f0)',
        padding: '1rem'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '28rem',
          borderRadius: '0.5rem',
          border: '1px solid #e2e8f0',
          backgroundColor: '#ffffff',
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)'
        }}
      >
        <div style={{ padding: '1.5rem' }}>
          <h1 className="text-xl font-semibold text-slate-900">
            {t('auth:forgotPassword.title')}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {t('auth:forgotPassword.description')}
          </p>
        </div>
        <div style={{ padding: '0 1.5rem 1.5rem' }}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="forgot-email">{t('auth:login.emailLabel')}</Label>
              <Input
                id="forgot-email"
                type="email"
                placeholder={t('auth:login.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? t('auth:login.loading') : t('auth:forgotPassword.submit')}
            </Button>
            <Button asChild variant="ghost" type="button">
              <Link to="/login" className="w-full">
                {t('auth:forgotPassword.backToLogin')}
              </Link>
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
