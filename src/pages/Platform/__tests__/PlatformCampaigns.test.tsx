import { render } from '@testing-library/react'
import PlatformCampaigns from '../PlatformCampaigns'

const mockCreateCampaign = {
  mutateAsync: vi.fn(),
  isPending: false,
}

const mockUsePlatformCampaigns = vi.fn(() => ({
  campaigns: [],
  isLoading: false,
  error: null,
  createCampaign: mockCreateCampaign,
  executeCampaign: { mutateAsync: vi.fn(), mutate: vi.fn() },
  cancelCampaign: { mutateAsync: vi.fn(), mutate: vi.fn() },
  deleteCampaign: { mutateAsync: vi.fn(), mutate: vi.fn() },
}))

const mockCampaignSheet = vi.fn(() => null)

vi.mock('@/contexts/LocalizationContext', () => ({
  useLocalization: () => ({ t: (key: string) => key }),
}))

vi.mock('@/hooks/usePlatformCampaigns', () => ({
  usePlatformCampaigns: () => mockUsePlatformCampaigns(),
}))

vi.mock('@/components/Layout/SidebarHeaderShell', () => ({
  SidebarHeaderShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/Platform/Campaigns/CampaignSheet', () => ({
  CampaignSheet: (props: unknown) => {
    mockCampaignSheet(props)
    return null
  },
}))

describe('PlatformCampaigns', () => {
  it('uses the platform-scoped campaigns hook and passes its create mutation to the sheet', () => {
    render(<PlatformCampaigns />)

    expect(mockUsePlatformCampaigns).toHaveBeenCalledTimes(1)
    expect(mockCampaignSheet).toHaveBeenCalledWith(
      expect.objectContaining({
        createCampaign: mockCreateCampaign,
      })
    )
  })
})
