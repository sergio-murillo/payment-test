import { renderHook } from '@testing-library/react';
import { useOptimizedImage } from './use-optimized-image';
import { useDeviceType } from './use-device-type';
import { optimizeImageUrl } from '@/utils/image-optimizer';

jest.mock('./use-device-type');
jest.mock('@/utils/image-optimizer');

describe('useOptimizedImage', () => {
  const mockUseDeviceType = useDeviceType as jest.MockedFunction<
    typeof useDeviceType
  >;
  const mockOptimizeImageUrl = optimizeImageUrl as jest.MockedFunction<
    typeof optimizeImageUrl
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return optimized image URL with default size', () => {
    mockUseDeviceType.mockReturnValue('desktop');
    mockOptimizeImageUrl.mockReturnValue(
      'https://example.com/image.jpg?fm=webp&w=500&h=500',
    );

    const { result } = renderHook(() =>
      useOptimizedImage('https://example.com/image.jpg'),
    );

    expect(result.current).toBe('https://example.com/image.jpg?fm=webp&w=500&h=500');
    expect(mockOptimizeImageUrl).toHaveBeenCalledWith(
      'https://example.com/image.jpg',
      'medium',
      'desktop',
      undefined,
    );
  });

  it('should use custom size', () => {
    mockUseDeviceType.mockReturnValue('desktop');
    mockOptimizeImageUrl.mockReturnValue(
      'https://example.com/image.jpg?fm=webp&w=800&h=800',
    );

    const { result } = renderHook(() =>
      useOptimizedImage('https://example.com/image.jpg', 'large'),
    );

    expect(mockOptimizeImageUrl).toHaveBeenCalledWith(
      'https://example.com/image.jpg',
      'large',
      'desktop',
      undefined,
    );
  });

  it('should use device type from useDeviceType hook', () => {
    mockUseDeviceType.mockReturnValue('mobile');
    mockOptimizeImageUrl.mockReturnValue(
      'https://example.com/image.jpg?fm=webp&w=300&h=300',
    );

    renderHook(() => useOptimizedImage('https://example.com/image.jpg'));

    expect(mockOptimizeImageUrl).toHaveBeenCalledWith(
      'https://example.com/image.jpg',
      'medium',
      'mobile',
      undefined,
    );
  });

  it('should use custom dimensions when provided', () => {
    mockUseDeviceType.mockReturnValue('desktop');
    mockOptimizeImageUrl.mockReturnValue(
      'https://example.com/image.jpg?fm=webp&w=1000&h=1000',
    );

    const customDimensions = { width: 1000, height: 1000 };

    renderHook(() =>
      useOptimizedImage(
        'https://example.com/image.jpg',
        'medium',
        customDimensions,
      ),
    );

    expect(mockOptimizeImageUrl).toHaveBeenCalledWith(
      'https://example.com/image.jpg',
      'medium',
      'desktop',
      customDimensions,
    );
  });

  it('should memoize result based on dependencies', () => {
    mockUseDeviceType.mockReturnValue('desktop');
    mockOptimizeImageUrl.mockReturnValue(
      'https://example.com/image.jpg?fm=webp&w=500&h=500',
    );

    const { result, rerender } = renderHook(
      ({ url, size }) => useOptimizedImage(url, size),
      {
        initialProps: {
          url: 'https://example.com/image.jpg',
          size: 'medium' as const,
        },
      },
    );

    const firstResult = result.current;

    // Rerender with same props
    rerender({
      url: 'https://example.com/image.jpg',
      size: 'medium' as const,
    });

    // Should return same reference (memoized)
    expect(result.current).toBe(firstResult);

    // Change URL
    rerender({
      url: 'https://example.com/image2.jpg',
      size: 'medium' as const,
    });

    // Should call optimizeImageUrl again
    expect(mockOptimizeImageUrl).toHaveBeenCalledTimes(2);
  });
});
