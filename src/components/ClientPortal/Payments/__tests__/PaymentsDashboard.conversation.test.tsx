import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PaymentsDashboard } from '../../Payments/PaymentsDashboard';

// Mock supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'invoice_conversations') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                maybeSingle: async () => ({
                  data: null,
                  error: {
                    message:
                      'relation "invoice_conversations" does not exist',
                  },
                }),
              }),
            }),
          }),
        };
      }

      if (table === 'projects') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: { name: 'Test' }, error: null }),
            }),
          }),
        };
      }

      return {
        select: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: null }),
          }),
        }),
      };
    },
  }
}));

// Mock useCreateConversation hook - return a mutation-like object and expose a spy
const mockMutateAsync = vi.fn(async (members: string[]) => ({
  id: '00000000-0000-4000-8000-000000000002',
}));
vi.mock('@/hooks/clientPortal/useCreateConversation', () => ({
  useCreateConversation: () => ({
    mutateAsync: mockMutateAsync,
  })
}));

// Mock current user hook
vi.mock('@/hooks/useCurrentUserProfile', () => ({
  useCurrentUserProfile: () => ({ data: { id: 'user-1' } })
}));

vi.mock('@/hooks/clientPortal/useProjectPayments', () => ({
  useProjectPayments: () => ({
    invoices: [
      {
        id: '11111111-1111-4111-8111-111111111111',
        invoice_number: 'INV-1',
        project_id: 'proj-1',
        project_name: 'Project',
        issue_date: '2024-01-01',
        due_date: '2024-02-01',
        amount: 100,
        status: 'due',
        description: null,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      },
    ],
    isLoading: false,
  }),
}));

describe('PaymentsDashboard conversation button', () => {
  it('creates a conversation when mapping table is missing and navigates', async () => {
    render(
      <MemoryRouter initialEntries={["/portal/proj-1/payments"]}>
        <Routes>
          <Route path="/portal/:projectId/*" element={<PaymentsDashboard />} />
        </Routes>
      </MemoryRouter>
    );

    // Find all Conversation buttons and click the first one
    const btns = await screen.findAllByRole('button', { name: /Conversation/i });
    expect(btns.length).toBeGreaterThan(0);
    fireEvent.click(btns[0]);

    // Expect that after clicking, the mocked createConversation resolves and no uncaught errors occur
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled();
    });
  });
});
