import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LocationMismatch } from '../src/lib/locationMismatch';

describe('LocationMismatch', () => {
  const locationMismatch = new LocationMismatch();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should detect no mismatch when GPS and IP locations are close', async () => {
    vi.spyOn(locationMismatch, 'getGPSLocation').mockResolvedValue({
      success: true,
      location: { lat: 40.7128, lng: -74.0060, accuracy: 10 }
    });
    vi.spyOn(locationMismatch, 'getIPLocation').mockResolvedValue({
      success: true,
      location: { lat: 40.7130, lng: -74.0059 },
      country: 'United States',
      city: 'New York'
    });
    vi.spyOn(locationMismatch, 'getCountryFromLatLng').mockResolvedValue('United States');

    const result = await locationMismatch.checkLocationMismatch();
    expect(result.hasMismatch).toBe(false);
    expect(result.matchLevel).toBe('good');
  });

  it('should detect mismatch when GPS and IP locations are far apart', async () => {
    vi.spyOn(locationMismatch, 'getGPSLocation').mockResolvedValue({
      success: true,
      location: { lat: 40.7128, lng: -74.0060, accuracy: 10 }
    });
    vi.spyOn(locationMismatch, 'getIPLocation').mockResolvedValue({
      success: true,
      location: { lat: 34.0522, lng: -118.2437 },
      country: 'United States',
      city: 'Los Angeles'
    });
    vi.spyOn(locationMismatch, 'getCountryFromLatLng').mockResolvedValue('United States');

    const result = await locationMismatch.checkLocationMismatch();
    expect(result.hasMismatch).toBe(true);
    expect(result.matchLevel).toBe('mismatch');
  });

  it('should handle GPS failure gracefully', async () => {
    vi.spyOn(locationMismatch, 'getGPSLocation').mockResolvedValue({
      success: false,
      error: 'GPS permission denied'
    });
    vi.spyOn(locationMismatch, 'getIPLocation').mockResolvedValue({
      success: true,
      location: { lat: 40.7128, lng: -74.0060 },
      country: 'United States',
      city: 'New York'
    });

    const result = await locationMismatch.checkLocationMismatch();
    expect(result.hasMismatch).toBe(false);
    expect(result.message).toContain('Could not determine location');
  });
});
