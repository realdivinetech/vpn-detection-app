const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async analyzeIp() {
    try {
      const response = await fetch(`${this.baseUrl}/analyze-ip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('IP analysis failed:', error);
      throw error;
    }
  }

  async logDetection(detectionData: unknown) {
    try {
      const response = await fetch(`${this.baseUrl}/log-detection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(detectionData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Detection logging failed:', error);
      throw error;
    }
  }

  async getLogs(page: number = 1, limit: number = 20) {
    try {
      const response = await fetch(`${this.baseUrl}/admin/logs?page=${page}&limit=${limit}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      return [];
    }
  }

  async getStats() {
    try {
      const response = await fetch(`${this.baseUrl}/admin/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      return {
        totalScans: 0,
        vpnDetected: 0,
        cleanConnections: 0,
        averageConfidence: 0,
        topCountries: [],
        topIsps: []
      };
    }
  }

  async exportLogs() {
    try {
      const response = await fetch(`${this.baseUrl}/admin/export-logs`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to export logs:', error);
      throw error;
    }
  }

  async clearLogs() {
    try {
      const response = await fetch(`${this.baseUrl}/admin/clear-logs`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to clear logs:', error);
      throw error;
    }
  }

  async checkHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET'
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // Utility method to get client IP (best effort)
  async getClientIp() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      try {
        // Fallback
        const response = await fetch('https://httpbin.org/ip');
        const data = await response.json();
        return data.origin;
      } catch (fallbackError) {
        return null;
      }
    }
  }

  // Method to test various external services
  async testExternalServices() {
    const services = [
      { name: 'IPify', url: 'https://api.ipify.org' },
      { name: 'IP-API', url: 'http://ip-api.com/json' },
      { name: 'IPapi', url: 'https://ipapi.co/json' }
    ];

    const results = await Promise.allSettled(
      services.map(async (service) => {
        try {
          const response = await fetch(service.url, { 
            method: 'GET',
            signal: AbortSignal.timeout(5000) 
          });
          return {
            name: service.name,
            status: response.ok ? 'online' : 'error',
            responseTime: Date.now()
          };
        } catch (error) {
          return {
            name: service.name,
            status: 'offline',
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );

    return results.map(result => 
      result.status === 'fulfilled' ? result.value : result.reason
    );
  }
}

export const apiClient = new ApiClient();