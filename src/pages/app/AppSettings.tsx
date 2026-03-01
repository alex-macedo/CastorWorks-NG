import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MobileTopNav } from '@/components/app/MobileTopNav'
import { MobileAppBottomNav } from '@/components/app/MobileAppBottomNav'
import { useUserProfile } from '@/hooks/useUserProfile'
import { useUserPreferences } from '@/hooks/useUserPreferences'
import { useAppSettings } from '@/hooks/useAppSettings'
import { useCompanySettings } from '@/hooks/useCompanySettings'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import {
  User,
  Bell,
  Lock,
  Globe,
  Moon,
  Sun,
  LogOut,
  Building2,
  Loader2,
} from 'lucide-react'
import { EditProfileDialog } from '@/components/Settings/EditProfileDialog'
import { ChangePasswordDialog } from '@/components/Settings/ChangePasswordDialog'
import { NotificationPreferencesDialog } from '@/components/Settings/NotificationPreferencesDialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useLocalization, languageMetadata } from '@/contexts/LocalizationContext'
import { useTheme } from 'next-themes'

export default function AppSettings() {
  const navigate = useNavigate()
  const { t } = useTranslation('app')
  const { setLanguage, setCurrency, language, currency } = useLocalization()
  const { theme, setTheme } = useTheme()
  const { data: currentUser, isLoading: isProfileLoading } = useUserProfile()
  const { settings: companySettings } = useCompanySettings()

  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false)
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [isNotificationsDialogOpen, setIsNotificationsDialogOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLanguageChange = (value: string) => {
    setLanguage(value as any)
    toast.success(t('settings.languageUpdated'))
  }

  const handleCurrencyChange = (value: string) => {
    setCurrency(value as any)
    toast.success(t('settings.currencyUpdated'))
  }

  const handleThemeChange = (value: string) => {
    setTheme(value)
    toast.success(t('settings.themeUpdated'))
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      toast.success(t('settings.loggedOut', 'Successfully logged out'))
      navigate('/login')
    } catch (error) {
      console.error('Logout error:', error)
      toast.error(t('settings.logoutError', 'Failed to log out'))
    }
  }

  return (
    <div className="min-h-screen bg-black pb-20">
      <MobileTopNav onOpenSidebar={() => setSidebarOpen(true)} />

      <div className="p-4 space-y-4">
        {/* User Profile Section */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <User className="w-5 h-5" />
              {t('settings.profile')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16 border border-zinc-800">
                <AvatarImage src={currentUser?.avatar_url || undefined} />
                <AvatarFallback className="bg-zinc-800">
                  <User className="w-8 h-8 text-zinc-400" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                {isProfileLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
                ) : (
                  <>
                    <p className="text-white font-medium truncate">{currentUser?.display_name || t('settings.noName')}</p>
                    <p className="text-zinc-400 text-sm truncate">{currentUser?.email}</p>
                  </>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
              onClick={() => setIsProfileDialogOpen(true)}
            >
              {t('settings.editProfile')}
            </Button>
          </CardContent>
        </Card>

        {/* Company Info */}
        {companySettings && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                {t('settings.company')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-zinc-400 text-sm">{t('settings.companyName')}</Label>
                <p className="text-white">{companySettings.company_name}</p>
              </div>
              {companySettings.email && (
                <div>
                  <Label className="text-zinc-400 text-sm">{t('settings.email')}</Label>
                  <p className="text-white">{companySettings.email}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Localization Settings */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Globe className="w-5 h-5" />
              {t('settings.localization')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-zinc-400">{t('settings.language')}</Label>
              <Select value={language} onValueChange={handleLanguageChange}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue placeholder={t('settings.selectLanguage', 'Select Language')} />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {Object.entries(languageMetadata).map(([code, meta]) => (
                    <SelectItem key={code} value={code}>
                      <span className="flex items-center gap-2 text-white">
                        <span className="text-lg">{meta.flag}</span>
                        <span>{meta.nativeName}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-400">{t('settings.currency')}</Label>
              <Select value={currency} onValueChange={handleCurrencyChange}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue placeholder={t('settings.selectCurrency', 'Select Currency')} />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="USD" className="text-white">
                    <span className="flex items-center gap-2">
                      <span className="text-lg">💵</span>
                      <span>USD ($)</span>
                    </span>
                  </SelectItem>
                  <SelectItem value="EUR" className="text-white">
                    <span className="flex items-center gap-2">
                      <span className="text-lg">💶</span>
                      <span>EUR (€)</span>
                    </span>
                  </SelectItem>
                  <SelectItem value="BRL" className="text-white">
                    <span className="flex items-center gap-2">
                      <span className="text-lg">💴</span>
                      <span>R$</span>
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-400">{t('settings.theme')}</Label>
              <Select 
                value={theme} 
                onValueChange={(value) => handleThemeChange(value)}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue placeholder={t('settings.selectTheme', 'Select Theme')} />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="light" className="text-white">
                    <span className="flex items-center gap-2">
                      <Sun className="w-4 h-4" />
                      {t('settings.light')}
                    </span>
                  </SelectItem>
                  <SelectItem value="dark" className="text-white">
                    <span className="flex items-center gap-2">
                      <Moon className="w-4 h-4" />
                      {t('settings.dark')}
                    </span>
                  </SelectItem>
                  <SelectItem value="system" className="text-white">
                    <span className="flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      {t('settings.system')}
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Bell className="w-5 h-5" />
              {t('settings.notifications')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
              onClick={() => setIsNotificationsDialogOpen(true)}
            >
              {t('settings.manageNotifications')}
            </Button>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Lock className="w-5 h-5" />
              {t('settings.security')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
              onClick={() => setIsPasswordDialogOpen(true)}
            >
              {t('settings.changePassword')}
            </Button>
          </CardContent>
        </Card>

        {/* Logout */}
        <Button
          variant="destructive"
          className="w-full bg-red-600 hover:bg-red-700 mt-4"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          {t('settings.logout')}
        </Button>
      </div>

      <MobileAppBottomNav />

      {/* Dialogs */}
      <EditProfileDialog
        userId={currentUser?.id || ''}
        open={isProfileDialogOpen}
        onClose={() => setIsProfileDialogOpen(false)}
      />
      <ChangePasswordDialog
        open={isPasswordDialogOpen}
        onClose={() => setIsPasswordDialogOpen(false)}
      />
      <NotificationPreferencesDialog
        open={isNotificationsDialogOpen}
        onClose={() => setIsNotificationsDialogOpen(false)}
      />
    </div>
  )
}
