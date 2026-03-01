import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ClientDefinitionsCard } from '../ClientDefinitionsCard'
import TestProviders from '@/test/utils/TestProviders'

const mockDefinition = {
  id: 'def-1',
  projectId: 'proj-1',
  definitionItem: 'Floor tile selection',
  description: 'Client to approve tile type',
  requiredByDate: new Date('2026-03-01'),
  status: 'pending' as const,
  assignedClientContact: 'John Smith',
  impactScore: 80,
  completionDate: null,
  notes: null,
  followUpHistory: [],
  createdBy: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

vi.mock('@/hooks/useClientDefinitions', () => ({
  useClientDefinitions: () => ({
    data: [mockDefinition],
    isLoading: false,
  }),
}))

describe('ClientDefinitionsCard', () => {
  it('renders definitions with status and impact score', () => {
    render(
      <TestProviders>
        <ClientDefinitionsCard projectId='proj-1' readOnly />
      </TestProviders>
    )
    expect(screen.getByText('Floor tile selection')).toBeInTheDocument()
    expect(screen.getByText('John Smith')).toBeInTheDocument()
    expect(screen.getByText(/80/)).toBeInTheDocument()
  })
})
