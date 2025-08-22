// Image optimization and compression utilities

interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1
  format?: 'jpeg' | 'png' | 'webp';
  progressive?: boolean;
}

interface OptimizedImage {
  blob: Blob;
  url: string;
  width: number;
  height: number;
  size: number;
  format: string;
}

export class ImageOptimizationService {
  private static canvas: HTMLCanvasElement | null = null;
  private static ctx: CanvasRenderingContext2D | null = null;

  /**
   * Get or create canvas context
   */
  private static getCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d');
      
      if (!this.ctx) {
        throw new Error('Could not get canvas context');
      }
    }

    return { canvas: this.canvas, ctx: this.ctx! };
  }

  /**
   * Load image from URL or File
   */
  private static loadImage(source: string | File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      
      if (typeof source === 'string') {
        img.src = source;
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          img.src = e.target?.result as string;
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(source);
      }
    });
  }

  /**
   * Calculate optimal dimensions while maintaining aspect ratio
   */
  private static calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth?: number,
    maxHeight?: number
  ): { width: number; height: number } {
    let { width, height } = { width: originalWidth, height: originalHeight };

    if (maxWidth && width > maxWidth) {
      height = (height * maxWidth) / width;
      width = maxWidth;
    }

    if (maxHeight && height > maxHeight) {
      width = (width * maxHeight) / height;
      height = maxHeight;
    }

    return { width: Math.round(width), height: Math.round(height) };
  }

  /**
   * Optimize image with given options
   */
  static async optimizeImage(
    source: string | File,
    options: ImageOptimizationOptions = {}
  ): Promise<OptimizedImage> {
    const {
      maxWidth = 1920,
      maxHeight = 1080,
      quality = 0.8,
      format = 'jpeg',
      progressive = true,
    } = options;

    try {
      const img = await this.loadImage(source);
      const { canvas, ctx } = this.getCanvas();

      // Calculate optimal dimensions
      const { width, height } = this.calculateDimensions(
        img.naturalWidth,
        img.naturalHeight,
        maxWidth,
        maxHeight
      );

      // Set canvas size
      canvas.width = width;
      canvas.height = height;

      // Clear canvas and draw image
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob with compression
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob'));
            }
          },
          `image/${format}`,
          quality
        );
      });

      return {
        blob,
        url: URL.createObjectURL(blob),
        width,
        height,
        size: blob.size,
        format,
      };
    } catch (error) {
      throw new Error(`Image optimization failed: ${error}`);
    }
  }

  /**
   * Create multiple sizes of an image (responsive images)
   */
  static async createResponsiveImages(
    source: string | File,
    sizes: Array<{ width: number; suffix: string }> = [
      { width: 320, suffix: 'small' },
      { width: 768, suffix: 'medium' },
      { width: 1200, suffix: 'large' },
    ],
    options: Omit<ImageOptimizationOptions, 'maxWidth'> = {}
  ): Promise<Record<string, OptimizedImage>> {
    const results: Record<string, OptimizedImage> = {};

    for (const size of sizes) {
      try {
        const optimized = await this.optimizeImage(source, {
          ...options,
          maxWidth: size.width,
        });
        results[size.suffix] = optimized;
      } catch (error) {
        console.warn(`Failed to create ${size.suffix} image:`, error);
      }
    }

    return results;
  }

  /**
   * Generate WebP version if supported
   */
  static async generateWebP(source: string | File): Promise<OptimizedImage | null> {
    if (!this.supportsWebP()) {
      return null;
    }

    try {
      return await this.optimizeImage(source, {
        format: 'webp',
        quality: 0.8,
      });
    } catch (error) {
      console.warn('WebP generation failed:', error);
      return null;
    }
  }

  /**
   * Check if browser supports WebP
   */
  static supportsWebP(): boolean {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }

  /**
   * Check if browser supports AVIF
   */
  static supportsAVIF(): boolean {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0;
  }

  /**
   * Get optimal image format for current browser
   */
  static getOptimalFormat(): 'avif' | 'webp' | 'jpeg' {
    if (this.supportsAVIF()) return 'avif';
    if (this.supportsWebP()) return 'webp';
    return 'jpeg';
  }

  /**
   * Cleanup object URLs to prevent memory leaks
   */
  static cleanup(urls: string | string[]): void {
    const urlArray = Array.isArray(urls) ? urls : [urls];
    urlArray.forEach(url => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
  }

  /**
   * Estimate image file size before optimization
   */
  static estimateSize(
    width: number,
    height: number,
    format: 'jpeg' | 'png' | 'webp' = 'jpeg',
    quality: number = 0.8
  ): number {
    const pixels = width * height;
    
    switch (format) {
      case 'jpeg':
        return Math.round(pixels * 0.5 * quality);
      case 'webp':
        return Math.round(pixels * 0.3 * quality);
      case 'png':
        return Math.round(pixels * 3); // PNG is uncompressed
      default:
        return Math.round(pixels * 0.5 * quality);
    }
  }
}

// React hook for image optimization
export function useImageOptimization() {
  const optimizeImage = async (
    source: string | File,
    options?: ImageOptimizationOptions
  ): Promise<OptimizedImage> => {
    return ImageOptimizationService.optimizeImage(source, options);
  };

  const createResponsiveImages = async (
    source: string | File,
    sizes?: Array<{ width: number; suffix: string }>,
    options?: Omit<ImageOptimizationOptions, 'maxWidth'>
  ): Promise<Record<string, OptimizedImage>> => {
    return ImageOptimizationService.createResponsiveImages(source, sizes, options);
  };

  const cleanup = (urls: string | string[]): void => {
    ImageOptimizationService.cleanup(urls);
  };

  return {
    optimizeImage,
    createResponsiveImages,
    cleanup,
    supportsWebP: ImageOptimizationService.supportsWebP(),
    supportsAVIF: ImageOptimizationService.supportsAVIF(),
    optimalFormat: ImageOptimizationService.getOptimalFormat(),
  };
}

// Optimized Image component
import React from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  loading?: 'lazy' | 'eager';
  onLoad?: () => void;
  onError?: () => void;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className,
  loading = 'lazy',
  onLoad,
  onError,
}) => {
  const [optimizedSrc, setOptimizedSrc] = React.useState<string>(src);
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    let isMounted = true;

    const optimizeAndSet = async () => {
      try {
        const optimized = await ImageOptimizationService.optimizeImage(src, {
          maxWidth: width,
          maxHeight: height,
          format: ImageOptimizationService.getOptimalFormat() as any,
        });

        if (isMounted) {
          setOptimizedSrc(optimized.url);
          setIsLoading(false);
        }
      } catch (error) {
        if (isMounted) {
          setHasError(true);
          setIsLoading(false);
          setOptimizedSrc(src); // Fallback to original
        }
      }
    };

    optimizeAndSet();

    return () => {
      isMounted = false;
    };
  }, [src, width, height]);

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
    onError?.();
  };

  return (
    <img
      src={optimizedSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading={loading}
      onLoad={handleLoad}
      onError={handleError}
      style={{
        opacity: isLoading ? 0.5 : 1,
        transition: 'opacity 0.3s ease',
      }}
    />
  );
};