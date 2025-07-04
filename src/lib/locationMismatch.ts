export class LocationMismatch {
  async checkLocationMismatch(): Promise<{
    hasMismatch: boolean;
    matchLevel: 'good' | 'fair' | 'mismatch';
    message: string;
    distance?: number;
    countryMismatch?: boolean;
    gpsAvailable: boolean;
    gpsLocation?: { lat: number; lng: number; accuracy: number };
    ipLocation?: { lat: number; lng: number; country: string; city: string };
    error?: string;
  }> {
    try {
      const [gpsResult, ipResult] = await Promise.all([
        this.getGPSLocation(),
        this.getIPLocation()
      ]);

      if (!gpsResult.success || !ipResult.success) {
        return {
          hasMismatch: false,
          matchLevel: gpsResult.success ? 'mismatch' : 'good',
          message: gpsResult.success ? 'Could not determine location' : 'Location turned off or unavailable',
          gpsAvailable: gpsResult.success && gpsResult.location !== undefined,
          error: gpsResult.error || ipResult.error
        };
      }

      const distance = this.calculateDistance(
        gpsResult.location!,
        ipResult.location!
      );

      const gpsLat = gpsResult.location!.lat;
      const gpsLng = gpsResult.location!.lng;
      const gpsCountry = await this.getCountryFromLatLng(gpsLat, gpsLng) || 'Unknown';
      const ipCountry = ipResult.country;

      let matchLevel: 'good' | 'fair' | 'mismatch';
      let message: string;

      if (distance <= 300) {
        matchLevel = 'good';
        message = `Good location match (distance: ${Math.round(distance)} km, likely same region or city)`;
      } else if (distance <= 1000) {
        matchLevel = 'fair';
        message = `Fair location match (distance: ${Math.round(distance)} km, possible ISP drift)`;
      } else {
        matchLevel = 'mismatch';
        message = `Location mismatch (distance: ${Math.round(distance)} km, GPS and IP are far apart)`;
      }

      return {
        hasMismatch: matchLevel === 'mismatch',
        matchLevel,
        message,
        distance,
        gpsAvailable: true,
        gpsLocation: gpsResult.location,
      ipLocation: {
        ...ipResult.location!,
        country: ipCountry || 'Unknown',
        city: ipResult.city || 'Unknown'
      }
      };
    } catch (error) {
      return {
        hasMismatch: false,
        matchLevel: 'mismatch',
        message: 'Location check failed',
        gpsAvailable: false,
        error: 'Location check failed'
      };
    }
  }

  private async getGPSLocation(): Promise<{
    success: boolean;
    location?: { lat: number; lng: number; accuracy: number };
    error?: string;
    permissionGranted?: boolean;
  }> {
    if (!navigator.geolocation) {
      return {
        success: false,
        error: 'Geolocation not supported',
        permissionGranted: false
      };
    }

    let permissionGranted = false;
    try {
      const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
      permissionGranted = permissionStatus.state === 'granted' || permissionStatus.state === 'prompt';
    } catch {
      // Permissions API not supported or error, fallback to false
      permissionGranted = false;
    }

    if (!permissionGranted) {
      // Try to request permission explicitly by calling getCurrentPosition once
      try {
        const permissionResult = await new Promise<boolean>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            () => resolve(true),
            () => resolve(false),
            { timeout: 5000 }
          );
        });
        permissionGranted = permissionResult;
      } catch {
        permissionGranted = false;
      }
    }

    if (!permissionGranted) {
      // User denied permission or permission not granted
      // Return early with appropriate error message
      return {
        success: false,
        error: 'GPS permission denied or not granted',
        permissionGranted: false
      };
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({
          success: false,
          error: 'GPS timeout',
          permissionGranted
        });
      }, 10000);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeout);
          resolve({
            success: true,
            location: {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy
            },
            permissionGranted
          });
        },
        (error) => {
          clearTimeout(timeout);
          let errorMessage = 'GPS error';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'GPS permission denied';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'GPS position unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'GPS timeout';
              break;
          }
          resolve({
            success: false,
            error: errorMessage,
            permissionGranted
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }

  private async getIPLocation(): Promise<{
    success: boolean;
    location?: { lat: number; lng: number };
    country?: string;
    city?: string;
    error?: string;
  }> {
    try {
      // Try ip-api.com first (free, no API key required)
      const response = await fetch('http://ip-api.com/json/?fields=status,country,city,lat,lon', {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error('IP geolocation API failed');
      }

      const data = await response.json();

      if (data.status === 'success') {
        return {
          success: true,
          location: {
            lat: data.lat,
            lng: data.lon
          },
          country: data.country,
          city: data.city
        };
      } else {
        throw new Error('IP geolocation failed');
      }
    } catch (error) {
      // Fallback to ipapi.co
      try {
        const fallbackResponse = await fetch('https://ipapi.co/json/');
        const fallbackData = await fallbackResponse.json();
        
        if (fallbackData.latitude && fallbackData.longitude) {
          return {
            success: true,
            location: {
              lat: fallbackData.latitude,
              lng: fallbackData.longitude
            },
            country: fallbackData.country_name,
            city: fallbackData.city
          };
        }
      } catch (fallbackError) {
        // Ignore fallback error
      }

      return {
        success: false,
        error: 'All IP geolocation services failed'
      };
    }
  }

  private async getCountryFromLatLng(lat: number, lng: number): Promise<string | undefined> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
      );
      if (!response.ok) return undefined;
      const data = await response.json();
      return data.address?.country || undefined;
    } catch {
      return undefined;
    }
  }

  private calculateDistance(
    pos1: { lat: number; lng: number },
    pos2: { lat: number; lng: number }
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(pos2.lat - pos1.lat);
    const dLng = this.toRadians(pos2.lng - pos1.lng);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(pos1.lat)) * Math.cos(this.toRadians(pos2.lat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}