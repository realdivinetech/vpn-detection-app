const hostingIps = require('../data/hosting-ips.json');
const asnData = require('../data/asn-data.json');

class IpClassifier {
  constructor() {
    this.hostingRanges = this.loadHostingRanges();
    this.knownDatacenters = this.loadDatacenterASNs();
    this.torExitNodes = new Set(); // Will be populated from external source if needed
  }

  async classifyIp(ip) {
    try {
      const analysis = {
        isDatacenter: false,
        isHosting: false,
        isTor: false,
        isProxy: false,
        isResidential: false,
        isMobile: false,
        riskLevel: 'low',
        provider: null,
        asn: null
      };

      // Check if IP is in hosting ranges
      analysis.isHosting = this.isHostingIp(ip);
      
      // Check if IP belongs to datacenter ASN
      analysis.isDatacenter = await this.isDatacenterIp(ip);
      
      // Check for known proxy/VPN providers
      analysis.isProxy = this.isKnownProxy(ip);
      
      // Check Tor exit nodes
      analysis.isTor = await this.isTorExitNode(ip);
      
      // Determine if residential
      analysis.isResidential = !analysis.isDatacenter && !analysis.isHosting && !analysis.isProxy;
      
      // Calculate risk level
      analysis.riskLevel = this.calculateRiskLevel(analysis);
      
      return analysis;
    } catch (error) {
      console.error('IP classification error:', error);
      return {
        isDatacenter: false,
        isHosting: false,
        isTor: false,
        isProxy: false,
        isResidential: true,
        isMobile: false,
        riskLevel: 'unknown',
        provider: null,
        asn: null
      };
    }
  }

  isHostingIp(ip) {
    const ipNum = this.ipToNumber(ip);
    
    for (const range of this.hostingRanges) {
      if (ipNum >= range.start && ipNum <= range.end) {
        return true;
      }
    }
    
    return false;
  }

  async isDatacenterIp(ip) {
    // Check against known datacenter providers
    const datacenterKeywords = [
      'amazon', 'aws', 'ec2', 'google', 'gcp', 'microsoft', 'azure',
      'digitalocean', 'linode', 'vultr', 'ovh', 'hetzner', 'scaleway',
      'cloudflare', 'datacamp', 'serverspace', 'rackspace'
    ];
    
    // This is a simplified check - in production you'd want to use ASN data
    return this.hostingRanges.some(range => {
      const provider = range.provider?.toLowerCase() || '';
      return datacenterKeywords.some(keyword => provider.includes(keyword));
    });
  }

  isKnownProxy(ip) {
    // Known VPN/Proxy provider IP ranges
    const proxyProviders = [
      'nordvpn', 'expressvpn', 'surfshark', 'cyberghost', 'purevpn',
      'hotspotshield', 'tunnelbear', 'windscribe', 'protonvpn', 'ipvanish'
    ];
    
    return this.hostingRanges.some(range => {
      const provider = range.provider?.toLowerCase() || '';
      return proxyProviders.some(vpn => provider.includes(vpn));
    });
  }

  async isTorExitNode(ip) {
    try {
      // Check against Tor Project's exit list API
      const response = await fetch(`https://check.torproject.org/torbulkexitlist`);
      if (!response.ok) {
        console.warn('Failed to fetch Tor exit node list');
        return false;
      }
      const text = await response.text();
      const exitNodes = new Set(text.split('\n').map(line => line.trim()).filter(line => line.length > 0));
      return exitNodes.has(ip);
    } catch (error) {
      console.error('Error checking Tor exit node:', error);
      return false;
    }
  }

  calculateRiskLevel(analysis) {
    let riskScore = 0;
    
    if (analysis.isTor) riskScore += 4;
    if (analysis.isProxy) riskScore += 3;
    if (analysis.isDatacenter) riskScore += 2;
    if (analysis.isHosting) riskScore += 1;
    
    if (riskScore >= 4) return 'critical';
    if (riskScore >= 3) return 'high';
    if (riskScore >= 2) return 'medium';
    if (riskScore >= 1) return 'low';
    return 'minimal';
  }

  loadHostingRanges() {
    try {
      return hostingIps.ranges.map(range => ({
        start: this.ipToNumber(range.start),
        end: this.ipToNumber(range.end),
        provider: range.provider,
        type: range.type
      }));
    } catch (error) {
      console.warn('Failed to load hosting IP ranges:', error);
      return [];
    }
  }

  loadDatacenterASNs() {
    try {
      return new Set(asnData.datacenters.map(asn => asn.number));
    } catch (error) {
      console.warn('Failed to load datacenter ASNs:', error);
      return new Set();
    }
  }

  ipToNumber(ip) {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
  }

  numberToIp(num) {
    return [
      (num >>> 24) & 255,
      (num >>> 16) & 255,
      (num >>> 8) & 255,
      num & 255
    ].join('.');
  }
}

module.exports = new IpClassifier();