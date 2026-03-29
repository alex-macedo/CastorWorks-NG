/**
 * Wave 0 test scaffold for AIUsagePage component
 * Requirement: AI-04
 *
 * These tests are intentionally RED — source file
 * src/components/Settings/AIUsagePage.tsx does not exist yet
 * and will be created in Plan 03.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock the useAIUsage hook (source doesn't exist yet — will fail at import)
vi.mock('@/hooks/useAIUsage', () => ({
  useAIUsage: vi.fn(),
}))

// This import will fail (RED) until Plan 03 creates the component
import { AIUsagePage } from '@/components/Settings/AIUsagePage'
import { useAIUsage } from '@/hooks/useAIUsage'

const mockUseAIUsage = useAIUsage as ReturnType<typeof vi.fn>

const baseUsageData = {
  isLoading: false,
  error: null,
  usedThisMonth: 0,
  effectiveBudget: 500,
  isEnterprise: false,
  featureBreakdown: [
    { feature: 'ai-chat', total: 186 },
    { feature: 'summarize-meeting', total: 45 },
    { feature: 'analyze-site-photos', total: 36 },
  ],
  resetDate: '2026-04-01',
  consumeAIActions: vi.fn(),
}

// ---------------------------------------------------------------------------
// AI-04: AIUsagePage rendering states
// ---------------------------------------------------------------------------
describe('AI-04: AIUsagePage usage display', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders progress bar with "X / Y AI Actions used this month"', () => {
    mockUseAIUsage.mockReturnValue({
      ...baseUsageData,
      usedThisMonth: 412,
      effectiveBudget: 500,
    })

    render(<AIUsagePage />)

    // Should display used and total in the progress bar label
    expect(screen.getByText(/412/)).toBeInTheDocument()
    expect(screen.getByText(/500/)).toBeInTheDocument()
    // Should mention "AI Actions" somewhere nearby
    expect(screen.getByText(/AI Actions/i)).toBeInTheDocument()
  })

  it('shows badge near the component at 80% usage', () => {
    // 80% of 500 = 400 actions used
    mockUseAIUsage.mockReturnValue({
      ...baseUsageData,
      usedThisMonth: 400,
      effectiveBudget: 500,
    })

    render(<AIUsagePage />)

    // A badge element should be visible at 80% — could be a chip, tag, or icon
    // The badge should NOT be an app-wide banner; it's localized to this component
    const badge = screen.queryByRole('status') || screen.queryByTestId('usage-badge')
    expect(badge).not.toBeNull()
  })

  it('renders inline nudge at 100% usage without blocking modal', () => {
    mockUseAIUsage.mockReturnValue({
      ...baseUsageData,
      usedThisMonth: 500,
      effectiveBudget: 500,
    })

    render(<AIUsagePage />)

    // Should show the degradation nudge text
    expect(
      screen.getByText(/Running on reduced AI/i)
    ).toBeInTheDocument()

    // Must NOT render a blocking dialog/modal
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('renders no badge and no nudge when isEnterprise = true', () => {
    mockUseAIUsage.mockReturnValue({
      ...baseUsageData,
      usedThisMonth: 99999,
      effectiveBudget: null,
      isEnterprise: true,
    })

    render(<AIUsagePage />)

    // Enterprise: unlimited — no degradation signals at all
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.queryByTestId('usage-badge')).toBeNull()
    expect(screen.queryByText(/Running on reduced AI/i)).toBeNull()
    expect(screen.queryByText(/Get More Actions/i)).toBeNull()
  })
})
