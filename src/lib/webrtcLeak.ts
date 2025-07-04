export interface WebRTCLeakResult {
  hasLeak: boolean;
  localIps: string[];
  localIpv6s: string[];
  publicIps: string[];
  stunServersUsed: string[];
  candidateTypes: Set<string>;
}

export class WebRTCLeak {
  private stunServers = [
    'stun:stun.l.google.com:19302',
    'stun:stun1.l.google.com:19302',
    'stun:stun2.l.google.com:19302',
    'stun:stun.services.mozilla.com',
    'stun:stun.stunprotocol.org:3478',
    'stun:stun.voipbuster.com',
    'stun:stun.voipstunt.com',
    'stun:stun.counterpath.com',
    'stun:stun.ideasip.com',
    'stun:stun.schlund.de'
  ];

  async detectLeak(): Promise<WebRTCLeakResult> {
    return new Promise((resolve) => {
      const localIps: string[] = [];
      const localIpv6s: string[] = [];
      const publicIps: string[] = [];
      const stunServersUsed: string[] = [];
      const candidateTypes: Set<string> = new Set();
      let completedChecks = 0;
      const totalChecks = this.stunServers.length;

      const ipv4Regex = /([0-9]{1,3}(?:\.[0-9]{1,3}){3})/;
      const ipv6Regex = /([a-fA-F0-9:]+:+)+[a-fA-F0-9]+/;

      const handleComplete = () => {
        completedChecks++;
        if (completedChecks >= totalChecks) {
          const uniqueLocalIps = [...new Set(localIps)];
          const uniqueLocalIpv6s = [...new Set(localIpv6s)];
          const uniquePublicIps = [...new Set(publicIps)];
          resolve({
            hasLeak: uniqueLocalIps.length > 0 || uniqueLocalIpv6s.length > 0 || uniquePublicIps.length > 0,
            localIps: uniqueLocalIps,
            localIpv6s: uniqueLocalIpv6s,
            publicIps: uniquePublicIps,
            stunServersUsed,
            candidateTypes
          });
        }
      };

      if (!window.RTCPeerConnection) {
        resolve({
          hasLeak: false,
          localIps: [],
          localIpv6s: [],
          publicIps: [],
          stunServersUsed: [],
          candidateTypes
        });
        return;
      }

      this.stunServers.forEach((stunServer) => {
        try {
          const pc = new RTCPeerConnection({
            iceServers: [{ urls: stunServer }]
          });

          stunServersUsed.push(stunServer);

          pc.createDataChannel('');

          pc.onicecandidate = (event) => {
            if (event.candidate) {
              const candidate = event.candidate.candidate;

              // Extract candidate type
              const typeMatch = candidate.match(/typ ([a-zA-Z]+)/);
              if (typeMatch) {
                candidateTypes.add(typeMatch[1]);
              }

              // Extract IPv4 addresses
              const ipv4Match = candidate.match(ipv4Regex);
              if (ipv4Match) {
                const ip = ipv4Match[1];
                if (this.isValidLocalIP(ip)) {
                  localIps.push(ip);
                } else {
                  publicIps.push(ip);
                }
              }

              // Extract IPv6 addresses
              const ipv6Match = candidate.match(ipv6Regex);
              if (ipv6Match) {
                const ip6 = ipv6Match[0];
                // For simplicity, consider all IPv6 as local (could refine)
                localIpv6s.push(ip6);
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

          setTimeout(() => {
            if (pc.iceGatheringState !== 'complete') {
              pc.close();
              handleComplete();
            }
          }, 5000);

        } catch {
          handleComplete();
        }
      });

      setTimeout(() => {
        if (completedChecks < totalChecks) {
          handleComplete();
        }
      }, 7000);
    });
  }

  private isValidLocalIP(ip: string): boolean {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some(part => part < 0 || part > 255)) {
      return false;
    }
    if (ip === '127.0.0.1' || ip === '0.0.0.0') {
      return false;
    }
    return (
      (parts[0] === 10) ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168) ||
      (parts[0] === 169 && parts[1] === 254)
    );
  }
}
