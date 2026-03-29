import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useForms, useForm } from '../useForms';
import type { Database } from '@/integrations/supabase/types';

type Form = Database['public']['Tables']['forms']['Row'];

// Mock the toast hook
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock the Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

// Mock data
const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
};

const mockForm: Form = {
  id: 'form-1',
  project_id: 'project-1',
  title: 'Test Form',
  description: 'Test Description',
  status: 'draft',
  settings: {
    collectEmail: false,
    limitOneResponsePerUser: false,
    showProgressBar: true,
    shuffleQuestions: false,
    confirmationMessage: 'Thank you!',
  },
  theme: {
    primaryColor: '#3B82F6',
    backgroundColor: '#FFFFFF',
    fontFamily: 'Inter',
    logoUrl: null,
  },
  response_limit: null,
  deadline: null,
  share_token: 'abc123',
  is_public: false,
  created_by: 'user-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  published_at: null,
  version: 1,
};

// Import the mocked supabase after mocking
import { supabase } from '@/integrations/supabase/client';

// Helper to create a thenable query builder mock
// Supabase query builder is "thenable" - it can be awaited directly
const createThenableQueryBuilder = (resolveValue: { data: any; error: any }) => {
  const builder: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    // Make it thenable - when awaited, it resolves to the query result
    then: (onFulfilled: any, onRejected: any) => {
      return Promise.resolve(resolveValue).then(onFulfilled, onRejected);
    },
  };
  return builder;
};

