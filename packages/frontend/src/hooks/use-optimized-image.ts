'use client';

import { useMemo } from 'react';
import { useDeviceType } from './use-device-type';
import { optimizeImageUrl, ImageSize } from '@/utils/image-optimizer';

/**
 * Hook para optimizar URLs de imágenes según el dispositivo y tamaño requerido
 * @param imageUrl URL original de la imagen
 * @param size Tamaño requerido de la imagen
 * @param customDimensions Dimensiones personalizadas (opcional)
 * @returns URL optimizada con query params
 */
export function useOptimizedImage(
  imageUrl: string,
  size: ImageSize = 'medium',
  customDimensions?: { width: number; height: number },
): string {
  const deviceType = useDeviceType();

  return useMemo(() => {
    return optimizeImageUrl(imageUrl, size, deviceType, customDimensions);
  }, [imageUrl, size, deviceType, customDimensions]);
}
