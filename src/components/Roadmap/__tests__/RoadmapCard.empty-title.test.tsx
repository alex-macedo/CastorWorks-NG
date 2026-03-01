import { render, screen } from '@testing-library/react'
import { describe, it, vi } from 'vitest'
import { RoadmapCard } from '../RoadmapCard'
import TestProviders from '@/test/utils/TestProviders'

vi.mock('@/hooks/useRoadmapItems', () => ({
  useToggleUpvote: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

vi.mock('@/hooks/useSprints', () => ({
  useOpenSprint: () => ({ data: null }),
}))

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: () => Promise.resolve({ data: { user: null }, error: null }) },
  },
}))

const emptyTitleItem = {
  id: 'test-id',
  title: '',
  description: null,
  category: 'feature',
  upvotes: 0,
  comments_count: 0,
  status: 'backlog',
  created_at: '2025-01-01T00:00:00Z',
}

describe('RoadmapCard empty title/description', () => {
  it('renders untitled fallback when title is empty', () => {
    render(
      <TestProviders>
        <RoadmapCard item={emptyTitleItem} />
      </TestProviders>
    )
    expect(screen.getByText(/untitledTask/i)).toBeInTheDocument()
  })

  it('renders with empty description without crashing', () => {
    const itemWithDesc = { ...emptyTitleItem, description: '' }
    render(
      <TestProviders>
        <RoadmapCard item={itemWithDesc} />
      </TestProviders>
    )
    expect(screen.getByText(/untitledTask/i)).toBeInTheDocument()
  })
})
