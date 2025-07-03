import { BrowserFingerprinting } from './fingerprinting';
import { WebRTCLeak } from './webrtcLeak';
import { LocationMismatch } from './locationMismatch';
import { BehaviorAnalysis } from './behaviorAnalysis';
import { apiClient } from './apiClient';
import { DetectionResult, DetectionResults } from '@/types/detection';

export class DetectionEngine {
  private fingerprinting: BrowserFingerprinting;
  private webrtcLeak: WebRTCLeak;
  private locationMismatch: LocationMismatch;

  constructor() {
    this.fingerprinting = new BrowserFingerprinting();
    this.webrtcLeak = new WebRTCLeak();
    this.locationMismatch = new LocationMismatch();
  }

  async runFullDetection(): Promise<DetectionResult> {
    const startTime = Date.now();
    
    try {
      // Run all detection methods in parallel
      const [
        ipAnalysis,
        webrtcResult,
        fingerprintResult,
        locationResult,
        botDetection
      ] = await Promise.all([
        this.runIpAnalysis(),
        (async () => {
          const webrtcResult = await this.webrtcLeak.detectLeak();
          // Ensure localIpCountry is present (fallback to empty string if missing)
          return {
            localIpCountry: (webrtcResult as any).localIpCountry ?? '',
            ...webrtcResult
          };
        })(),
        this.fingerprinting.generateFingerprint(),
        this.locationMismatch.checkLocationMismatch(),
        this.runBotDetection()
      ]);

      const results: DetectionResults = {
        ipAnalysis,
        webrtcLeak: webrtcResult,
        fingerprint: {
          ...fingerprintResult,
          languages: Array.from(fingerprintResult.languages)
        },
        locationMismatch: locationResult,
        botDetection
      };

      // Calculate overall detection result
      const detectionResult = this.calculateOverallResult(results);
      
      // Log the detection result
      await this.logDetection(detectionResult, Date.now() - startTime);

      return detectionResult;
    } catch (error) {
      console.error('Detection engine error:', error);
      throw new Error('Detection failed');
    }
  }

  private getTimezoneFromCountryCode(countryCode: string): string {
    // Basic mapping of country codes to timezones (can be expanded)
    const countryTimezoneMap: Record<string, string> = {
      'US': 'America/New_York',
      'CA': 'America/Toronto',
      'GB': 'Europe/London',
      'FR': 'Europe/Paris',
      'DE': 'Europe/Berlin',
      'NG': 'Africa/Lagos',
      'ZA': 'Africa/Johannesburg',
      'EG': 'Africa/Cairo',
      'CN': 'Asia/Shanghai',
      'JP': 'Asia/Tokyo',
      'IN': 'Asia/Kolkata',
      'AU': 'Australia/Sydney',
      'NZ': 'Pacific/Auckland',
      'BR': 'America/Sao_Paulo',
      'MX': 'America/Mexico_City',
      'AR': 'America/Argentina/Buenos_Aires'
      // Add more as needed
    };
    return countryTimezoneMap[countryCode.toUpperCase()] || 'Unknown';
  }

  private async analyzeWithWhatIsMyIpAddress(ip: string) {
    try {
      const ipInfoUrl = `https://whatismyipaddress.com/ip/${ip}`;
      const blacklistUrl = `https://whatismyipaddress.com/blacklist-check`;

      // Fetch IP info page
      const ipInfoResponse = await fetch(ipInfoUrl, { method: 'GET' });
      if (!ipInfoResponse.ok) throw new Error('Failed to fetch IP info page');
      const ipInfoHtml = await ipInfoResponse.text();

      // Fetch blacklist check page to get form and cookies
      const blacklistPageResponse = await fetch(blacklistUrl, { method: 'GET' });
      if (!blacklistPageResponse.ok) throw new Error('Failed to fetch blacklist check page');
      const blacklistPageHtml = await blacklistPageResponse.text();

      // Extract any necessary cookies or tokens from blacklistPageHtml if needed (not implemented here)

      // Submit IP via POST or GET form simulation (assuming POST with form data 'ip')
      const formData = new URLSearchParams();
      formData.append('ip', ip);

      const blacklistResponse = await fetch(blacklistUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          // Include cookies or tokens if required
        },
        body: formData.toString()
      });

