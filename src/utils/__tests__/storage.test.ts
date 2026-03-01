import { describe, it, expect, vi } from 'vitest';
import { resolveStorageUrl } from '../storage';

// Mock supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        getPublicUrl: vi.fn((key) => ({ data: { publicUrl: `https://public.com/${key}` } })),
        createSignedUrl: vi.fn((key) => Promise.resolve({ data: { signedUrl: `https://signed.com/${key}` }, error: null })),
      })),
    },
  },
}));

describe('resolveStorageUrl', () => {
  it('returns full URLs as-is', async () => {
    const url = 'https://example.com/image.jpg';
    expect(await resolveStorageUrl(url)).toBe(url);
  });

  it('returns null for empty paths', async () => {
    expect(await resolveStorageUrl(null)).toBeNull();
    expect(await resolveStorageUrl('')).toBeNull();
  });

  it('handles delivery-photos prefix', async () => {
    const path = 'delivery-photos/123/img.jpg';
    const result = await resolveStorageUrl(path);
    expect(result).toContain('signed.com/123/img.jpg');
  });

  it('handles project-images prefix', async () => {
    const path = 'project-images/456/img.jpg';
    const result = await resolveStorageUrl(path);
    expect(result).toContain('signed.com/456/img.jpg');
  });

  it('uses signed URL for company logos', async () => {
    const path = 'logo-123.png';
    const result = await resolveStorageUrl(path);
    expect(result).toContain('signed.com/logo-123.png');
  });

it('uses signed URL for generic paths (defaulting to project-images)', async () => {
    const path = 'projectId/filename.jpg';
    const result = await resolveStorageUrl(path);
    expect(result).toContain('signed.com/projectId/filename.jpg');
  });

  it('handles user-avatars with fallback to public URL on signed URL failure', async () => {
    const path = 'user-avatars/78accc51-a560-47b0-aed5-a09b8f1f87f5/avatar.jpg';
    
    // Mock createSignedUrl to fail with non-404 error (to trigger fallback), but getPublicUrl to succeed
    const mockFrom = vi.fn(() => ({
      createSignedUrl: vi.fn().mockResolvedValue({ 
        data: null, 
        error: { message: 'Network error', status: 500 } 
      }),
      getPublicUrl: vi.fn().mockReturnValue({ 
        data: { publicUrl: 'https://public.com/user-avatars/78accc51-a560-47b0-aed5-a09b8f1f87f5/avatar.jpg' } 
      }),
    }));
    
    const supabaseClientMod = await import('@/integrations/supabase/client');
    supabaseClientMod.supabase.storage.from = mockFrom;
    
    const result = await resolveStorageUrl(path);
    expect(result).toBe('https://public.com/user-avatars/78accc51-a560-47b0-aed5-a09b8f1f87f5/avatar.jpg');
  });
});
