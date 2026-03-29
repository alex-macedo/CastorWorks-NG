import { useCampaigns } from '@/hooks/useCampaigns'

export const usePlatformCampaigns = () => useCampaigns({ scope: 'platform' })
