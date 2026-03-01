import { supabase } from '@/integrations/supabase/client';

/**
 * Resolve a storage path or return the URL as-is.
 * Accepts:
 * - Full URLs (http/https) - returned as-is
 * - Project photo paths: "projectId/filename" or "project-images/projectId/filename"
 * - Delivery photo paths: "delivery-photos/orderId/filename"
 * - User avatar paths: "user_id/avatar.ext" or "user-avatars/user_id/avatar.ext"
 */
export async function resolveStorageUrl(pathOrUrl: string | null | undefined, ttl = 60 * 60) {
  if (!pathOrUrl) {
    return null;
  }

  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    // Check for known fake/placeholder URLs from seed data that won't actually work
    const fakeUrlPatterns = [
      'placeholder.com',
      'via.placeholder.com',
      'api.dicebear.com', // Filter out Dicebear avatar URLs - use standard avatar system instead
      'dicebear.com', // Catch any dicebear URLs
      'avatar.iran.liara.run', // Filter out other avatar generator URLs
    ];
    
    const isFakeUrl = fakeUrlPatterns.some(pattern => pathOrUrl.includes(pattern));
    if (isFakeUrl) {
      return null;
    }
    
    return pathOrUrl;
  }

  // Determine bucket and key from the path
  let bucket = 'project-images';
  let key = pathOrUrl;

  // Check if path explicitly includes bucket name
  if (pathOrUrl.startsWith('user-avatars/')) {
    bucket = 'user-avatars';
    key = pathOrUrl.substring('user-avatars/'.length);
  } else if (pathOrUrl.startsWith('delivery-photos/')) {
    bucket = 'delivery-photos';
    key = pathOrUrl.substring('delivery-photos/'.length);
  } else if (pathOrUrl.startsWith('project-images/')) {
    bucket = 'project-images';
    key = pathOrUrl.substring('project-images/'.length);
  } else if (pathOrUrl.startsWith('architect-moodboards/')) {
    bucket = 'architect-moodboards';
    key = pathOrUrl.substring('architect-moodboards/'.length);
  } else if (pathOrUrl.startsWith('images/')) {
    bucket = 'images';
    key = pathOrUrl.substring('images/'.length);
  } else if (pathOrUrl.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/avatar\./i)) {
    // Pattern: UUID/avatar.ext (user avatar path without bucket prefix)
    bucket = 'user-avatars';
    key = pathOrUrl;
  }

  try {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(key, ttl);
    if (error) {
      // Check if it's a "Not Found" error
      const isNotFound = (error as any).status === 404 || 
                         error.message === 'Object not found' || 
                         (error as any).error === 'Object not found';

      if (isNotFound) {
        console.warn('📸 resolveStorageUrl: Object not found in storage, returning null', { bucket, key });
        return null;
      }

      console.error('📸 resolveStorageUrl: Signed URL creation failed', { 
        error, 
        message: error.message,
        status: (error as any).status,
        bucket, 
        key 
      });
      
      // Check for Nginx/Routing errors
      if (error.message?.includes('<html>')) {
        console.error('📸 resolveStorageUrl: Detected potential routing error (HTML response instead of JSON)');
      }
      
      // Fallback: try public URL if signed URL fails for OTHER reasons (not 404)
      if (bucket === 'project-images' || bucket === 'user-avatars') {
        try {
          const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(key);
          if (publicData?.publicUrl) {
            return publicData.publicUrl;
          }
        } catch (e) {
          console.warn('📸 resolveStorageUrl: Public URL fallback failed', { error: e });
        }
      }
      
      return null;
    }

    return data?.signedUrl || null;
  } catch (error) {
    console.error('📸 resolveStorageUrl: Exception during signed URL creation', { error, bucket, key });
    
    // Final fallback: try public URL
    if (bucket === 'project-images' || bucket === 'user-avatars') {
      try {
        const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(key);
        if (publicData?.publicUrl) {
          return publicData.publicUrl;
        }
      } catch (e) {
        console.error('📸 resolveStorageUrl: Public URL fallback failed', { error: e });
      }
    }
    
    return null;
  }
}

export default resolveStorageUrl;