describe('useForms', () => {
  beforeEach(() => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    } as any);

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('useForms hook', () => {
    it('should fetch forms successfully', async () => {
      const thenableBuilder = createThenableQueryBuilder({
        data: [mockForm],
        error: null,
      });
      vi.mocked(supabase.from).mockReturnValue(thenableBuilder);

      const { result } = renderHook(
        () => useForms(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(supabase.from).toHaveBeenCalledWith('forms');
      expect(result.current.forms).toEqual([mockForm]);
    });

    it('should apply status filter', async () => {
      const thenableBuilder = createThenableQueryBuilder({
        data: [mockForm],
        error: null,
      });
      vi.mocked(supabase.from).mockReturnValue(thenableBuilder);

      const { result } = renderHook(
        () => useForms({ status: 'published' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify the filter was applied in the query chain
      expect(thenableBuilder.eq).toHaveBeenCalledWith('status', 'published');
    });

    it('should apply project filter', async () => {
      const thenableBuilder = createThenableQueryBuilder({
        data: [mockForm],
        error: null,
      });
      vi.mocked(supabase.from).mockReturnValue(thenableBuilder);

      const { result } = renderHook(
        () => useForms({ projectId: 'project-1' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(thenableBuilder.eq).toHaveBeenCalledWith('project_id', 'project-1');
    });

    it('should apply search query filter', async () => {
      const thenableBuilder = createThenableQueryBuilder({
        data: [mockForm],
        error: null,
      });
      vi.mocked(supabase.from).mockReturnValue(thenableBuilder);

      const { result } = renderHook(
        () => useForms({ searchQuery: 'test' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(thenableBuilder.ilike).toHaveBeenCalledWith('title', '%test%');
    });

    it('should handle empty results', async () => {
      const thenableBuilder = createThenableQueryBuilder({
        data: null,
        error: null,
      });
      vi.mocked(supabase.from).mockReturnValue(thenableBuilder);

      const { result } = renderHook(
        () => useForms(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // The hook returns null when data is null (not an empty array)
      expect(result.current.forms).toBeNull();
    });

    it('should surface query errors instead of hiding them as empty results', async () => {
      const queryError = new Error('Forms query failed');
      const thenableBuilder = createThenableQueryBuilder({
        data: null,
        error: queryError,
      });
      vi.mocked(supabase.from).mockReturnValue(thenableBuilder);

      const { result } = renderHook(
        () => useForms(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.error).toBe(queryError);
      });

      expect(result.current.error).toBe(queryError);
      expect(result.current.forms).toEqual([]);
    });
  });

  describe('createForm mutation', () => {
    it('should create form successfully', async () => {
      const thenableBuilder = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockForm, error: null }),
      };
      vi.mocked(supabase.from).mockReturnValue(thenableBuilder as any);

      const { result } = renderHook(
        () => useForms(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      result.current.createForm.mutate({
        title: 'New Form',
        description: 'Test',
        project_id: 'project-1',
      });

      await waitFor(() => {
        expect(result.current.createForm.isSuccess).toBe(true);
      });

      expect(thenableBuilder.insert).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Form created',
        description: expect.stringContaining('Test Form'),
      });
    });

    it('should handle create error', async () => {
      const error = new Error('Create failed');
      const thenableBuilder = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error }),
      };
      vi.mocked(supabase.from).mockReturnValue(thenableBuilder as any);

      const { result } = renderHook(
        () => useForms(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      result.current.createForm.mutate({
        title: 'New Form',
        project_id: 'project-1',
      });

      await waitFor(() => {
        expect(result.current.createForm.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: expect.stringContaining('Create failed'),
        variant: 'destructive',
      });
    });
  });

  describe('updateForm mutation', () => {
    it('should update form successfully', async () => {
      const thenableBuilder = {
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockForm, title: 'Updated Form' },
          error: null,
        }),
      };
      vi.mocked(supabase.from).mockReturnValue(thenableBuilder as any);

      const { result } = renderHook(
        () => useForms(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      result.current.updateForm.mutate({
        id: 'form-1',
        title: 'Updated Form',
      });

      await waitFor(() => {
        expect(result.current.updateForm.isSuccess).toBe(true);
      });

      expect(thenableBuilder.update).toHaveBeenCalled();
      expect(thenableBuilder.eq).toHaveBeenCalledWith('id', 'form-1');
    });
  });

  describe('deleteForm mutation', () => {
    it('should delete form successfully', async () => {
      // Mock the delete chain: delete().eq().then()
      const mockDeleteEq = vi.fn().mockResolvedValue({ error: null });
      const thenableBuilder = {
        delete: vi.fn().mockReturnValue({
          eq: mockDeleteEq,
        }),
      };
      vi.mocked(supabase.from).mockReturnValue(thenableBuilder as any);

      const { result } = renderHook(
        () => useForms(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      result.current.deleteForm.mutate('form-1');

      await waitFor(() => {
        expect(result.current.deleteForm.isSuccess).toBe(true);
      });

      expect(thenableBuilder.delete).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Form deleted',
        description: 'The form has been deleted successfully.',
      });
    });
  });

  describe('duplicateForm mutation', () => {
    it('should duplicate form successfully', async () => {
      // Mock the sequence of queries for duplicate
      let callCount = 0;
      const mockSingle = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call - fetch original form
          return Promise.resolve({ data: mockForm, error: null });
        }
        // Second call - create duplicated form
        return Promise.resolve({
          data: { ...mockForm, id: 'form-2', title: 'Test Form (Copy)' },
          error: null,
        });
      });

      const thenableBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        single: mockSingle,
        then: (onFulfilled: any) => Promise.resolve({ data: [], error: null }).then(onFulfilled),
      };
      vi.mocked(supabase.from).mockReturnValue(thenableBuilder as any);

      const { result } = renderHook(
        () => useForms(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      result.current.duplicateForm.mutate('form-1');

      await waitFor(() => {
        expect(result.current.duplicateForm.isSuccess).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Form duplicated',
        description: expect.stringContaining('Copy'),
      });
    });
  });

  describe('publishForm mutation', () => {
    it('should publish form successfully', async () => {
      const thenableBuilder = {
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockForm, status: 'published' },
          error: null,
        }),
      };
      vi.mocked(supabase.from).mockReturnValue(thenableBuilder as any);

      const { result } = renderHook(
        () => useForms(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      result.current.publishForm.mutate('form-1');

      await waitFor(() => {
        expect(result.current.publishForm.isSuccess).toBe(true);
      });

      expect(thenableBuilder.update).toHaveBeenCalledWith({ status: 'published' });
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Form published',
        description: expect.stringContaining('accepting responses'),
      });
    });
  });

  describe('unpublishForm mutation', () => {
    it('should unpublish form successfully', async () => {
      const thenableBuilder = {
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockForm, status: 'closed' },
          error: null,
        }),
      };
      vi.mocked(supabase.from).mockReturnValue(thenableBuilder as any);

      const { result } = renderHook(
        () => useForms(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      result.current.unpublishForm.mutate('form-1');

      await waitFor(() => {
        expect(result.current.unpublishForm.isSuccess).toBe(true);
      });

      expect(thenableBuilder.update).toHaveBeenCalledWith({ status: 'closed' });
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Form closed',
        description: expect.stringContaining('no longer accepting'),
      });
    });
  });
});

describe('useForm', () => {
  beforeEach(() => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    } as any);
    vi.clearAllMocks();
  });

  it('should fetch single form successfully', async () => {
    const thenableBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: mockForm, error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(thenableBuilder as any);

    const { result } = renderHook(
      () => useForm('form-1'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(supabase.from).toHaveBeenCalledWith('forms');
    expect(thenableBuilder.eq).toHaveBeenCalledWith('id', 'form-1');
    expect(result.current.form).toEqual(mockForm);
  });

  it('should not fetch when id is undefined', () => {
    const { result } = renderHook(
      () => useForm(undefined),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(false);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('should return null when form not found', async () => {
    const thenableBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    };
    vi.mocked(supabase.from).mockReturnValue(thenableBuilder as any);

    const { result } = renderHook(
      () => useForm('invalid-id'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.form).toBeNull();
  });
});
