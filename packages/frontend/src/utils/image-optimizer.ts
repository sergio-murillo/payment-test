/**
 * Utilidad para optimizar URLs de imágenes según el dispositivo y tamaño requerido
 */

export type ImageSize = 'small' | 'medium' | 'large' | 'xlarge';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

interface ImageOptimizationParams {
  width: number;
  height: number;
  format?: 'webp' | 'jpg' | 'png';
  quality?: number;
  fit?: 'crop' | 'scale' | 'fill';
}

/**
 * Detecta el tipo de dispositivo basado en el ancho de la ventana
 */
export function getDeviceType(): DeviceType {
  if (typeof window === 'undefined') {
    return 'desktop'; // Default para SSR
  }

  const width = window.innerWidth;

  if (width < 768) {
    return 'mobile';
  } else if (width < 1024) {
    return 'tablet';
  } else {
    return 'desktop';
  }
}

/**
 * Obtiene las dimensiones de la imagen según el tamaño requerido y el dispositivo
 */
function getImageDimensions(
  size: ImageSize,
  deviceType: DeviceType,
): { width: number; height: number } {
  // Dimensiones base según el tamaño requerido
  const sizeMap: Record<
    ImageSize,
    Record<DeviceType, { width: number; height: number }>
  > = {
    small: {
      mobile: { width: 200, height: 200 },
      tablet: { width: 250, height: 250 },
      desktop: { width: 300, height: 300 },
    },
    medium: {
      mobile: { width: 300, height: 300 },
      tablet: { width: 400, height: 400 },
      desktop: { width: 500, height: 500 },
    },
    large: {
      mobile: { width: 400, height: 400 },
      tablet: { width: 600, height: 600 },
      desktop: { width: 800, height: 800 },
    },
    xlarge: {
      mobile: { width: 600, height: 600 },
      tablet: { width: 800, height: 800 },
      desktop: { width: 1200, height: 1200 },
    },
  };

  return sizeMap[size][deviceType];
}

/**
 * Genera los query params de optimización para la imagen
 */
function buildOptimizationParams(
  params: ImageOptimizationParams,
): string {
  const queryParams = new URLSearchParams({
    fm: params.format || 'webp',
    w: params.width.toString(),
    h: params.height.toString(),
    fit: params.fit || 'crop',
    q: (params.quality || 80).toString(),
  });

  return queryParams.toString();
}

/**
 * Optimiza la URL de una imagen agregando query params según el dispositivo y tamaño
 * @param imageUrl URL original de la imagen
 * @param size Tamaño requerido de la imagen
 * @param deviceType Tipo de dispositivo (opcional, se detecta automáticamente si no se proporciona)
 * @param customDimensions Dimensiones personalizadas (opcional, sobrescribe el tamaño)
 * @returns URL optimizada con query params
 */
export function optimizeImageUrl(
  imageUrl: string,
  size: ImageSize = 'medium',
  deviceType?: DeviceType,
  customDimensions?: { width: number; height: number },
): string {
  // Si la URL ya tiene query params, no optimizar
  if (imageUrl.includes('?')) {
    return imageUrl;
  }

  const detectedDevice = deviceType || getDeviceType();
  const dimensions = customDimensions || getImageDimensions(size, detectedDevice);

  const params: ImageOptimizationParams = {
    width: dimensions.width,
    height: dimensions.height,
    format: 'webp',
    quality: 80,
    fit: 'crop',
  };

  const queryString = buildOptimizationParams(params);
  const separator = imageUrl.includes('?') ? '&' : '?';

  return `${imageUrl}${separator}${queryString}`;
}

