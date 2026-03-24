import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OptimizationRecommendations } from './OptimizationRecommendations'
import TestProviders from '@/test/utils/TestProviders'

describe('OptimizationRecommendations', () => {
  it('renders safely when recommendation priority is outside the expected union', () => {
    render(
      <TestProviders>
        <OptimizationRecommendations
          recommendations={[
            {
              id: 'rec-1',
              category: 'Labor',
              type: 'reallocation',
              priority: 'critical' as any,
              currentAllocation: 1000,
              recommendedAllocation: 800,
              potentialSavings: 200,
              rationale: 'Shift labor allocation to avoid overspend',
              actionItems: ['Reassign crew hours'],
              implementationComplexity: 'moderate',
              estimatedImpact: 'Medium',
            },
          ]}
        />
      </TestProviders>
    )

    expect(screen.getByText('Labor')).toBeInTheDocument()
    expect(screen.getByText('architect.financial.advisor.priorityHigh')).toBeInTheDocument()
  })
})
