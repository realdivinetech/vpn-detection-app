import { describe, it, expect } from 'vitest';
import { WebRTCLeak } from '../src/lib/webrtcLeak';

describe('WebRTCLeak', () => {
  it('should detect WebRTC leaks correctly', async () => {
    const webrtcLeak = new WebRTCLeak();
    const result = await webrtcLeak.detectLeak();
    expect(result).toHaveProperty('hasLeak');
    expect(typeof result.hasLeak).toBe('boolean');
  });
});