      if (!blacklistResponse.ok) throw new Error('Failed to submit IP for blacklist check');
      const blacklistHtml = await blacklistResponse.text();

      // Parse IP info HTML to extract VPN server detection info
      const vpnDetected = /VPN Server: Yes/i.test(ipInfoHtml) || /VPN: Yes/i.test(ipInfoHtml);

      // Parse blacklist HTML to extract blacklist status by checking for cancel marks or "IP Listed"
      const blacklisted = /IP Listed: Bad IP Listed/i.test(blacklistHtml) || /cancel/i.test(blacklistHtml);

      return {
        publicIp: ip,
        vpnDetected,
        blacklisted
      };
    } catch (error) {
      console.error('WhatIsMyIpAddress analysis failed:', error);
      return {
        publicIp: ip,
        vpnDetected: false,
        blacklisted: false
      };
    }
  }

  private async runIpAnalysis() {
    try {
      // Try multiple free IP analysis services
      const services = [
        this.analyzeWithIpApi(),
        this.analyzeWithIpify(),
        this.analyzeWithIpGeolocation(),
        this.analyzeWithIpInfo()
      ];

      // Use Promise.allSettled to try all services
      const results = await Promise.allSettled(services);

      // Try to find the first result with a valid IP
      let firstIpResult: any = null;
      let foundValidIp = false;
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.publicIp && result.value.publicIp !== 'Unknown') {
          // Fallback timezone logic
          if (!('timezone' in result.value) || !result.value.timezone || result.value.timezone === 'Unknown') {
            const countryCode = result.value.country ? result.value.country.split(' ').pop() : '';
            if (countryCode) {
              (result.value as any).timezone = this.getTimezoneFromCountryCode(countryCode);
            }
          }
          // Enrich with WhatIsMyIpAddress data
          const whatIsMyIpData = await this.analyzeWithWhatIsMyIpAddress(result.value.publicIp);
          (result.value as any).vpnDetected = whatIsMyIpData.vpnDetected;
          (result.value as any).blacklisted = whatIsMyIpData.blacklisted;
          return result.value;
        }
        // Save the first result that has a publicIp, even if it's 'Unknown'
        if (result.status === 'fulfilled' && result.value.publicIp) {
          firstIpResult = result.value;
        }
      }

      // Always try the fallback if no valid IP was found
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        if (ipResponse.ok) {
          const ipData = await ipResponse.json();
          if (ipData.ip) {
            return {
              publicIp: ipData.ip,
              country: 'Unknown',
              city: 'Unknown',
              region: 'Unknown',
              hostname: 'Unknown',
              isp: 'Unknown',
              organization: 'Unknown',
              asn: null,
              asnOrg: 'Unknown',
              isDatacenter: false,
              isHosting: false,
              isTor: false,
              isProxy: false,
              riskScore: 0,
              latitude: null,
              longitude: null,
              timezone: 'Unknown',
              connectionType: 'Unknown',
              sharedConnection: 'Unknown',
              dynamicConnection: 'Unknown',
              securityScanner: 'No',
              trustedNetwork: 'Unknown',
              frequentAbuser: 'Unknown',
              highRiskAttacks: 'Unknown',
              vpnDetected: false,
              blacklisted: false
            };
          }
        }
      } catch (ipOnlyError) {
        // Ignore, fallback below
      }

      // If all services and fallback fail, return fallback
      return {
        publicIp: 'Unknown',
        country: 'Unknown',
        city: 'Unknown',
        region: 'Unknown',
        hostname: 'Unknown',
        isp: 'Unknown',
        organization: 'Unknown',
        asn: null,
        asnOrg: 'Unknown',
        isDatacenter: false,
        isHosting: false,
        isTor: false,
        isProxy: false,
        riskScore: 0,
        latitude: null,
        longitude: null,
        timezone: 'Unknown',
        connectionType: 'Unknown',
        sharedConnection: 'Unknown',
        dynamicConnection: 'Unknown',
        securityScanner: 'No',
        trustedNetwork: 'Unknown',
        frequentAbuser: 'Unknown',
        highRiskAttacks: 'Unknown',
        vpnDetected: false,
        blacklisted: false
      };
    } catch (error) {
      console.error('IP analysis failed:', error);
      return {
        publicIp: 'Unknown',
        country: 'Unknown',
        city: 'Unknown',
        region: 'Unknown',
        hostname: 'Unknown',
        isp: 'Unknown',
        organization: 'Unknown',
        asn: null,
        asnOrg: 'Unknown',
        isDatacenter: false,
        isHosting: false,
        isTor: false,
        isProxy: false,
        riskScore: 0,
        latitude: null,
        longitude: null,
        timezone: 'Unknown',
        connectionType: 'Unknown',
        sharedConnection: 'Unknown',
        dynamicConnection: 'Unknown',
        securityScanner: 'No',
        trustedNetwork: 'Unknown',
        frequentAbuser: 'Unknown',
        highRiskAttacks: 'Unknown',
        vpnDetected: false,
        blacklisted: false
      };
    }
  }

  private async analyzeWithIpInfo() {
    try {
      const token = ''; // Add your ipinfo.io token here if available
      const url = token ? `https://ipinfo.io/json?token=${token}` : 'https://ipinfo.io/json';
      const response = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(5000) });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      const [lat, lon] = data.loc ? data.loc.split(',').map(Number) : [null, null];
      const isDatacenter = this.isDatacenterProvider(data.org || '', data.org || '');
      const isHosting = this.isHostingProvider(data.org || '', data.org || '');
      const riskScore = this.calculateRiskScore(data, isDatacenter, isHosting);

      // Additional fallback for timezone if missing or unknown
      let timezone = data.timezone || 'Unknown';
      if (timezone === 'Unknown' && data.countryCode) {
        timezone = this.getTimezoneFromCountryCode(data.countryCode);
      }

      return {
        publicIp: data.ip || 'Unknown',
        country: data.country_name || data.country || 'Unknown',
        city: data.city || 'Unknown',
        region: data.region || 'Unknown',
        hostname: data.hostname || 'Unknown',
        isp: data.org || 'Unknown',
        organization: data.org || 'Unknown',
        asn: data.asn ? parseInt(data.asn.replace('AS', '')) : null,
        asnOrg: data.org || 'Unknown',
        isDatacenter,
        isHosting,
        isTor: false,
        isProxy: riskScore > 70,
        riskScore,
        latitude: lat,
        longitude: lon,
        timezone,
        connectionType: 'Unknown',
        sharedConnection: 'Unknown',
        dynamicConnection: 'Unknown',
        securityScanner: 'No',
        trustedNetwork: 'Unknown',
        frequentAbuser: 'Unknown',
        highRiskAttacks: 'Unknown',
        vpnDetected: false,
        blacklisted: false
      };
    } catch (error) {
      console.error('IpInfo service failed:', error);
      throw error;
    }
  }

  private calculateOverallResult(results: DetectionResults): DetectionResult {
    let confidenceScore = 0;
    const detectedTypes: string[] = [];
    const riskFactors: string[] = [];

    // Helper function to check if IP is private
    const isPrivateIp = (ip: string): boolean => {
      return /^10\./.test(ip) || /^192\.168\./.test(ip) || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip);
    };

    // Helper function to map timezone to continent
    const timezoneToContinent = (timezone: string): string | null => {
      if (!timezone) return null;
      if (timezone.startsWith('Africa')) return 'Africa';
      if (timezone.startsWith('America')) return 'North America';
      if (timezone.startsWith('Europe')) return 'Europe';
      if (timezone.startsWith('Asia')) return 'Asia';
      if (timezone.startsWith('Australia') || timezone.startsWith('Pacific')) return 'Oceania';
      return null;
    };

    // Helper function to map country code to continent
    const countryToContinent = (countryCode: string): string | null => {
      const mapping: Record<string, string> = {
        'US': 'North America',
        'CA': 'North America',
        'MX': 'North America',
        'BR': 'South America',
        'AR': 'South America',
        'GB': 'Europe',
        'FR': 'Europe',
        'DE': 'Europe',
        'NG': 'Africa',
        'ZA': 'Africa',
        'EG': 'Africa',
        'CN': 'Asia',
        'JP': 'Asia',
        'IN': 'Asia',
        'AU': 'Oceania',
        'NZ': 'Oceania'
        // Add more as needed
      };
      return mapping[countryCode.toUpperCase()] || null;
    };

    // IP Analysis scoring
    if (results.ipAnalysis) {
      if (results.ipAnalysis.isDatacenter) {
        confidenceScore += 30;
        detectedTypes.push('Datacenter IP');
        riskFactors.push('IP hosted in datacenter');
      }
      if (results.ipAnalysis.isHosting) {
        confidenceScore += 25;
        detectedTypes.push('Hosting Provider');
        riskFactors.push('Hosting provider IP');
      }
      if (results.ipAnalysis.isTor) {
        confidenceScore += 40;
        detectedTypes.push('Tor Exit Node');
        riskFactors.push('Tor network detected');
      }
      if (results.ipAnalysis.vpnDetected) {
        confidenceScore += 50;
        detectedTypes.push('VPN Server Detected');
        riskFactors.push('IP identified as VPN server by WhatIsMyIpAddress');
      }
      if (results.ipAnalysis.blacklisted) {
        confidenceScore += 30;
        detectedTypes.push('Blacklisted IP');
        riskFactors.push('IP listed on blacklist by WhatIsMyIpAddress');
      }
      confidenceScore += results.ipAnalysis.riskScore * 0.3;
    }

    // WebRTC Leak scoring - increased weight
    if (results.webrtcLeak?.hasLeak) {
      confidenceScore += 35;
      detectedTypes.push('WebRTC Leak');
      riskFactors.push('Local IP leak detected');

      // New logic: compare WebRTC local IP country with public IP country
      const localIp = results.webrtcLeak.localIps[0] || '';
      const publicIpCountry = results.ipAnalysis?.country || '';
      const localIpCountry = results.webrtcLeak.localIpCountry || '';

      // If local IP is private and countries differ, increase confidence and add detected type
      if (
        typeof localIp === 'string' &&
        isPrivateIp(localIp) &&
        localIpCountry &&
        publicIpCountry &&
        localIpCountry !== publicIpCountry
      ) {
        confidenceScore += 40;
        detectedTypes.push('WebRTC Local IP Country Mismatch');
        riskFactors.push('Mismatch between WebRTC local IP country and public IP country');
      }
    }

    // Browser Fingerprint scoring
    if (results.fingerprint) {
      // Check for timezone mismatch between fingerprint and IP location
      const fingerprintTimezone = results.fingerprint.timezone;
      let ipTimezone = results.ipAnalysis?.timezone;

      // If IP timezone is unknown, fallback to timezone from IP country
      if ((!ipTimezone || ipTimezone === 'Unknown') && results.ipAnalysis?.country) {
        const countryCode = results.ipAnalysis.country.split(' ').pop() || '';
        ipTimezone = this.getTimezoneFromCountryCode(countryCode);
      }

      let timezoneMismatch = false;
      if (
        fingerprintTimezone &&
        ipTimezone &&
        fingerprintTimezone !== ipTimezone &&
        ipTimezone !== 'Unknown' &&
        fingerprintTimezone !== 'Unknown'
      ) {
        timezoneMismatch = true;
        confidenceScore += 20;
        detectedTypes.push('Fingerprint Timezone Mismatch');
        riskFactors.push('Mismatch between browser fingerprint timezone and IP location timezone');
      }

      // Check for continent mismatch between fingerprint and IP location
      const fingerprintContinent = timezoneToContinent(fingerprintTimezone);
      const ipCountryCode = results.ipAnalysis?.country?.split(' ').pop() || '';
      const ipContinent = countryToContinent(ipCountryCode);

      if (
        fingerprintContinent &&
        ipContinent &&
        fingerprintContinent !== ipContinent &&
        ipContinent !== null &&
        fingerprintContinent !== null
      ) {
        confidenceScore += 20;
        detectedTypes.push('Fingerprint Continent Mismatch');
        riskFactors.push('Mismatch between browser fingerprint continent and IP location continent');
      }

      confidenceScore += results.fingerprint.suspicionScore * 0.4;
      if (results.fingerprint.suspicionScore > 70) {
        detectedTypes.push('Suspicious Fingerprint');
        riskFactors.push('Abnormal browser fingerprint');
      }
    }

    // Location Mismatch scoring - increased weight
    if (
      results.locationMismatch &&
      results.locationMismatch.hasMismatch === true
    ) {
      confidenceScore += 40;
      detectedTypes.push('Location Mismatch');
      riskFactors.push((results.locationMismatch as any).message || 'Location mismatch detected');
    }
    // Optionally, you can log or display the message and distance for 'good' and 'fair' matches

    // Bot Detection scoring
    if (results.botDetection?.isBot) {
      confidenceScore += 35;
      detectedTypes.push('Bot/Automation');
      riskFactors.push('Automated browser detected');
    }

    // Cap confidence score at 100
    confidenceScore = Math.min(100, Math.round(confidenceScore));

    // Force VPN detection if critical flags are true
    const fingerprintMismatch = (() => {
      if (!results.fingerprint || !results.ipAnalysis) return false;

      const fingerprintTimezone = results.fingerprint.timezone;
      const ipTimezone = results.ipAnalysis.timezone;
      const fingerprintContinent = timezoneToContinent(fingerprintTimezone);
      const ipCountryCode = results.ipAnalysis.country?.split(' ').pop() || '';
      const ipContinent = countryToContinent(ipCountryCode);

      if (fingerprintTimezone && ipTimezone && fingerprintTimezone !== ipTimezone) {
        return true;
      }

      if (fingerprintContinent && ipContinent && fingerprintContinent !== ipContinent) {
        return true;
      }

      return false;
    })();

    const criticalFlags = [
      results.webrtcLeak?.hasLeak,
      results.locationMismatch?.hasMismatch,
      results.botDetection?.isBot,
      fingerprintMismatch
    ];

    const isVpnDetected = confidenceScore >= 50;

    console.log('Critical Flags:', {
      webrtcLeak: results.webrtcLeak?.hasLeak,
      locationMismatch: results.locationMismatch?.hasMismatch,
      botDetection: results.botDetection?.isBot,
      fingerprintMismatch
    });

    return {
      isVpnDetected,
      confidenceScore,
      detectedTypes,
      riskFactors,
      results,
      timestamp: new Date().toISOString()
    };
  }

  private async analyzeWithIpApi() {
    try {
      const response = await fetch('https://ip-api.com/json/?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query,proxy,hosting', {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.status === 'fail') {
        throw new Error(data.message || 'API request failed');
      }

      const isDatacenter = this.isDatacenterProvider(data.isp, data.org) || data.hosting;
      const isHosting = this.isHostingProvider(data.isp, data.org) || data.hosting;
      const riskScore = this.calculateRiskScore(data, isDatacenter, isHosting);

      return {
        publicIp: data.query || 'Unknown',
        country: data.country && data.countryCode ? `${data.country} ${data.countryCode}` : 'Unknown',
        city: data.city || 'Unknown',
        region: data.regionName || 'Unknown',
        hostname: data.query || 'Unknown',
        isp: data.isp || 'Unknown',
        organization: data.org || 'Unknown',
        asn: data.as ? parseInt(data.as.split(' ')[0].replace('AS', '')) : null,
        asnOrg: data.org || 'Unknown',
        isDatacenter,
        isHosting,
        isTor: false,
        isProxy: data.proxy || riskScore > 70,
        riskScore,
        latitude: data.lat || null,
        longitude: data.lon || null,
        timezone: data.timezone || 'Unknown',
        connectionType: this.getConnectionType(data),
        sharedConnection: this.getSharedConnection(data),
        dynamicConnection: this.getDynamicConnection(data),
        securityScanner: this.getSecurityScanner(data),
        trustedNetwork: this.getTrustedNetwork(data),
        frequentAbuser: 'Upgrade your plan for better data and blocklists.',
        highRiskAttacks: 'Upgrade your plan for better data and blocklists.'
      };
    } catch (error) {
      console.error('IP-API service failed:', error);
      throw error;
    }
  }

  private async analyzeWithIpify() {
    try {
      const ipResponse = await fetch('https://api.ipify.org?format=json', {
        signal: AbortSignal.timeout(3000)
      });
      
      if (!ipResponse.ok) {
        throw new Error('Failed to get IP');
      }
      
      const ipData = await ipResponse.json();
      
      // Get additional info from ipapi.co
      const geoResponse = await fetch(`https://ipapi.co/${ipData.ip}/json/`, {
        signal: AbortSignal.timeout(5000)
      });
      
      if (!geoResponse.ok) {
        throw new Error('Failed to get geo data');
      }
      
      const geoData = await geoResponse.json();
      
      const isDatacenter = this.isDatacenterProvider(geoData.org, geoData.org);
      const isHosting = this.isHostingProvider(geoData.org, geoData.org);
      const riskScore = this.calculateRiskScore(geoData, isDatacenter, isHosting);

      // Additional fallback for timezone if missing or unknown
      let timezone = geoData.time_zone?.name || geoData.time_zone || 'Unknown';
      if (timezone === 'Unknown' && geoData.country_code2) {
        timezone = this.getTimezoneFromCountryCode(geoData.country_code2);
      }

      return {
        publicIp: ipData.ip,
        country: geoData.country_name,
        city: geoData.city,
        isp: geoData.org,
        asn: geoData.asn ? parseInt(geoData.asn.replace('AS', '')) : null,
        asnOrg: geoData.org,
        isDatacenter,
        isHosting,
        isTor: false,
        isProxy: riskScore > 70,
        riskScore,
        latitude: geoData.latitude,
        longitude: geoData.longitude,
        timezone
      };
    } catch (error) {
      console.error('Ipify service failed:', error);
      throw error;
    }
  }

  private async analyzeWithIpGeolocation() {
    try {
      const response = await fetch('https://api.ipgeolocation.io/ipgeo?apiKey=free', {
        signal: AbortSignal.timeout(5000)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      const isDatacenter = this.isDatacenterProvider(data.isp, data.organization);
      const isHosting = this.isHostingProvider(data.isp, data.organization);
      const riskScore = this.calculateRiskScore(data, isDatacenter, isHosting);

      let timezone = data.time_zone?.name || data.time_zone || 'Unknown';
      if (timezone === 'Unknown' && data.country_code2) {
        timezone = this.getTimezoneFromCountryCode(data.country_code2);
      }

      return {
        publicIp: data.ip,
        country: data.country_name,
        city: data.city,
        isp: data.isp,
        asn: data.asn ? parseInt(data.asn.replace('AS', '')) : null,
        asnOrg: data.organization,
        isDatacenter,
        isHosting,
        isTor: false,
        isProxy: riskScore > 70,
        riskScore,
        latitude: parseFloat(data.latitude),
        longitude: parseFloat(data.longitude),
        timezone
      };
    } catch (error) {
      console.error('IPGeolocation service failed:', error);
      throw error;
    }
  }

  private isDatacenterProvider(isp: string, org: string): boolean {
    const datacenterKeywords = [
      'amazon', 'aws', 'google', 'microsoft', 'azure', 'digitalocean', 'linode',
      'vultr', 'ovh', 'hetzner', 'cloudflare', 'fastly', 'rackspace', 'softlayer',
      'datacenter', 'hosting', 'server', 'cloud', 'vps', 'dedicated'
    ];
    
    const combined = `${isp} ${org}`.toLowerCase();
    return datacenterKeywords.some(keyword => combined.includes(keyword));
  }

  private isHostingProvider(isp: string, org: string): boolean {
    const hostingKeywords = [
      'hosting', 'host', 'server', 'datacenter', 'data center', 'colocation',
      'colo', 'dedicated', 'vps', 'virtual private', 'managed'
    ];
    
    const combined = `${isp} ${org}`.toLowerCase();
    return hostingKeywords.some(keyword => combined.includes(keyword));
  }

  private calculateRiskScore(data: unknown, isDatacenter: boolean, isHosting: boolean): number {
    let score = 0;
    
    if (isDatacenter) score += 40;
    if (isHosting) score += 30;
    
    // Add more risk factors based on available data
    const dataObj = data as Record<string, unknown>;
    
    // Check for suspicious ASN patterns
    if (dataObj.asn && typeof dataObj.asn === 'string') {
      const asnNumber = parseInt(dataObj.asn.replace('AS', ''));
      // Some ASNs are commonly associated with VPS/hosting
      const suspiciousAsns = [16509, 14061, 16276, 13335]; // AWS, DigitalOcean, OVH, Cloudflare
      if (suspiciousAsns.includes(asnNumber)) {
        score += 20;
      }
    }
    
    return Math.min(100, score);
  }

  private getConnectionType(data: Record<string, unknown>): string {
    // Analyze connection type based on ISP and organization
    const isp = (data.isp as string)?.toLowerCase() || '';
    const org = (data.org as string)?.toLowerCase() || '';
    
    if (isp.includes('mobile') || org.includes('mobile')) return 'Mobile';
    if (isp.includes('fiber') || org.includes('fiber')) return 'Fiber';
    if (isp.includes('cable') || org.includes('cable')) return 'Cable';
    if (isp.includes('dsl') || org.includes('dsl')) return 'DSL';
    if (isp.includes('satellite') || org.includes('satellite')) return 'Satellite';
    
    return 'Unknown';
  }

  private getSharedConnection(data: Record<string, unknown>): string {
    // Determine if connection is shared based on ISP type
    const isp = (data.isp as string)?.toLowerCase() || '';
    const org = (data.org as string)?.toLowerCase() || '';
    
    if (isp.includes('university') || isp.includes('school') || org.includes('university')) return 'Yes';
    if (isp.includes('corporate') || isp.includes('business') || org.includes('corporate')) return 'Likely';
    if (isp.includes('residential') || isp.includes('home')) return 'No';
    
    return 'Unknown';
  }

  private getDynamicConnection(data: Record<string, unknown>): string {
    // Most residential connections are dynamic
    const isp = (data.isp as string)?.toLowerCase() || '';
    
    if (isp.includes('residential') || isp.includes('home') || isp.includes('broadband')) return 'Yes';
    if (isp.includes('business') || isp.includes('corporate') || isp.includes('dedicated')) return 'No';
    
    return 'Likely';
  }

  private getSecurityScanner(data: Record<string, unknown>): string {
    // Check for security scanning indicators
    const org = (data.org as string)?.toLowerCase() || '';
    const isp = (data.isp as string)?.toLowerCase() || '';
    
    if (org.includes('security') || org.includes('scanner') || isp.includes('security')) return 'Detected';
    if (org.includes('research') || org.includes('university')) return 'Possible';
    
    return 'No';
  }

  private getTrustedNetwork(data: Record<string, unknown>): string {
    // Determine if network is trusted
    const org = (data.org as string)?.toLowerCase() || '';
    const isp = (data.isp as string)?.toLowerCase() || '';
    
    if (org.includes('government') || org.includes('military') || org.includes('bank')) return 'Yes';
    if (org.includes('university') || org.includes('hospital') || org.includes('school')) return 'Yes';
    if (isp.includes('government') || isp.includes('military')) return 'Yes';
    
    return 'Unknown';
  }

  private async runBotDetection() {
    const checks = await Promise.all([
      this.checkHeadlessBrowser(),
      this.checkAutomationFramework(),
      this.checkWebDriverPresence(),
      this.checkPhantomJS(),
      this.checkSelenium()
    ]);

    const botScore = checks.filter(Boolean).length * 20;
    
    return {
      isBot: botScore >= 60,
      headlessDetected: checks[0],
      automationDetected: checks[1] || checks[2] || checks[3] || checks[4],
      botScore,
      detectedFrameworks: this.getDetectedFrameworks(checks)
    };
  }

  private async checkHeadlessBrowser(): Promise<boolean> {
    // Check for headless browser indicators
    const checks = [
      () => navigator.webdriver === true,
      () => !navigator.plugins || navigator.plugins.length === 0,
      () => !navigator.languages || navigator.languages.length === 0,
      () => navigator.userAgent.includes('HeadlessChrome'),
      () => window.outerHeight === 0,
      () => window.outerWidth === 0,
      () => !(window as any).chrome?.runtime,
      () => typeof navigator.permissions?.query !== 'function'
    ];

    return checks.filter(check => {
      try {
        return check();
      } catch {
        return false;
      }
    }).length >= 3;
  }

  private async checkAutomationFramework(): Promise<boolean> {
    const windowChecks = [
      'phantom',
      'callPhantom',
      '__nightmare',
      '_selenium',
      'webdriver',
      '__webdriver_script_fn',
      '__driver_evaluate',
      '__webdriver_evaluate',
      '__selenium_evaluate',
      '__fxdriver_evaluate',
      '__driver_unwrapped',
      '__webdriver_unwrapped',
      '__selenium_unwrapped',
      '__fxdriver_unwrapped'
    ];

    return windowChecks.some(prop => (window as unknown as Record<string, unknown>)[prop] !== undefined);
  }

  private async checkWebDriverPresence(): Promise<boolean> {
    return navigator.webdriver === true || 
           (window as unknown as Record<string, unknown>).webdriver === true ||
           (window as unknown as Record<string, unknown>).__webdriver_script_fn !== undefined;
  }

  private async checkPhantomJS(): Promise<boolean> {
    return (window as unknown as Record<string, unknown>).callPhantom !== undefined ||
           (window as unknown as Record<string, unknown>)._phantom !== undefined ||
           navigator.userAgent.includes('PhantomJS');
  }

  private async checkSelenium(): Promise<boolean> {
    return (window as unknown as Record<string, unknown>).__selenium_evaluate !== undefined ||
           document.documentElement.getAttribute('selenium') !== null ||
           document.documentElement.getAttribute('webdriver') !== null;
  }

  private getDetectedFrameworks(checks: boolean[]): string[] {
    const frameworks = ['Headless', 'Automation', 'WebDriver', 'PhantomJS', 'Selenium'];
    return frameworks.filter((_, index) => checks[index]);
  }


  private async logDetection(result: DetectionResult, duration: number): Promise<void> {
    try {
      await apiClient.logDetection({
        ...result,
        duration,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to log detection:', error);
    }
  }
}
