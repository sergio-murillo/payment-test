import {
  getDeviceType,
  optimizeImageUrl,
  ImageSize,
  DeviceType,
} from './image-optimizer';

describe('image-optimizer', () => {
  const originalInnerWidth = window.innerWidth;

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
  });

  describe('getDeviceType', () => {
    it('should return mobile for width < 768', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      });

      expect(getDeviceType()).toBe('mobile');
    });

    it('should return tablet for width >= 768 and < 1024', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 900,
      });

      expect(getDeviceType()).toBe('tablet');
    });

    it('should return desktop for width >= 1024', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      });

      expect(getDeviceType()).toBe('desktop');
    });

    it('should return desktop when window is undefined (SSR)', () => {
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;

      expect(getDeviceType()).toBe('desktop');

      global.window = originalWindow;
    });

    it('should return desktop for exactly 1024', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });

      expect(getDeviceType()).toBe('desktop');
    });
  });

  describe('optimizeImageUrl', () => {
    const baseUrl = 'https://example.com/image.jpg';

    it('should optimize image URL with default size', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200, // desktop
      });

      const optimized = optimizeImageUrl(baseUrl);

      expect(optimized).toContain('?');
      expect(optimized).toContain('fm=webp');
      expect(optimized).toContain('w=500');
      expect(optimized).toContain('h=500');
      expect(optimized).toContain('fit=crop');
      expect(optimized).toContain('q=80');
    });

    it('should optimize image URL with small size', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200, // desktop
      });

      const optimized = optimizeImageUrl(baseUrl, 'small');

      expect(optimized).toContain('w=300');
      expect(optimized).toContain('h=300');
    });

    it('should optimize image URL with large size', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200, // desktop
      });

      const optimized = optimizeImageUrl(baseUrl, 'large');

      expect(optimized).toContain('w=800');
      expect(optimized).toContain('h=800');
    });

    it('should optimize image URL for mobile device', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500, // mobile
      });

      const optimized = optimizeImageUrl(baseUrl, 'medium');

      expect(optimized).toContain('w=300');
      expect(optimized).toContain('h=300');
    });

    it('should optimize image URL for tablet device', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 900, // tablet
      });

      const optimized = optimizeImageUrl(baseUrl, 'medium');

      expect(optimized).toContain('w=400');
      expect(optimized).toContain('h=400');
    });

    it('should use custom device type when provided', () => {
      const optimized = optimizeImageUrl(baseUrl, 'medium', 'mobile');

      expect(optimized).toContain('w=300');
      expect(optimized).toContain('h=300');
    });

    it('should use custom dimensions when provided', () => {
      const optimized = optimizeImageUrl(
        baseUrl,
        'medium',
        'desktop',
        { width: 1000, height: 1000 },
      );

      expect(optimized).toContain('w=1000');
      expect(optimized).toContain('h=1000');
    });

    it('should not modify URL that already has query params', () => {
      const urlWithParams = 'https://example.com/image.jpg?existing=param';

      const optimized = optimizeImageUrl(urlWithParams);

      expect(optimized).toBe(urlWithParams);
    });

    it('should handle xlarge size', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200, // desktop
      });

      const optimized = optimizeImageUrl(baseUrl, 'xlarge');

      expect(optimized).toContain('w=1200');
      expect(optimized).toContain('h=1200');
    });
  });
});
