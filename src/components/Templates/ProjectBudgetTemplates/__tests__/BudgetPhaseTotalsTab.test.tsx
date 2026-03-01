import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { BudgetPhaseTotalsTab } from '../BudgetPhaseTotalsTab';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('BudgetPhaseTotalsTab Basic Integration Tests', () => {
  const mockProps = {
    budgetId: 'budget-123',
    projectId: 'project-456',
    totalDirectCost: 100000,
  };

  it('should render the component without crashing', () => {
    expect(() => {
      render(
        <BudgetPhaseTotalsTab {...mockProps} budgetModel="cost_control" />,
        { wrapper: createWrapper() }
      );
    }).not.toThrow();
  });

  it('should display the correct title', () => {
    render(
      <BudgetPhaseTotalsTab {...mockProps} budgetModel="cost_control" />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('budgets:phases.title')).toBeInTheDocument();
    expect(screen.getByText('budgets:phases.description')).toBeInTheDocument();
  });

  it('should render for different budget models', () => {
    // Test cost_control budget model
    const { rerender } = render(
      <BudgetPhaseTotalsTab {...mockProps} budgetModel="cost_control" />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('budgets:phases.title')).toBeInTheDocument();

    // Test simple budget model with same wrapper
    rerender(
      <BudgetPhaseTotalsTab {...{...mockProps, budgetModel: "simple"}} />
    );

    expect(screen.getByText('budgets:phases.title')).toBeInTheDocument();
  });

  it('should accept all required props', () => {
    const { container } = render(
      <BudgetPhaseTotalsTab
        budgetId="test-budget"
        projectId="test-project"
        totalDirectCost={50000}
        budgetModel="simple"
      />,
      { wrapper: createWrapper() }
    );

    expect(container.firstChild).toBeTruthy();
  });
});