/**
 * Generate a tiny placeholder image data URL with blur effect
 * @param width - Thumbnail width (default: 10px for extreme blur)
 * @param height - Thumbnail height (default: 10px for extreme blur)
 * @param color - Base color for the placeholder
 * @returns Data URL for the placeholder
 */
export function generatePlaceholder(
  width = 10,
  height = 10,
  color = '#cbd5e1'
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);
  
  return canvas.toDataURL('image/jpeg', 0.1);
}

/**
 * Create a low-quality image placeholder from a full image URL
 * This can be used to generate blur-up placeholders on the fly
 * @param imageUrl - Full quality image URL
 * @param maxSize - Maximum dimension for the thumbnail
 * @returns Promise<string> - Data URL of the low-quality placeholder
 */
export async function createLowQualityPlaceholder(
  imageUrl: string,
  maxSize = 20
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      // Calculate dimensions maintaining aspect ratio
      let width = img.width;
      let height = img.height;
      
      if (width > height) {
        if (width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw image at low quality
      ctx.drawImage(img, 0, 0, width, height);
      
      // Export as low-quality JPEG
      resolve(canvas.toDataURL('image/jpeg', 0.1));
    };
    
    img.onerror = () => {
      reject(new Error(`Failed to load image: ${imageUrl}`));
    };
    
    img.src = imageUrl;
  });
}

/**
 * Extract dominant color from an image for placeholder background
 * @param imageUrl - Image URL to analyze
 * @returns Promise<string> - Hex color code
 */
export async function extractDominantColor(imageUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      canvas.width = 1;
      canvas.height = 1;
      
      ctx.drawImage(img, 0, 0, 1, 1);
      
      const pixel = ctx.getImageData(0, 0, 1, 1).data;
      const hex = `#${((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2])
        .toString(16)
        .slice(1)}`;
      
      resolve(hex);
    };
    
    img.onerror = () => {
      reject(new Error(`Failed to load image: ${imageUrl}`));
    };
    
    img.src = imageUrl;
  });
}

/**
 * Check if WebP format is supported by the browser
 * @returns boolean
 */
export function supportsWebP(): boolean {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
}

/**
 * Get optimized image URL based on browser support
 * @param imageUrl - Original image URL
 * @param webpUrl - WebP version of the image
 * @returns Optimal image URL
 */
export function getOptimizedImageUrl(imageUrl: string, webpUrl?: string): string {
  if (webpUrl && supportsWebP()) {
    return webpUrl;
  }
  return imageUrl;
}
