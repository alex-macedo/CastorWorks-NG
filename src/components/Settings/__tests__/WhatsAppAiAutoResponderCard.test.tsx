/**
 * Unit tests for WA-8.1 WhatsApp AI Auto-Responder card
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { WhatsAppAiAutoResponderCard } from '../WhatsAppAiAutoResponderCard'

const mockSetAiAutoResponderEnabled = vi.fn()
vi.mock('@/hooks/useWhatsAppIntegrationSettings', () => ({
  useWhatsAppIntegrationSettings: () => ({
    settings: { configuration: { ai_auto_responder_enabled: false } },
    isLoading: false,
    setAiAutoResponderEnabled: mockSetAiAutoResponderEnabled,
    isUpdating: false,
  }),
}))

const mockToast = vi.fn()
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}))

vi.mock('@/contexts/LocalizationContext', () => ({
  useLocalization: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'admin:whatsapp.aiAutoResponder.enabled': 'AI Auto-Responder',
        'admin:whatsapp.aiAutoResponder.description': 'CastorMind AI answers WhatsApp queries.',
        'admin:whatsapp.aiAutoResponder.requiresContacts': 'Link contacts to projects.',
        'settings:integrations.whatsapp.saved': 'Settings saved',
        'settings:integrations.whatsapp.aiAutoResponderEnabled': 'AI enabled',
        'settings:integrations.whatsapp.aiAutoResponderDisabled': 'AI disabled',
        'common:errorTitle': 'Error',
      }
      return map[key] ?? key
    },
  }),
}))

describe('WhatsAppAiAutoResponderCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSetAiAutoResponderEnabled.mockResolvedValue(undefined)
  })

  it('renders AI Auto-Responder toggle when loaded', () => {
    render(<WhatsAppAiAutoResponderCard />)
    expect(screen.getAllByText('AI Auto-Responder').length).toBeGreaterThan(0)
    expect(screen.getByText('CastorMind AI answers WhatsApp queries.')).toBeInTheDocument()
    const switchEl = screen.getByRole('switch')
    expect(switchEl).toBeInTheDocument()
    expect(switchEl).not.toBeChecked()
  })

  it('toggles AI auto-responder and shows success toast', async () => {
    render(<WhatsAppAiAutoResponderCard />)
    const switchEl = screen.getByRole('switch')
    fireEvent.click(switchEl)

    await waitFor(() => {
      expect(mockSetAiAutoResponderEnabled).toHaveBeenCalledWith(true)
    })
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Settings saved',
        description: 'AI enabled',
      })
    )
  })
})
