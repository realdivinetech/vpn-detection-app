import { describe, it, expect } from 'vitest';
import { apiClient } from '../src/lib/apiClient';

describe('apiClient', () => {
  it('should have logDetection method', () => {
    expect(typeof apiClient.logDetection).toBe('function');
  });

  it('logDetection should return a promise', () => {
    const result = apiClient.logDetection({ test: 'data' });
    expect(result).toBeInstanceOf(Promise);
  });
});
