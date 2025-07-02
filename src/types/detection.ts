export interface DetectionResult {
  isVpnDetected: boolean;
  confidenceScore: number;
  detectedTypes: string[];
  riskFactors: string[];
  results: DetectionResults;
  timestamp: string;
}

export interface DetectionResults {
  ipAnalysis?: IpAnalysisResult;
  webrtcLeak?: WebRTCLeakResult;
  fingerprint?: FingerprintResult;
  locationMismatch?: LocationMismatchResult;
  botDetection?: BotDetectionResult;
}

export interface IpAnalysisResult {
  publicIp: string;
  country: string;
  city?: string;
  region?: string;
  hostname?: string;
  isp: string;
  organization?: string;
  asn?: number;
  asnOrg?: string;
  isDatacenter: boolean;
  isHosting: boolean;
  isTor: boolean;
  isProxy: boolean;
  riskScore: number;
  threat?: string;
  longitude?: number;
  latitude?: number;
  timezone?: string;
  connectionType?: string;
  sharedConnection?: string;
  dynamicConnection?: string;
  securityScanner?: string;
  trustedNetwork?: string;
  frequentAbuser?: string;
  highRiskAttacks?: string;
}

export interface WebRTCLeakResult {
  hasLeak: boolean;
  localIps: string[];
  publicIp?: string;
  stunServersUsed: string[];
}

export interface FingerprintResult {
  userAgent: string;
  language: string;
  languages: string[];
  platform: string;
  cookieEnabled: boolean;
  doNotTrack: string | null;
  hardwareConcurrency: number;
  maxTouchPoints: number;
  screenResolution: string;
  screenColorDepth: number;
  pixelDepth: number;
  availableScreenResolution: string;
  timezone: string;
  timezoneOffset: number;
  plugins: string[];
  canvasHash: string;
  webglHash: string;
  audioHash: string;
  fontList: string[];
  hasLocalStorage: boolean;
  hasSessionStorage: boolean;
  hasIndexedDB: boolean;
  hasWebSQL: boolean;
  deviceMemory?: number;
  connection?: {
    effectiveType: string;
    downlink: number;
    rtt: number;
  };
  suspicionScore: number;
}

export interface LocationMismatchResult {
  hasMismatch: boolean;
  gpsAvailable: boolean;
  gpsLocation?: {
    lat: number;
    lng: number;
    accuracy: number;
  };
  ipLocation?: {
    lat: number;
    lng: number;
    country: string;
    city: string;
  };
  distance?: number;
  error?: string;
}

export interface BotDetectionResult {
  isBot: boolean;
  headlessDetected: boolean;
  automationDetected: boolean;
  botScore: number;
  detectedFrameworks: string[];
}

export interface DetectionLog {
  id: string;
  timestamp: string;
  ip: string;
  userAgent: string;
  isVpnDetected: boolean;
  confidenceScore: number;
  detectedTypes: string[];
  country: string;
  city?: string;
  isp: string;
  duration: number;
  results: DetectionResults;
}

export interface SystemStats {
  totalScans: number;
  vpnDetected: number;
  cleanConnections: number;
  averageConfidence: number;
  topCountries: Array<{ country: string; count: number }>;
  topIsps: Array<{ isp: string; count: number }>;
  recentActivity: Array<{
    date: string;
    scans: number;
    vpnDetected: number;
  }>;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}