import { renderHook, act } from '@testing-library/react';
import { useDeviceType } from './use-device-type';
import { getDeviceType } from '@/utils/image-optimizer';

jest.mock('@/utils/image-optimizer', () => ({
  getDeviceType: jest.fn(),
}));

describe('useDeviceType', () => {
  const mockGetDeviceType = getDeviceType as jest.MockedFunction<
    typeof getDeviceType
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return device type from getDeviceType', () => {
    mockGetDeviceType.mockReturnValue('desktop');

    const { result } = renderHook(() => useDeviceType());

    expect(result.current).toBe('desktop');
    expect(mockGetDeviceType).toHaveBeenCalled();
  });

  it('should update device type on window resize', () => {
    mockGetDeviceType.mockReturnValue('desktop');

    const { result } = renderHook(() => useDeviceType());

    expect(result.current).toBe('desktop');

    // Simulate resize to mobile
    mockGetDeviceType.mockReturnValue('mobile');
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current).toBe('mobile');
  });

  it('should update device type on multiple resize events', () => {
    mockGetDeviceType.mockReturnValue('desktop');

    const { result } = renderHook(() => useDeviceType());

    expect(result.current).toBe('desktop');

    // Resize to tablet
    mockGetDeviceType.mockReturnValue('tablet');
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    expect(result.current).toBe('tablet');

    // Resize to mobile
    mockGetDeviceType.mockReturnValue('mobile');
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    expect(result.current).toBe('mobile');
  });

  it('should cleanup event listener on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
    mockGetDeviceType.mockReturnValue('desktop');

    const { unmount } = renderHook(() => useDeviceType());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'resize',
      expect.any(Function),
    );
  });
});
