import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUploadAvatar, useRemoveAvatar } from '@/hooks/useUploadAvatar';
import { supabase } from '@/integrations/supabase/client';
import imageCompression from 'browser-image-compression';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        remove: vi.fn(),
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          maybeSingle: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
      })),
    })),
  },
}));

vi.mock('browser-image-compression', () => ({
  default: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={createTestQueryClient()}>
    {children}
  </QueryClientProvider>
);

describe('useUploadAvatar', () => {
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should upload avatar and update database successfully', async () => {
    const mockStoragePath = `${mockUserId}/avatar.jpg`;
    
    // Mock image compression
    vi.mocked(imageCompression).mockResolvedValue(mockFile);
    
    // Mock storage upload
    const mockUpload = vi.fn().mockResolvedValue({ error: null });
    const mockFromStorage = vi.fn().mockReturnValue({ upload: mockUpload });
    
    // Mock database operations
    const mockSingle = vi.fn().mockResolvedValue({ data: { avatar_url: null }, error: null });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    
    const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: {}, error: null }) }) }) });
    
    vi.mocked(supabase.storage.from).mockReturnValue({ upload: mockUpload, remove: vi.fn() } as any);
    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      update: mockUpdate,
    } as any);

    const { result } = renderHook(() => useUploadAvatar(), { wrapper });

    // Start upload
    act(() => {
      result.current.mutate({ userId: mockUserId, file: mockFile });
    });

    // Wait for success
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verify storage was called
    expect(mockUpload).toHaveBeenCalledWith(
      mockStoragePath,
      mockFile,
      expect.objectContaining({
        cacheControl: '3600',
        upsert: true,
      })
    );
  });

  it('should reject invalid file types', async () => {
    const invalidFile = new File(['test'], 'test.gif', { type: 'image/gif' });
    
    const { result } = renderHook(() => useUploadAvatar(), { wrapper });

    act(() => {
      result.current.mutate({ userId: mockUserId, file: invalidFile });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain('Invalid file type');
  });

  it('should reject files larger than 5MB', async () => {
    const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
    Object.defineProperty(largeFile, 'size', { value: 6 * 1024 * 1024 });
    
    const { result } = renderHook(() => useUploadAvatar(), { wrapper });

    act(() => {
      result.current.mutate({ userId: mockUserId, file: largeFile });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain('File size must be less than 5MB');
  });
});

describe('useRemoveAvatar', () => {
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should remove avatar from storage and database', async () => {
    const mockAvatarUrl = 'user-avatars/123e4567-e89b-12d3-a456-426614174000/avatar.jpg';
    
    // Mock database to return existing avatar
    const mockSingle = vi.fn().mockResolvedValue({ 
      data: { avatar_url: mockAvatarUrl }, 
      error: null 
    });
    
    const mockRemove = vi.fn().mockResolvedValue({ error: null });
    
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ single: mockSingle }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ 
          select: vi.fn().mockReturnValue({ 
            single: vi.fn().mockResolvedValue({ data: {}, error: null }) 
          }) 
        }),
      }),
    } as any);
    
    vi.mocked(supabase.storage.from).mockReturnValue({
      remove: mockRemove,
    } as any);

    const { result } = renderHook(() => useRemoveAvatar(), { wrapper });

    act(() => {
      result.current.mutate(mockUserId);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('should handle case when no avatar exists', async () => {
    const mockSingle = vi.fn().mockResolvedValue({ 
      data: { avatar_url: null }, 
      error: null 
    });
    
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ single: mockSingle }),
      }),
    } as any);

    const { result } = renderHook(() => useRemoveAvatar(), { wrapper });

    act(() => {
      result.current.mutate(mockUserId);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
