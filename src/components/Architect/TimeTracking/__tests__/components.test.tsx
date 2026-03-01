import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TimeEntryList } from '../TimeEntryList';
import { TimeReportCard } from '../TimeReportCard';
import { WeeklyTimesheetView } from '../WeeklyTimesheetView';
import { TimeTracker } from '../TimeTracker';
import { TimeTrackingProvider } from '@/contexts/TimeTrackingContext';

const { mockSupabaseClient } = vi.hoisted(() => {
  const queryBuilder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
    then: (onFullfilled: any) => Promise.resolve({ data: [], error: null }).then(onFullfilled)
  };

  return {
    mockSupabaseClient: {
      from: vi.fn().mockReturnValue(queryBuilder),
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u' } } }) },
    },
  };
});

vi.mock('@/integrations/supabase/client', () => ({ supabase: mockSupabaseClient }));

describe('Time Tracking components', () => {
  let queryClient: QueryClient;
  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.clearAllMocks();
    vi.stubGlobal('alert', vi.fn());
    vi.stubGlobal('confirm', vi.fn(() => true));
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient },
      React.createElement(TimeTrackingProvider, { children })
    )
  );

  it('renders TimeEntryList with entries', async () => {
    const entries = [
      { id: '1', user_id: 'u', start_time: new Date().toISOString(), end_time: new Date().toISOString(), duration_minutes: 60, description: 'Design' },
    ];

    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({ data: { user: { id: 'u' } } } as any);
    const qb = { select: () => qb, eq: () => qb, order: () => Promise.resolve({ data: entries, error: null }) };
    vi.mocked(mockSupabaseClient.from).mockReturnValue(qb as any);

    render(React.createElement(wrapper, { children: React.createElement(TimeEntryList) }));

    expect(await screen.findByText('Design')).toBeDefined();
  });

  it('TimeReportCard shows total hours', async () => {
    const entries = [ { id: '1', duration_minutes: 120, start_time: new Date().toISOString() } ];
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({ data: { user: { id: 'u' } } } as any);
    const qb = { select: () => qb, eq: () => qb, order: () => Promise.resolve({ data: entries, error: null }) };
    vi.mocked(mockSupabaseClient.from).mockReturnValue(qb as any);

    render(React.createElement(wrapper, { children: React.createElement(TimeReportCard) }));

    expect(await screen.findByText(/2h/)).toBeDefined();
  });

  it('WeeklyTimesheetView renders seven day columns', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({ data: { user: { id: 'u' } } } as any);
    const qb = { select: () => qb, eq: () => qb, order: () => Promise.resolve({ data: [], error: null }) };
    vi.mocked(mockSupabaseClient.from).mockReturnValue(qb as any);

    render(React.createElement(wrapper, { children: React.createElement(WeeklyTimesheetView) }));

    const days = await screen.findAllByText(/^[A-Za-z]{3}$/i, { exact: false });
    expect(days.length).toBeGreaterThanOrEqual(7);
  });

  it('TimeTracker start/stop toggles button text', async () => {
    render(React.createElement(wrapper, { children: React.createElement(TimeTracker) }));

    const startBtn = await screen.findByText(/Start/i);
    await act(async () => {
      fireEvent.click(startBtn);
    });
    
    // Use findByText to wait for the state transition to "Stop"
    const stopBtn = await screen.findByText(/Stop/i);
    expect(stopBtn).toBeDefined();
    
    await act(async () => {
      fireEvent.click(stopBtn);
    });
  });
});
