import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DelayDocumentationDialog } from '../DelayDocumentationDialog'
import TestProviders from '@/test/utils/TestProviders'

const mockMutateAsync = vi.fn()

vi.mock('@/hooks/useDelayDocumentation', () => ({
  useCreateDelay: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}))

describe('DelayDocumentationDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    milestoneId: 'milestone-1',
    milestoneName: 'Foundation Pour',
    projectId: 'project-1',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders dialog with title and form fields', () => {
    render(
      <TestProviders>
        <DelayDocumentationDialog {...defaultProps} />
      </TestProviders>
    )

    expect(screen.getByTestId('delay-documentation-dialog')).toBeInTheDocument()
    expect(screen.getByText('timeline.delays.title')).toBeInTheDocument()
    expect(screen.getByText('Foundation Pour')).toBeInTheDocument()
    expect(screen.getByLabelText('timeline.delays.delayDays')).toBeInTheDocument()
    expect(screen.getByLabelText('timeline.delays.rootCause')).toBeInTheDocument()
    expect(screen.getByLabelText('timeline.delays.responsibleParty')).toBeInTheDocument()
    expect(screen.getByLabelText('timeline.delays.impactType')).toBeInTheDocument()
    expect(screen.getByLabelText('timeline.delays.description')).toBeInTheDocument()
    expect(screen.getByLabelText('timeline.delays.correctiveActions')).toBeInTheDocument()
    expect(screen.getByTestId('delay-submit-button')).toBeInTheDocument()
  })

  it('shows subcontractor trade field when responsible party is subcontractor', () => {
    render(
      <TestProviders>
        <DelayDocumentationDialog {...defaultProps} />
      </TestProviders>
    )

    const comboboxes = screen.getAllByRole('combobox')
    const responsiblePartyTrigger = comboboxes[1]
    fireEvent.click(responsiblePartyTrigger)

    const subcontractorOption = screen.getByRole('option', {
      name: 'timeline.delays.parties.subcontractor',
    })
    fireEvent.click(subcontractorOption)

    expect(screen.getByLabelText('timeline.delays.subcontractorTrade')).toBeInTheDocument()
  })

  it('submits form with valid data', async () => {
    mockMutateAsync.mockResolvedValue({})

    render(
      <TestProviders>
        <DelayDocumentationDialog {...defaultProps} />
      </TestProviders>
    )

    const delayDaysInput = screen.getByRole('spinbutton', {
      name: /timeline\.delays\.delayDays/i,
    })
    fireEvent.change(delayDaysInput, { target: { value: '7' } })

    const descriptionField = screen.getByPlaceholderText(
      'timeline.delays.descriptionPlaceholder'
    )
    fireEvent.change(descriptionField, {
      target: { value: 'Material delivery was delayed by one week.' },
    })

    const submitButton = screen.getByTestId('delay-submit-button')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          milestoneId: 'milestone-1',
          projectId: 'project-1',
          delayDays: 7,
          description: 'Material delivery was delayed by one week.',
        })
      )
    })
  })

  it('validates minimum description length', async () => {
    render(
      <TestProviders>
        <DelayDocumentationDialog {...defaultProps} />
      </TestProviders>
    )

    const descriptionField = screen.getByPlaceholderText(
      'timeline.delays.descriptionPlaceholder'
    )
    fireEvent.change(descriptionField, { target: { value: 'Short' } })
    fireEvent.blur(descriptionField)

    const submitButton = screen.getByTestId('delay-submit-button')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(
        screen.getByText(/timeline\.delays\.validation\.descriptionMinLength/)
      ).toBeInTheDocument()
    })
    expect(mockMutateAsync).not.toHaveBeenCalled()
  })

  it('disables submit when milestoneId or projectId is empty', () => {
    render(
      <TestProviders>
        <DelayDocumentationDialog
          {...defaultProps}
          milestoneId=""
          projectId="project-1"
        />
      </TestProviders>
    )

    const submitButton = screen.getByTestId('delay-submit-button')
    expect(submitButton).toBeDisabled()
  })

  it('calls onOpenChange false when cancel is clicked', () => {
    render(
      <TestProviders>
        <DelayDocumentationDialog {...defaultProps} />
      </TestProviders>
    )

    const cancelButton = screen.getByRole('button', { name: 'common.cancel' })
    fireEvent.click(cancelButton)

    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
  })
})
