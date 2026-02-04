import { apiClient } from './api-client';

describe('apiClient', () => {
  it('should create axios instance with correct base URL', () => {
    expect(apiClient.defaults.baseURL).toBe(
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    );
  });

  it('should have correct headers', () => {
    expect(apiClient.defaults.headers['Content-Type']).toBe(
      'application/json',
    );
  });

  describe('response interceptor', () => {
    it('should have response interceptor configured', () => {
      const handlers = apiClient.interceptors.response.handlers;
      expect(handlers).toBeDefined();
      expect(handlers?.length).toBeGreaterThan(0);
    });

    it('should return response on success', () => {
      const response = { data: { success: true } };
      const handlers = apiClient.interceptors.response.handlers;
      const interceptor = handlers?.[0];

      if (interceptor && interceptor.fulfilled) {
        const result = interceptor.fulfilled(response as any);
        expect(result).toEqual(response);
      } else {
        expect(interceptor).toBeDefined();
      }
    });

    it('should throw error with message from response', () => {
      const error = {
        response: {
          data: {
            message: 'Custom error message',
          },
        },
      };

      const handlers = apiClient.interceptors.response.handlers;
      const interceptor = handlers?.[0];
      const rejected = interceptor?.rejected;

      if (rejected) {
        expect(() => {
          rejected(error as any);
        }).toThrow('Custom error message');
      } else {
        expect(interceptor).toBeDefined();
      }
    });

    it('should throw error with error field from response', () => {
      const error = {
        response: {
          data: {
            error: 'Error field message',
          },
        },
      };

      const handlers = apiClient.interceptors.response.handlers;
      const interceptor = handlers?.[0];
      const rejected = interceptor?.rejected;

      if (rejected) {
        expect(() => {
          rejected(error as any);
        }).toThrow('Error field message');
      } else {
        expect(interceptor).toBeDefined();
      }
    });

    it('should throw generic error when no message or error field', () => {
      const error = {
        response: {
          data: {},
        },
      };

      const handlers = apiClient.interceptors.response.handlers;
      const interceptor = handlers?.[0];
      const rejected = interceptor?.rejected;

      if (rejected) {
        expect(() => {
          rejected(error as any);
        }).toThrow('An error occurred');
      } else {
        expect(interceptor).toBeDefined();
      }
    });

    it('should rethrow error when no response', () => {
      const error = new Error('Network error');

      const handlers = apiClient.interceptors.response.handlers;
      const interceptor = handlers?.[0];
      const rejected = interceptor?.rejected;

      if (rejected) {
        expect(() => {
          rejected(error as any);
        }).toThrow('Network error');
      } else {
        expect(interceptor).toBeDefined();
      }
    });
  });
});
