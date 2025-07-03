export class WebRTCLeak {
  private stunServers = [
    'stun:stun.l.google.com:19302',
    'stun:stun1.l.google.com:19302',
    'stun:stun2.l.google.com:19302',
    'stun:stun.services.mozilla.com',
    'stun:stun.stunprotocol.org:3478'
  ];

  async detectLeak(): Promise<{
    hasLeak: boolean;
    localIps: string[];
    localIpCountry?: string;
    publicIp?: string;
    stunServersUsed: string[];
  }> {
    return new Promise((resolve) => {
      const localIps: string[] = [];
      const stunServersUsed: string[] = [];
      let completedChecks = 0;
      const totalChecks = this.stunServers.length;

      const handleComplete = async () => {
        completedChecks++;
        if (completedChecks >= totalChecks) {
          const uniqueLocalIps = [...new Set(localIps)];
          let localIpCountry = '';
          if (uniqueLocalIps.length > 0) {
            try {
              const response = await fetch(`https://ipapi.co/${uniqueLocalIps[0]}/country/`);
              if (response.ok) {
                localIpCountry = await response.text();
              }
            } catch {
              // ignore errors
            }
          }
          resolve({
            hasLeak: uniqueLocalIps.length > 0,
            localIps: uniqueLocalIps,
            localIpCountry,
            stunServersUsed
          });
        }
      };

      // If WebRTC is not supported, return no leak
      if (!window.RTCPeerConnection) {
        resolve({
          hasLeak: false,
          localIps: [],
          stunServersUsed: []
        });
        return;
      }

      this.stunServers.forEach((stunServer, index) => {
        try {
          const pc = new RTCPeerConnection({
            iceServers: [{ urls: stunServer }]
          });

          stunServersUsed.push(stunServer);

          pc.createDataChannel('');

          pc.onicecandidate = (event) => {
            if (event.candidate) {
              const candidate = event.candidate.candidate;
              const ipMatch = candidate.match(/([0-9]{1,3}(\.[0-9]{1,3}){3})/);
              
              if (ipMatch) {
                const ip = ipMatch[1];
                // Filter out localhost and invalid IPs
                if (this.isValidLocalIP(ip)) {
                  localIps.push(ip);
                }
              }
            }
          };

          pc.onicegatheringstatechange = () => {
            if (pc.iceGatheringState === 'complete') {
              pc.close();
              handleComplete();
            }
          };

          pc.createOffer()
            .then(offer => pc.setLocalDescription(offer))
            .catch(() => {
              pc.close();
              handleComplete();
            });

          // Timeout after 3 seconds
          setTimeout(() => {
            if (pc.iceGatheringState !== 'complete') {
              pc.close();
              handleComplete();
            }
          }, 3000);

        } catch (error) {
          handleComplete();
        }
      });

      // Fallback timeout
      setTimeout(() => {
        if (completedChecks < totalChecks) {
          const uniqueLocalIps = [...new Set(localIps)];
          let localIpCountry = '';
          (async () => {
            if (uniqueLocalIps.length > 0) {
              try {
                const response = await fetch(`https://ipapi.co/${uniqueLocalIps[0]}/country/`);
                if (response.ok) {
                  localIpCountry = await response.text();
                }
              } catch {
                // ignore errors
              }
            }
            resolve({
              hasLeak: uniqueLocalIps.length > 0,
              localIps: uniqueLocalIps,
              localIpCountry,
              stunServersUsed
            });
          })();
        }
      }, 5000);
    });
  }

  private isValidLocalIP(ip: string): boolean {
    // Check if IP is a valid local/private IP
    const parts = ip.split('.').map(Number);
    
    if (parts.length !== 4 || parts.some(part => part < 0 || part > 255)) {
      return false;
    }

    // Exclude localhost
    if (ip === '127.0.0.1' || ip === '0.0.0.0') {
      return false;
    }

    // Include private IP ranges
    return (
      (parts[0] === 10) || // 10.0.0.0/8
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || // 172.16.0.0/12
      (parts[0] === 192 && parts[1] === 168) || // 192.168.0.0/16
      (parts[0] === 169 && parts[1] === 254) // 169.254.0.0/16 (link-local)
    );
  }

  async getPublicIP(): Promise<string | null> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      try {
        // Fallback to another service
        const response = await fetch('https://httpbin.org/ip');
        const data = await response.json();
        return data.origin;
      } catch (fallbackError) {
        return null;
      }
    }
  }
}