import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DetectionEngine } from '../src/lib/detectionEngine';

describe('DetectionEngine', () => {
  let engine: DetectionEngine;

  beforeEach(() => {
    engine = new DetectionEngine();
  });

  it('should calculate confidence score correctly with no flags', async () => {
    // Mock all detection methods to return no flags
    vi.spyOn(engine as any, 'runIpAnalysis').mockResolvedValue({
      isDatacenter: false,
      isHosting: false,
      isTor: false,
      vpnDetected: false,
      blacklisted: false,
      riskScore: 0,
      timezone: 'Unknown',
      country: 'Unknown'
    });
    vi.spyOn(engine as any, 'webrtcLeak').mockImplementation(() => ({
      detectLeak: async () => ({ hasLeak: false })
    }));
    vi.spyOn(engine as any, 'fingerprinting').mockImplementation(() => ({
      generateFingerprint: async () => ({
        timezone: 'Unknown',
        suspicionScore: 0,
        languages: []
      })
    }));
    vi.spyOn(engine as any, 'locationMismatch').mockImplementation(() => ({
      checkLocationMismatch: async () => ({ hasMismatch: false })
    }));
    vi.spyOn(engine as any, 'runBotDetection').mockResolvedValue({ isBot: false });

    const result = await engine.runFullDetection();
    expect(result.confidenceScore).toBe(0);
    expect(result.isVpnDetected).toBe(false);
    expect(result.detectedTypes.length).toBe(0);
  });

  it('should detect datacenter IP and add to confidence score', async () => {
    vi.spyOn(engine as any, 'runIpAnalysis').mockResolvedValue({
      isDatacenter: true,
      isHosting: false,
      isTor: false,
      vpnDetected: false,
      blacklisted: false,
      riskScore: 0,
      timezone: 'Unknown',
      country: 'Unknown'
    });
    vi.spyOn(engine as any, 'webrtcLeak').mockImplementation(() => ({
      detectLeak: async () => ({ hasLeak: false })
    }));
    vi.spyOn(engine as any, 'fingerprinting').mockImplementation(() => ({
      generateFingerprint: async () => ({
        timezone: 'Unknown',
        suspicionScore: 0,
        languages: []
      })
    }));
    vi.spyOn(engine as any, 'locationMismatch').mockImplementation(() => ({
      checkLocationMismatch: async () => ({ hasMismatch: false })
    }));
    vi.spyOn(engine as any, 'runBotDetection').mockResolvedValue({ isBot: false });

    const result = await engine.runFullDetection();
    expect(result.confidenceScore).toBeGreaterThan(0);
    expect(result.detectedTypes).toContain('Datacenter IP');
  });

  it('should detect VPN when confidence score >= 50', async () => {
    vi.spyOn(engine as any, 'runIpAnalysis').mockResolvedValue({
      isDatacenter: true,
      isHosting: true,
      isTor: true,
      vpnDetected: true,
      blacklisted: true,
      riskScore: 50,
      timezone: 'Unknown',
      country: 'Unknown'
    });
    vi.spyOn(engine as any, 'webrtcLeak').mockImplementation(() => ({
      detectLeak: async () => ({ hasLeak: true })
    }));
    vi.spyOn(engine as any, 'fingerprinting').mockImplementation(() => ({
      generateFingerprint: async () => ({
        timezone: 'UTC',
        suspicionScore: 70,
        languages: ['en']
      })
    }));
    vi.spyOn(engine as any, 'locationMismatch').mockImplementation(() => ({
      checkLocationMismatch: async () => ({ hasMismatch: true })
    }));
    vi.spyOn(engine as any, 'runBotDetection').mockResolvedValue({ isBot: true });

    const result = await engine.runFullDetection();
    expect(result.isVpnDetected).toBe(true);
    expect(result.confidenceScore).toBeGreaterThanOrEqual(50);
    expect(result.detectedTypes.length).toBeGreaterThan(0);
  });
});
