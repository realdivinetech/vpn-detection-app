import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Shield, AlertTriangle, Info, MapPin, Fingerprint, Network, Bot } from 'lucide-react';
import { DetectionResult as IDetectionResult } from '@/types/detection';

interface DetectionResultProps {
  result: IDetectionResult;
}

export default function DetectionResult({ result }: DetectionResultProps) {
  const getThreatLevel = () => {
    if (result.confidenceScore >= 80) return { level: 'High', color: 'text-red-600', bg: 'bg-red-50' };
    if (result.confidenceScore >= 50) return { level: 'Medium', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    return { level: 'Low', color: 'text-green-600', bg: 'bg-green-50' };
  };

  const threat = getThreatLevel();

  return (
    <div className="space-y-6">
      {/* Overall Result */}
      <Card className={`border-2 ${result.isVpnDetected ? 'border-red-200' : 'border-green-200'}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {result.isVpnDetected ? (
              <AlertTriangle className="w-5 h-5 text-red-500" />
            ) : (
              <Shield className="w-5 h-5 text-green-500" />
            )}
            Detection Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">Overall Status:</span>
            <Badge className={result.isVpnDetected ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
              {result.isVpnDetected ? 'VPN/Proxy Detected' : 'Clean Connection'}
            </Badge>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">Confidence Score:</span>
              <span className={`font-bold ${threat.color}`}>{result.confidenceScore}%</span>
            </div>
            <Progress value={result.confidenceScore} className="w-full" />
          </div>

          <div className="flex items-center justify-between">
            <span className="font-medium">Threat Level:</span>
            <Badge className={`${threat.bg} ${threat.color} border-0`}>
              {threat.level}
            </Badge>
          </div>

          {result.detectedTypes.length > 0 && (
            <div className="space-y-2">
              <span className="font-medium">Detected Types:</span>
              <div className="flex flex-wrap gap-2">
                {result.detectedTypes.map((type, index) => (
                  <Badge key={index} variant="outline">{type}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Results */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* IP Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="w-4 h-4" />
              IP Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-1 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Public IP:</span>
                <span className="font-medium">{result.results.ipAnalysis?.publicIp || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Country:</span>
                <span className="font-medium">{result.results.ipAnalysis?.country || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">City:</span>
                <span className="font-medium">{result.results.ipAnalysis?.city || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Region:</span>
                <span className="font-medium">{result.results.ipAnalysis?.region || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Hostname:</span>
                <span className="font-medium">{result.results.ipAnalysis?.hostname || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ISP:</span>
                <span className="font-medium">{result.results.ipAnalysis?.isp || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Organization:</span>
                <span className="font-medium">{result.results.ipAnalysis?.organization || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ASN:</span>
                <span className="font-medium">{result.results.ipAnalysis?.asn || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Time Zone:</span>
                <span className="font-medium">{result.results.ipAnalysis?.timezone || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Latitude:</span>
                <span className="font-medium">{result.results.ipAnalysis?.latitude || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Longitude:</span>
                <span className="font-medium">{result.results.ipAnalysis?.longitude || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Risk Score:</span>
                <span className="font-medium">{result.results.ipAnalysis?.riskScore || 0}/100</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Is Datacenter:</span>
                <Badge variant={result.results.ipAnalysis?.isDatacenter ? "destructive" : "secondary"} className="text-xs">
                  {result.results.ipAnalysis?.isDatacenter ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Connection Type:</span>
                <span className="font-medium">{result.results.ipAnalysis?.connectionType || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shared Connection:</span>
                <span className="font-medium">{result.results.ipAnalysis?.sharedConnection || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dynamic Connection:</span>
                <span className="font-medium">{result.results.ipAnalysis?.dynamicConnection || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Security Scanner:</span>
                <span className="font-medium">{result.results.ipAnalysis?.securityScanner || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Trusted Network:</span>
                <span className="font-medium">{result.results.ipAnalysis?.trustedNetwork || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-muted-foreground">Frequent Abuser:</span>
                <span className="font-medium text-right text-xs max-w-[50%]">{result.results.ipAnalysis?.frequentAbuser || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-muted-foreground">High Risk Attacks:</span>
                <span className="font-medium text-right text-xs max-w-[50%]">{result.results.ipAnalysis?.highRiskAttacks || 'N/A'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* WebRTC Leak */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="w-4 h-4" />
              WebRTC Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Local IPs Found:</span>
              <span className="text-sm">{result.results.webrtcLeak?.localIps?.length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Leak Detected:</span>
              <Badge variant={result.results.webrtcLeak?.hasLeak ? 'destructive' : 'secondary'}>
                {result.results.webrtcLeak?.hasLeak ? 'Yes' : 'No'}
              </Badge>
            </div>
            {result.results.webrtcLeak?.localIps && result.results.webrtcLeak.localIps.length > 0 && (
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">Local IPs:</span>
                {result.results.webrtcLeak.localIps.slice(0, 3).map((ip, index) => (
                  <div key={index} className="text-xs font-mono bg-slate-50 p-1 rounded">{ip}</div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Browser Fingerprint */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Fingerprint className="w-4 h-4" />
              Browser Fingerprint
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">User Agent:</span>
              <Badge variant="outline">Analyzed</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Canvas Hash:</span>
              <span className="text-xs font-mono">{result.results.fingerprint?.canvasHash?.substring(0, 12) || 'N/A'}...</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Timezone:</span>
              <span className="text-sm">{result.results.fingerprint?.timezone || 'Unknown'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Plugins:</span>
              <span className="text-sm">{result.results.fingerprint?.plugins?.length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Suspicion Score:</span>
              <span className="text-sm font-medium">{result.results.fingerprint?.suspicionScore || 0}/100</span>
            </div>
          </CardContent>
        </Card>

        {/* Location Mismatch */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Location Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">GPS Available:</span>
              <Badge variant={result.results.locationMismatch?.gpsAvailable ? 'secondary' : 'outline'}>
                {result.results.locationMismatch?.gpsAvailable ? 'Yes' : 'No'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Location Match:</span>
              <Badge variant={result.results.locationMismatch?.hasMismatch ? 'destructive' : 'secondary'}>
                {result.results.locationMismatch?.hasMismatch ? 'Mismatch' : 'Match'}
              </Badge>
            </div>
            {result.results.locationMismatch?.distance && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Distance:</span>
                <span className="text-sm">{Math.round(result.results.locationMismatch.distance)} km</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bot Detection Results */}
      {result.results.botDetection && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="w-4 h-4" />
              Bot Detection Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-muted-foreground">
                  {result.results.botDetection.isBot ? '🤖' : '👤'}
                </div>
                <div className="text-sm text-muted-foreground">
                  {result.results.botDetection.isBot ? 'Bot Detected' : 'Human'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">
                  {result.results.botDetection.headlessDetected ? 'Yes' : 'No'}
                </div>
                <div className="text-sm text-muted-foreground">Headless</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">
                  {result.results.botDetection.automationDetected ? 'Yes' : 'No'}
                </div>
                <div className="text-sm text-muted-foreground">Automation</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">
                  {result.results.botDetection.botScore}%
                </div>
                <div className="text-sm text-muted-foreground">Bot Score</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {result.isVpnDetected && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <Info className="w-4 h-4" />
              Security Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="text-orange-700">
            <ul className="space-y-1 text-sm">
              <li>• Consider implementing additional verification steps</li>
              <li>• Log this connection attempt for security monitoring</li>
              <li>• Review user behavior patterns before allowing access</li>
              <li>• Consider rate limiting from this IP address</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}