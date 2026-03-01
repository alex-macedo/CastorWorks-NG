import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useVoiceTranscription } from '../useVoiceTranscription';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    storage: {
      from: vi.fn(),
    },
    functions: {
      invoke: vi.fn(),
    },
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useVoiceTranscription', () => {
  const mockUser = { id: 'test-user-id' };
  const mockAudioBlob = new Blob(['audio data'], { type: 'audio/webm' });
  
  const mockStorageFrom = vi.fn();
  const mockUpload = vi.fn();
  const mockCreateSignedUrl = vi.fn();
  const mockRemove = vi.fn();
  const mockInvoke = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup Supabase mocks
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    } as any);

    mockStorageFrom.mockReturnValue({
      upload: mockUpload,
      createSignedUrl: mockCreateSignedUrl,
      remove: mockRemove,
    });

    vi.mocked(supabase.storage.from).mockImplementation(mockStorageFrom);
    vi.mocked(supabase.functions.invoke).mockImplementation(mockInvoke);

    // Default successful responses
    mockUpload.mockResolvedValue({
      data: { path: 'test-path' },
      error: null,
    });

    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://example.com/audio.webm' },
      error: null,
    });

    mockInvoke.mockResolvedValue({
      data: {
        text: 'Test transcription',
        language: 'en',
        duration: 30,
        confidence: 0.95,
        processingTimeMs: 2000,
      },
      error: null,
    });
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useVoiceTranscription());

    expect(result.current.transcription).toBeNull();
    expect(result.current.isTranscribing).toBe(false);
    expect(result.current.progress).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it('uploads audio and transcribes successfully', async () => {
    const { result } = renderHook(() => useVoiceTranscription());
    let transcribePromise: Promise<any>;

    await act(async () => {
      transcribePromise = result.current.transcribe(mockAudioBlob);
    });

    // Wait for upload
    await waitFor(() => {
      expect(mockUpload).toHaveBeenCalled();
    });

    // Wait for transcription
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalled();
    });

    await act(async () => {
      await transcribePromise;
    });

    expect(result.current.transcription).toBe('Test transcription');
    expect(result.current.isTranscribing).toBe(false);
    expect(toast.success).toHaveBeenCalled();
  });

  it('tracks progress during transcription', async () => {
    const { result } = renderHook(() => useVoiceTranscription());
    let transcribePromise: Promise<any>;

    await act(async () => {
      transcribePromise = result.current.transcribe(mockAudioBlob);
    });

    // Check initial progress
    await waitFor(() => {
      expect(result.current.progress).toBeGreaterThan(0);
    });

    await act(async () => {
      await transcribePromise;
    });

    expect(result.current.progress).toBe(100);
  });

  it('handles upload errors', async () => {
    mockUpload.mockResolvedValue({
      data: null,
      error: { message: 'Upload failed' },
    });

    const { result } = renderHook(() => useVoiceTranscription());

    await act(async () => {
      await expect(result.current.transcribe(mockAudioBlob)).rejects.toThrow();
    });

    expect(result.current.error).toBeTruthy();
    expect(toast.error).toHaveBeenCalled();
  });

  it('handles transcription errors', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: 'Transcription failed' },
    });

    const { result } = renderHook(() => useVoiceTranscription());

    await act(async () => {
      await expect(result.current.transcribe(mockAudioBlob)).rejects.toThrow();
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.isTranscribing).toBe(false);
  });

  it('handles rate limit errors', async () => {
    mockInvoke.mockResolvedValue({
      data: { error: 'Rate limit exceeded' },
      error: null,
    });

    const { result } = renderHook(() => useVoiceTranscription());

    await act(async () => {
      await expect(result.current.transcribe(mockAudioBlob)).rejects.toThrow();
    });

    expect(toast.error).toHaveBeenCalledWith(
      'Rate Limit Exceeded',
      expect.objectContaining({
        description: expect.stringContaining('wait'),
      })
    );
  });

  it('handles API key errors', async () => {
    mockInvoke.mockResolvedValue({
      data: { error: 'API key not configured' },
      error: null,
    });

    const { result } = renderHook(() => useVoiceTranscription());

    await act(async () => {
      await expect(result.current.transcribe(mockAudioBlob)).rejects.toThrow();
    });

    expect(toast.error).toHaveBeenCalledWith(
      'API Configuration Error',
      expect.objectContaining({
        description: expect.stringContaining('OpenAI API key'),
      })
    );
  });

  it('cleans up audio file after successful transcription', async () => {
    const { result } = renderHook(() => useVoiceTranscription());
    await act(async () => {
      await result.current.transcribe(mockAudioBlob);
    });

    await waitFor(() => {
      expect(mockRemove).toHaveBeenCalled();
    });
  });

  it('does not cleanup file if transcription fails', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: 'Transcription failed' },
    });

    const { result } = renderHook(() => useVoiceTranscription());

    await act(async () => {
      await expect(result.current.transcribe(mockAudioBlob)).rejects.toThrow();
    });

    // Should not attempt cleanup on error
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it('resets state correctly', () => {
    const { result } = renderHook(() => useVoiceTranscription());

    // Set some state
    result.current.transcription = 'test';
    result.current.error = 'test error';
    result.current.progress = 50;

    act(() => {
      result.current.reset();
    });

    expect(result.current.transcription).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.progress).toBe(0);
  });

  it('handles user authentication errors', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    } as any);

    const { result } = renderHook(() => useVoiceTranscription());
    await act(async () => {
      await expect(result.current.transcribe(mockAudioBlob)).rejects.toThrow(
        'User not authenticated'
      );
    });
  });

  it('passes estimateId and language to Edge Function', async () => {
    const { result } = renderHook(() => useVoiceTranscription());
    await act(async () => {
      await result.current.transcribe(mockAudioBlob, 'estimate-123', 'es');
    });

    expect(mockInvoke).toHaveBeenCalledWith(
      'transcribe-voice-input',
      expect.objectContaining({
        body: expect.objectContaining({
          estimateId: 'estimate-123',
          language: 'es',
        }),
      })
    );
  });

  it('calculates duration and confidence in toast message', async () => {
    mockInvoke.mockResolvedValue({
      data: {
        text: 'Test',
        language: 'en',
        duration: 90, // 1.5 minutes
        confidence: 0.92,
        processingTimeMs: 2000,
      },
      error: null,
    });

    const { result } = renderHook(() => useVoiceTranscription());

    await act(async () => {
      await result.current.transcribe(mockAudioBlob);
    });

    expect(toast.success).toHaveBeenCalledWith(
      'Transcription Complete',
      expect.objectContaining({
        description: expect.stringContaining('2 minute'),
      })
    );
  });
});

