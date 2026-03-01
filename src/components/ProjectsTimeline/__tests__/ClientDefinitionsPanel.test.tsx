import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ClientDefinitionsPanel } from '../ClientDefinitionsPanel'
import TestProviders from '@/test/utils/TestProviders'
import type { ClientDefinition } from '@/types/timeline'

const createDefinition = (overrides: Partial<ClientDefinition> = {}): ClientDefinition => ({
  id: 'def-1',
  projectId: 'proj-1',
  milestoneId: null,
  definitionItem: 'Floor tile selection',
  definitionType: 'other',
  description: 'Choose tiles for bathroom',
  requiredByDate: new Date('2026-03-15'),
  status: 'pending',
  assignedClientContact: 'John Smith',
  impactScore: 50,
  completionDate: null,
  notes: null,
  followUpHistory: [],
  createdBy: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

describe('ClientDefinitionsPanel', () => {
  it('renders panel with title', () => {
    render(
      <TestProviders>
        <ClientDefinitionsPanel definitions={[]} />
      </TestProviders>
    )

    expect(screen.getByTestId('client-definitions-panel')).toBeInTheDocument()
    expect(screen.getByText('timeline.clientDefinitions.title')).toBeInTheDocument()
  })

  it('shows empty state when no definitions', () => {
    render(
      <TestProviders>
        <ClientDefinitionsPanel definitions={[]} />
      </TestProviders>
    )

    expect(screen.getByText('timeline.clientDefinitions.noDefinitions')).toBeInTheDocument()
  })

  it('renders add button when onAddDefinition provided', () => {
    const onAddDefinition = vi.fn()
    render(
      <TestProviders>
        <ClientDefinitionsPanel
          definitions={[]}
          onAddDefinition={onAddDefinition}
        />
      </TestProviders>
    )

    const addButton = screen.getByTestId('add-definition-button')
    expect(addButton).toBeInTheDocument()
    fireEvent.click(addButton)
    expect(onAddDefinition).toHaveBeenCalled()
  })

  it('does not show add button when onAddDefinition not provided', () => {
    render(
      <TestProviders>
        <ClientDefinitionsPanel definitions={[]} />
      </TestProviders>
    )

    expect(screen.queryByTestId('add-definition-button')).not.toBeInTheDocument()
  })

  it('renders definition rows with item and status', () => {
    const def1 = createDefinition({ id: 'def-1', definitionItem: 'Tile selection' })
    const def2 = createDefinition({ id: 'def-2', definitionItem: 'Kitchen layout', status: 'completed' })

    render(
      <TestProviders>
        <ClientDefinitionsPanel definitions={[def1, def2]} />
      </TestProviders>
    )

    expect(screen.getByTestId('definition-row-def-1')).toBeInTheDocument()
    expect(screen.getByTestId('definition-row-def-2')).toBeInTheDocument()
    expect(screen.getByText('Tile selection')).toBeInTheDocument()
    expect(screen.getByText('Kitchen layout')).toBeInTheDocument()
    expect(screen.getByText('timeline.clientDefinitions.statuses.pending')).toBeInTheDocument()
    expect(screen.getByText('timeline.clientDefinitions.statuses.completed')).toBeInTheDocument()
  })

  it('shows overdue and blocking badges when applicable', () => {
    const pastDue = createDefinition({
      id: 'past-due',
      requiredByDate: new Date('2020-01-01'),
      status: 'pending',
    })
    const blocking = createDefinition({
      id: 'blocking',
      status: 'blocking',
      requiredByDate: new Date('2026-03-15'),
    })

    render(
      <TestProviders>
        <ClientDefinitionsPanel definitions={[pastDue, blocking]} />
      </TestProviders>
    )

    expect(screen.getByText('timeline.clientDefinitions.filterOverdue')).toBeInTheDocument()
    expect(screen.getByText('timeline.clientDefinitions.filterBlocking')).toBeInTheDocument()
  })

  it('calls onSelectDefinition when definition row clicked', () => {
    const onSelectDefinition = vi.fn()
    const def = createDefinition({ id: 'def-1', definitionItem: 'Tile selection' })

    render(
      <TestProviders>
        <ClientDefinitionsPanel
          definitions={[def]}
          onSelectDefinition={onSelectDefinition}
        />
      </TestProviders>
    )

    const row = screen.getByText('Tile selection')
    fireEvent.click(row)

    expect(onSelectDefinition).toHaveBeenCalledWith('def-1')
  })

  it('calls onUpdateStatus with completed when complete button clicked', () => {
    const onUpdateStatus = vi.fn()
    const def = createDefinition({ id: 'def-1', status: 'pending' })

    render(
      <TestProviders>
        <ClientDefinitionsPanel
          definitions={[def]}
          onUpdateStatus={onUpdateStatus}
        />
      </TestProviders>
    )

    const completeButton = screen.getByTestId('complete-definition-def-1')
    fireEvent.click(completeButton)

    expect(onUpdateStatus).toHaveBeenCalledWith('def-1', 'completed')
  })

  it('shows impact score when > 0', () => {
    const def = createDefinition({
      id: 'def-1',
      definitionItem: 'Critical item',
      impactScore: 80,
    })

    render(
      <TestProviders>
        <ClientDefinitionsPanel definitions={[def]} />
      </TestProviders>
    )

    expect(screen.getByText(/timeline.clientDefinitions.impactScore/)).toBeInTheDocument()
  })

  it('shows loading state', () => {
    render(
      <TestProviders>
        <ClientDefinitionsPanel definitions={[]} isLoading />
      </TestProviders>
    )

    expect(screen.getByText('timeline.loadingProjects')).toBeInTheDocument()
  })
})
