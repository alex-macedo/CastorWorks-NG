import { useState, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/components/ui/use-toast'

interface GoogleCalendarTokens {
  access_token: string
  refresh_token?: string
  token_type: string
  expires_at: string
}

interface GoogleCalendarConnection {
  isConnected: boolean
  email?: string
  connectedAt?: string
}

interface SyncResult {
  success: boolean
  synced: number
  shared?: number
  errors?: string[]
}

export function useGoogleCalendar(projectId?: string) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [connection, setConnection] = useState<GoogleCalendarConnection>({ isConnected: false })
  const { toast } = useToast()

  // Check if Google Calendar is connected
  const checkConnection = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('google_calendar_tokens')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) throw error

      if (data) {
        setConnection({
          isConnected: true,
          email: data.email,
          connectedAt: data.created_at
        })
        return true
      }

      setConnection({ isConnected: false })
      return false
    } catch (error) {
      console.error('Error checking Google Calendar connection:', error)
      return false
    }
  }, [])

  // Initialize OAuth flow
  const connect = useCallback(async (userId: string, projectId?: string) => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-oauth', {
        body: { projectId }
      })

      if (error) throw error

      if (data?.oauthUrl) {
        // Store state for verification
        sessionStorage.setItem('google_oauth_state', data.state)
        
        // Redirect to Google OAuth
        window.location.href = data.oauthUrl
      } else {
        throw new Error('Failed to get OAuth URL')
      }
    } catch (error) {
      console.error('Error connecting Google Calendar:', error)
      toast({
        title: 'Connection Failed',
        description: error instanceof Error ? error.message : 'Failed to connect Google Calendar',
        variant: 'destructive'
      })
      setIsLoading(false)
    }
  }, [toast])

  // Handle OAuth callback - store tokens
  const handleCallback = useCallback(async (tokens: GoogleCalendarTokens, userId: string) => {
    setIsLoading(true)
    try {
      const { error } = await supabase.from('google_calendar_tokens').upsert({
        user_id: userId,
        project_id: projectId || null,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_type: tokens.token_type,
        expires_at: tokens.expires_at,
        email: '' // Will be updated after user info fetch
      }, {
        onConflict: 'user_id,project_id'
      })

      if (error) throw error

      setConnection({
        isConnected: true,
        connectedAt: new Date().toISOString()
      })

      toast({
        title: 'Connected!',
        description: 'Google Calendar has been connected successfully',
      })
    } catch (error) {
      console.error('Error storing tokens:', error)
      toast({
        title: 'Connection Failed',
        description: 'Failed to save calendar credentials',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }, [projectId, toast])

  // Disconnect Google Calendar
  const disconnect = useCallback(async (userId: string) => {
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('google_calendar_tokens')
        .delete()
        .eq('user_id', userId)

      if (error) throw error

      setConnection({ isConnected: false })
      
      toast({
        title: 'Disconnected',
        description: 'Google Calendar has been disconnected',
      })
    } catch (error) {
      console.error('Error disconnecting Google Calendar:', error)
      toast({
        title: 'Error',
        description: 'Failed to disconnect Google Calendar',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  // Sync events to Google Calendar
  const syncEvents = useCallback(async (
    userId: string, 
    eventTypes: string[] = ['activities', 'meetings'],
    shareWith: string[] = []
  ): Promise<SyncResult | null> => {
    if (!projectId) {
      toast({
        title: 'Error',
        description: 'No project selected',
        variant: 'destructive'
      })
      return null
    }

    setIsSyncing(true)
    try {
      const { data, error } = await supabase.functions.invoke('sync-all-calendars', {
        body: {
          projectId,
          userId,
          eventTypes,
          shareWith
        }
      })

      if (error) throw error

      if (data?.success) {
        toast({
          title: 'Sync Complete',
          description: `Synced ${data.synced} events${data.shared ? `, shared with ${data.shared} users` : ''}`,
        })
        return data
      } else {
        throw new Error(data?.error || 'Sync failed')
      }
    } catch (error) {
      console.error('Error syncing calendar:', error)
      toast({
        title: 'Sync Failed',
        description: error instanceof Error ? error.message : 'Failed to sync calendar',
        variant: 'destructive'
      })
      return null
    } finally {
      setIsSyncing(false)
    }
  }, [projectId, toast])

  return {
    isLoading,
    isSyncing,
    connection,
    checkConnection,
    connect,
    handleCallback,
    disconnect,
    syncEvents
  }
}
