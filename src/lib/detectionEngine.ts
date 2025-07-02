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
        this.webrtcLeak.detectLeak(),
        this.fingerprinting.generateFingerprint(),
        this.locationMismatch.checkLocationMismatch(),
        this.runBotDetection()
      ]);

      const results: DetectionResults = {
        ipAnalysis,
        webrtcLeak: webrtcResult,
        fingerprint: fingerprintResult,
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

  private async runIpAnalysis() {
    try {
      // Try multiple free IP analysis services
      const services = [
        this.analyzeWithIpApi(),
        this.analyzeWithIpify(),
        this.analyzeWithIpGeolocation()
      ];

      // Use Promise.allSettled to try all services
      const results = await Promise.allSettled(services);
      
      // Find the first successful result
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.publicIp !== 'Unknown') {
          return result.value;
        }
      }

      // If all services fail, return fallback
      return {
        publicIp: 'Unknown',
        country: 'Unknown',
        isp: 'Unknown',
        isDatacenter: false,
        riskScore: 0,
        asn: null,
        isHosting: false,
        isTor: false
      };
    } catch (error) {
      console.error('IP analysis failed:', error);
      return {
        publicIp: 'Unknown',
        country: 'Unknown',
        isp: 'Unknown',
        isDatacenter: false,
        riskScore: 0,
        asn: null,
        isHosting: false,
        isTor: false
      };
    }
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
        longitude: geoData.longitude
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
        longitude: parseFloat(data.longitude)
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
      () => !window.chrome?.runtime,
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

  private calculateOverallResult(results: DetectionResults): DetectionResult {
    let confidenceScore = 0;
    const detectedTypes: string[] = [];
    const riskFactors: string[] = [];

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
      confidenceScore += results.ipAnalysis.riskScore * 0.3;
    }

    // WebRTC Leak scoring
    if (results.webrtcLeak?.hasLeak) {
      confidenceScore += 20;
      detectedTypes.push('WebRTC Leak');
      riskFactors.push('Local IP leak detected');
    }

    // Browser Fingerprint scoring
    if (results.fingerprint) {
      confidenceScore += results.fingerprint.suspicionScore * 0.4;
      if (results.fingerprint.suspicionScore > 70) {
        detectedTypes.push('Suspicious Fingerprint');
        riskFactors.push('Abnormal browser fingerprint');
      }
    }

    // Location Mismatch scoring
    if (results.locationMismatch?.hasMismatch) {
      confidenceScore += 25;
      detectedTypes.push('Location Mismatch');
      riskFactors.push('GPS and IP location mismatch');
    }

    // Bot Detection scoring
    if (results.botDetection?.isBot) {
      confidenceScore += 35;
      detectedTypes.push('Bot/Automation');
      riskFactors.push('Automated browser detected');
    }

    // Cap confidence score at 100
    confidenceScore = Math.min(100, Math.round(confidenceScore));

    return {
      isVpnDetected: confidenceScore >= 50,
      confidenceScore,
      detectedTypes,
      riskFactors,
      results,
      timestamp: new Date().toISOString()
    };
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